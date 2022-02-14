/** @format */

import Axios from 'axios'
import {
  uuid,
  throttleInTimes,
  randomHex,
  fixFileName4Windows,
  formatProgress,
  calcDownloadMaxConcurrency,
} from '../utils/LoadUtil'
import {BaseLoader} from './BaseLoader'
import {isNetworkError} from '../utils/HttpUtil'
import {calc_downloaded} from '../utils/ChunkUtil'
import {formatSize} from '../utils/Formatter'
import {getFreeDiskSize} from '../utils/FileUtil'

import {formatCheckpoint, initCheckpoint} from '../utils/CheckpointUtil'
const INIT_MAX_CON = 10 // 初始并发
const MAX_CHUNK_SIZE = 100 * 1024 * 1024 // 100MB
const SUFFIX = '.download'
const LIMIT_PART_NUM = 9000 // 最多分片数量
const PROCESS_CALC_CRC64_SIZE = 50 * 1024 * 1024 // 文件大小超过将启用子进程计算 crc64

import Debug from 'debug'
const debug = Debug('PDSJS:BaseUploader')

console.timeLog = console.timeLog || console.timeEnd

export class Downloader extends BaseLoader {
  constructor(checkpoint, configs = {}, vendors = {}, context = {}) {
    super()

    // 避免警告： possible EventEmitter memory leak detected
    // if (this.setMaxListeners) this.setMaxListeners(100)

    this.vendors = vendors
    this.context = context

    const {
      id,

      // from
      path_type,
      loc_id,
      loc_type,
      file_key,

      drive_id,
      share_id,
      file_id,
      file_path,

      // to
      file,

      download_id,
      download_url,
      content_md5,
      crc64ecma,
      part_info_list,

      // progress
      progress,
      speed,
      loaded,
      state,
      message,

      // time
      start_time,
      end_time,

      // 均速计算
      used_avg_speed,
      used_time_len,

      content_type,
      thumbnail,
      remote_updated_at,
    } = initCheckpoint(checkpoint)

    const {
      verbose,

      checking_crc,

      // 最大分片数：10000片
      limit_part_num,

      // 调优
      max_chunk_size,
      init_chunk_con,
      chunk_con_auto,

      custom_crc64_fun, //自定义 计算crc64的方法

      process_calc_crc64_size, // 文件大小超过多少，将启用子进程计算 crc64

      progress_changed,
      state_changed,
      part_completed,
      set_calc_max_con,
    } = configs

    // 初始化
    this.id = id || `id-${uuid().replace(/-/g, '')}`
    // this.created_at = Date.now();

    // to
    this.file = file // {name,size,path,type,temp_path?}

    if (this.context.platform == 'win32') {
      this.file.path = fixFileName4Windows(this.file.path)
    }

    this.content_md5 = content_md5
    this.crc64ecma = crc64ecma

    this.file.temp_path = this.file.path + SUFFIX

    // from
    this.path_type = path_type
    this.loc_id = loc_id
    this.loc_type = loc_type
    this.file_key = file_key

    this.drive_id = drive_id
    this.share_id = share_id
    this.file_id = file_id
    this.file_path = file_path

    this.max_chunk_size = parseInt(max_chunk_size || MAX_CHUNK_SIZE)
    this.init_chunk_con = init_chunk_con || INIT_MAX_CON
    this.chunk_con_auto = chunk_con_auto || false
    this.checking_crc = checking_crc !== false

    // 可选
    this.content_type = content_type
    this.thumbnail = thumbnail
    this.remote_updated_at = remote_updated_at

    this.download_url = download_url

    // funs
    this.state_changed = state_changed
    this.progress_changed = progress_changed
    this.part_completed = part_completed
    // debug
    this.set_calc_max_con = this.chunk_con_auto
      ? set_calc_max_con || calcDownloadMaxConcurrency
      : () => {
          return this.init_chunk_con
        }

    // this.crc64_running_mode = crc64_running_mode || 'end'
    // this.crc64_fun = crc64_fun || 'js'
    this.custom_crc64_fun = custom_crc64_fun
    this.process_calc_crc64_size = process_calc_crc64_size || PROCESS_CALC_CRC64_SIZE

    // progress & state
    this.state = state || 'waiting' // waiting running success error checking
    this.message = message || ''
    this.progress = progress || 0
    this.speed = speed || 0
    this.loaded = loaded || 0

    this.left_time = 0

    this.start_time = start_time
    this.end_time = end_time

    this.used_avg_speed = used_avg_speed || 0
    this.used_time_len = used_time_len || 0
    this.avg_speed = this.used_avg_speed

    this.limit_part_num = limit_part_num || LIMIT_PART_NUM
    this.download_id = download_id || undefined
    this.verbose = verbose != null ? verbose : true

    // chunk info

    this.part_info_list = part_info_list || []

    this.cancelSources = []
    this.checking_progress = 0
  }

  async handleError(e) {
    if (this.cancelFlag) {
      await this.changeState('error', e)
      return e
    }

    if (e.message == 'stopped') {
      this.stop()
      return e
    }

    this.message = e.message
    this.end_time = Date.now()
    this.timeLogEnd('task', Date.now())

    console.warn(
      `${this.file.name} (size:${this.file.size}) 下载失败, 耗时:${this.end_time - this.start_time}ms. [ERROR]: ${
        e.message
      }`,
    )
    if (this.verbose) {
      if (e.response) {
        console.error(e.stack)
      } else console.error(e.stack)
    }

    if (isNetworkError(e)) {
      this.stop()
    } else {
      // 只要error，cancel 所有请求
      this.cancelAllDownloadRequests()
      this.calcTotalAvgSpeed()
      this.stopCalcSpeed()
      this.on_calc_part_crc_success = false
      await this.changeState('error', e)
    }
    return e
  }

  getCheckpoint() {
    let cp = {
      // progress & state
      loaded: this.loaded,
      size: this.file.size,
      progress: this.progress, // 0-100
      state: this.state,

      // to
      file: {
        name: this.file.name,
        size: this.file.size,
        path: this.file.path,
        temp_path: this.file.temp_path,
        type: this.file.type,
      },

      content_md5: this.content_md5,
      crc64ecma: this.crc64ecma,

      // from
      path_type: this.path_type,
      loc_id: this.loc_id,
      loc_type: this.loc_type,
      file_key: this.file_key,

      download_id: this.download_id || '',

      // time
      start_time: this.start_time,
      end_time: this.end_time,

      // 均速计算
      used_avg_speed: this.used_avg_speed,
      used_time_len: this.used_time_len,

      // downloading info
      part_info_list: (this.part_info_list || []).map(n => {
        return {
          part_number: n.part_number,
          part_size: n.part_size,
          loaded: n.loaded || 0,
          crc64: n.crc64, // 本地计算chunk 的 crc64,保存起来。
          from: n.from,
          to: n.to,
          start_time: n.start_time,
          end_time: n.end_time,
          running: n.running || false,
          done: n.done || false,
          crc64_st: n.crc64_st,
          crc64_et: n.crc64_et,
        }
      }),
    }

    return formatCheckpoint(cp)
  }

  initChunks() {
    // 分块策略:
    // 可以并发无序下载，chunk可以小一点，以保证断点续传的效率。为了保证尽量占满带宽，要动态调节并发数。

    let chunk_size = this.max_chunk_size || MAX_CHUNK_SIZE
    let num = Math.ceil(this.file.size / chunk_size)
    if (num >= LIMIT_PART_NUM) {
      chunk_size = Math.ceil(this.file.size / LIMIT_PART_NUM)
      num = Math.ceil(this.file.size / chunk_size)
    }

    num -= 1

    if (this.verbose) console.log('chunk size:')

    this.part_info_list = []
    let i = 0
    for (i = 0; i < num; i++) {
      this.part_info_list.push({
        part_number: 1 + i,
        part_size: chunk_size,
        from: i * chunk_size,
        to: (i + 1) * chunk_size,
        loaded: 0,
      })
    }
    if (this.verbose)
      console.log(`%c `, `background:${num > 0 ? '#69f' : '#ccc'};padding-left:240px`, chunk_size, `x ${num}`)

    const s = this.file.size - i * chunk_size

    if (s > 0) {
      this.part_info_list.push({
        part_number: i + 1,
        part_size: s,
        from: i * chunk_size,
        to: this.file.size,
        loaded: 0,
      })

      if (this.verbose)
        console.log(`%c `, `background:#69f;padding-left:${Math.ceil((s / chunk_size) * 240)}px`, s, 'x 1')
    }
  }

  async wait() {
    if (['waiting'].includes(this.state)) return
    this.stopCalcSpeed()
    this.stopFlag = false
    this.cancelFlag = false

    if (['error'].includes(this.state)) {
      // 从头来
      delete this.download_id
      delete this.end_time
      delete this.message
      this.initChunks()
    }

    await this.changeState('waiting')
  }
  calcTotalAvgSpeed() {
    // this.used_time_len = this.used_time_len;
    // this.used_avg_speed = this.used_avg_speed;
    const cur_time_len = Date.now() - this.download_start_time
    const cur_loaded_size = this.loaded - (this.start_done_part_loaded || 0)

    // console.log('之前的使用时长',this.used_time_len, '之前的平均速度', this.used_avg_speed)
    // console.log('当前的使用时长',cur_time_len, '当前 loaded', cur_loaded_size)
    if (this.used_time_len && this.used_avg_speed) {
      this.avg_speed =
        (((this.used_time_len / 1000) * this.used_avg_speed + cur_loaded_size) / (this.used_time_len + cur_time_len)) *
        1000
    } else {
      this.avg_speed = (cur_loaded_size / cur_time_len) * 1000
    }
    this.used_time_len += cur_time_len
    this.used_avg_speed = this.avg_speed
  }
  doStop() {
    this.calcTotalAvgSpeed()
    this.stopCalcSpeed()
    this.stopFlag = true

    if (['stopped', 'success', 'error'].includes(this.state)) return

    this.cancelAllDownloadRequests()
    this.on_calc_part_crc_success = false
  }
  async stop() {
    this.doStop()
    await this.changeState('stopped')
  }

  async cancel() {
    this.cancelFlag = true
    this.doStop()
    await this.changeState('cancelled')
    // await this.handleError(new Error('cancel'))
  }
  /* istanbul ignore next */
  cancelAllDownloadRequests() {
    if (this.verbose) console.warn('cancel all download request')

    if (this.cancelSources && this.cancelSources.length > 0) {
      this.cancelSources.forEach(n => {
        n.cancel('stopped')
      })
      this.cancelSources = []
    } else {
      console.log('没有可用cancel的请求')
      // this.changeState('stopped')
    }
  }

  async changeState(state, error = null) {
    this.state = state
    if (this.verbose) {
      console.log(`[${this.file.name}] state: ${state} ${error ? `[ERROR]${error.message}` : ''}`)
    }

    const cp = this.getCheckpoint()
    if (typeof this.state_changed === 'function') {
      await this.state_changed(cp, cp.state, error)
    }
    this.emit('statechange', cp, cp.state, error)
  }

  async start() {
    console.log('-- Downloader call start(), state=', this.state)
    if (!['waiting', 'error', 'stopped', 'cancelled'].includes(this.state)) return
    this.changeState('start')

    this.doStart()
  }
  async doStart() {
    this.stopFlag = false
    this.cancelFlag = false
    this.on_calc_part_crc_success = false

    try {
      // 上传流程，可以被抛出的异常阻断
      await this.run()
    } catch (e) {
      if (e.message == 'stopped' || this.stopFlag || this.cancelFlag) {
        // 忽略
        return
      }
      debug('下载文件失败:', `[${this.file.name}]`, e)
      return await this.handleError(e || new Error(`download failed:${this.file.name}`))
    }
  }
  async run() {
    this.start_time = Date.now()
    this.timeLogStart('task', Date.now())

    if (!this.part_info_list || this.part_info_list.length == 0) {
      this.initChunks()
    }

    // 只有create了，task id 才正式生成。
    await this.create()

    // check 本地磁盘空间

    await this.checkLocalDiskSize()

    // 获取 download_url

    await this.getDownloadUrl()

    this.download_start_time = Date.now()
    this.timeLogStart('download', Date.now())

    // fix created 状态无法 stopped
    if (this.cancelFlag) {
      if (this.state != 'cancelled') await this.changeState('cancelled')
      return
    }
    if (this.stopFlag) {
      if (this.state != 'stopped') await this.changeState('stopped')
      return
    }

    await this.download()

    this.timeLogEnd('download', Date.now())

    this.calcTotalAvgSpeed()

    if (this.verbose) {
      console.log(`[${this.file.name}] all part downloaded`)
      console.log('---------------')
      console.log(this.part_info_list.map(n => `${n.part_number}:${n.crc64}`).join('\n'))
      console.log('---------------')
    }

    if (this.checking_crc) {
      await this.checkFileHash()
    }

    await this.complete()

    this.end_time = Date.now()
    this.timeLogEnd('task', Date.now())

    await this.changeState('success')

    if (this.verbose) {
      console.log(
        `%c${this.file.name} (size:${this.file.size}) 下载成功,耗时:${this.end_time - this.start_time}ms`,
        'background:green;color:white;padding:2px 4px;',
      )
      this.printTimeLogs()
      console.log(`avg speed: ${formatSize(this.used_avg_speed)}/s`)
    }

    return this
  }

  async checkLocalDiskSize() {
    const freeDiskSize = await getFreeDiskSize(this.file.temp_path, this.context)
    if (this.verbose) console.log('本地剩余磁盘空间:', freeDiskSize)
    if (freeDiskSize < this.file.size + 10 * 1024 * 1024) {
      throw new Error('Insufficient disk space')
    }
  }

  async create() {
    const {fs} = this.context
    const p = this.file.temp_path

    if (!this.download_id) {
      if (fs.existsSync(p)) {
        await fs.promises.unlink(p)
      }

      await fs.promises.writeFile(p, '')
      this.download_id = randomHex()
      await this.changeState('created')
    } else if (!fs.existsSync(p)) {
      await fs.promises.writeFile(p, '')
    }
  }

  async http_client_call(action, opt, options = {}) {
    const _key = options.key || Math.random().toString(36).substring(2)
    delete options.key
    this.timeLogStart(action + '-' + _key, Date.now())
    try {
      return await this.vendors.http_client[action](opt, options)
    } catch (e) {
      console.error(action, 'ERROR:', e.response || e)
      throw e
    } finally {
      this.timeLogEnd(action + '-' + _key, Date.now())
    }
  }

  async getDownloadUrl() {
    return await this.vendors.http_util.callRetry(this.doGetDownloadUrl, this, [], {
      verbose: this.verbose,
      getStopFlagFun: () => {
        return this.stopFlag
      },
    })
  }
  async doGetDownloadUrl() {
    const result = await this.http_client_call('getDownloadUrl', {
      drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
      share_id: this.loc_type == 'share' ? this.loc_id : undefined,
      file_name: this.file.name,
      file_id: this.path_type == 'StandardMode' ? this.file_key : undefined,
      file_path: this.path_type == 'HostingMode' ? this.file_key : undefined,
    })
    if (result.streams_url && this.file.name.indexOf('.livp') > -1) {
      // fix: .livp;  .livp中包含 heic/jpeg 和 mov
      if (this.file.name.endsWith('.livp')) {
        this.download_url = result.streams_url.heic || result.streams_url.jpeg
      } else {
        // 客户端下载livp特殊处理，此时已经把file.name做过处理，为原livp文件名加类型后缀
        const key = this.file.name.split('.').pop()
        this.download_url = result.streams_url[key]
      }
    } else {
      this.download_url = result.url || this.download_url
    }
    return result
  }

  calcSpeed(speedList) {
    let average = speedList.reduce((a, b) => a + b) / speedList.length
    let lastSpeed = speedList[speedList.length - 1]
    const smoothing = 0.05
    return smoothing * lastSpeed + (1 - 0.05) * average
  }
  startCalcSpeed() {
    this.left_time = 0
    this.speed = 0
    let lastLoaded = this.loaded

    let curSpeed = 0
    let speedList = []

    if (this.tid_speed) {
      clearInterval(this.tid_speed)
      this.tid_speed = null
    }
    this.tid_speed = setInterval(() => {
      // 进度会回退, 可能为负数，max(0, )
      curSpeed = Math.max(0, this.loaded - lastLoaded)

      speedList.push(curSpeed)
      if (speedList.length > 10) speedList.shift()

      this.speed = this.calcSpeed(speedList)
      // 进度为0，left_time就会为 Infinity，改为1天
      this.left_time = this.speed === 0 ? 24 * 3600 : (this.file.size - this.loaded) / this.speed

      lastLoaded = this.loaded

      this.maxConcurrency = this.set_calc_max_con(this.speed, this.part_info_list[0].part_size, this.maxConcurrency)

      // check timeout
      this.checkTimeout()
    }, 1000)
  }
  checkTimeout() {
    // 如果速度一直是０，则表示断网。stop
    if (this.speed_0_count == null) this.speed_0_count = 0

    if (this.speed == 0) {
      this.speed_0_count++
    } else {
      this.speed_0_count = 0
    }
    if (this.verbose && this.speed_0_count > 0) console.log(`speed==0 ${this.speed_0_count}次, 1000次将暂停任务`)

    if (this.speed_0_count >= 10) {
      // this.stop()
      this.speed_0_count = 0
      this.retryAllUploadRequest()
    }
  }

  /* istanbul ignore next */
  async retryAllUploadRequest() {
    this.doStop()
    // wait for 1 second
    // stop是异步的，需要等待 getStopFlagFun 都执行到。
    await new Promise(a => setTimeout(a, 1000))
    this.doStart()
  }

  stopCalcSpeed() {
    if (this.tid_speed) {
      clearInterval(this.tid_speed)
      this.tid_speed = null
    }
    this.speed = 0
  }

  getNextPart() {
    let allDone = true
    let allRunning = true
    let nextPart = null
    for (const n of this.part_info_list) {
      if (!n.done) {
        allDone = false
        if (!n.running) {
          nextPart = n
          allRunning = false
          break
        }
      }
    }
    return {allDone, allRunning, nextPart}
  }
  async download() {
    await this.changeState('running')

    this.loaded = calc_downloaded(this.part_info_list, true)
    this.start_done_part_loaded = this.loaded // 用于计算平均速度
    // this.loaded = this.done_part_loaded

    this.startCalcSpeed()

    const that = this
    let con = 0
    this.maxConcurrency = this.init_chunk_con

    // 缓冲修改 progress
    this.updateProgressThrottle = throttleInTimes(() => {
      this.updateProgress()
    })

    try {
      await new Promise((resolve, reject) => {
        check_download_next_part()

        function check_download_next_part() {
          if (that.stopFlag) {
            reject(new Error('stopped'))
            return
          }

          let {allDone, allRunning, nextPart} = that.getNextPart()

          if (allDone) {
            resolve()
            return
          }

          if (allRunning) {
            return
          }

          if (con < that.maxConcurrency) {
            if (that.verbose) console.log('并发: ', con + 1, '/', that.maxConcurrency)
            const partInfo = nextPart

            if (!partInfo) {
              return
            }

            ;(async () => {
              if (that.stopFlag) {
                reject(new Error('stopped'))
                return
              }
              con++
              await that.down_part(partInfo)
              con--
              check_download_next_part()
            })()

            check_download_next_part()
          }
        }
      })
    } catch (e) {
      console.error(e.stack)
      throw e
    } finally {
      // 最后
      this.notifyProgress(this.state, 100)
      this.stopCalcSpeed()
    }
  }

  async down_part(partInfo) {
    partInfo.start_time = Date.now()
    this.timeLogStart('part-' + partInfo.part_number, Date.now())

    partInfo.loaded = partInfo.loaded || 0
    partInfo.running = true
    partInfo.done = false

    if (this.verbose) {
      console.log(
        `[${this.file.name}] downloading part:`,
        partInfo.part_number,
        ` : ${this.part_info_list.length}`,
        partInfo.from,
        '~',
        partInfo.to,
        ', totol size:',
        this.file.size,
      )
    }

    try {
      const streamResult = await this.downloadPartRetry(partInfo, {
        method: 'get',
        url: this.download_url,
        headers: {
          Range: `bytes=${partInfo.from + partInfo.loaded}-${partInfo.to - 1}`,
        },
        responseType: 'stream',
        maxContentLength: Infinity,
        maxRedirects: 5,
      })

      await this.pipeWS(streamResult.data, partInfo)

      partInfo.loaded = partInfo.part_size
      partInfo.done = true
      delete partInfo.running

      partInfo.end_time = Date.now()
      this.timeLogEnd('part-' + partInfo.part_number, Date.now())

      this.loaded = calc_downloaded(this.part_info_list)

      if (this.verbose) {
        console.log(
          `[${this.file.name}] download part complete: `,
          partInfo.part_number,
          ` : ${this.part_info_list.length}, elapse:${partInfo.end_time - partInfo.start_time}ms`,
        )
      }

      // if (that.checking_crc) {
      //   // 分片下载完，计算crc
      //   if (that.crc64_running_mode == 'part') {
      //     // 异步计算part 的 crc64
      //     that.asyncPartCrc(partInfo, () => {
      //       that.notifyPartCompleted(partInfo)
      //     })
      //   } else {
      //     that.notifyPartCompleted(partInfo)
      //   }
      // } else {
      //   that.notifyPartCompleted(partInfo)
      // }
      this.notifyPartCompleted(partInfo)
    } catch (e) {
      delete partInfo.done
      delete partInfo.running
      // delete partInfo.loaded

      /* istanbul ignore next */
      /* istanbul ignore if */
      if (e.response) {
        if (e.response.status == 404) {
          if (e.response.data.indexOf('The specified download_url does not exist') != -1) {
            delete this.download_id
            this.part_info_list.forEach(n => {
              delete n.crc64
              delete n.crc64_st
              // delete n.loaded
              delete n.running
              delete n.done
            })
          }
        }
      }

      if (this.verbose) {
        console.warn(`[${this.file.name}] download error part_number=${partInfo.part_number}: ${e.message}`)
      }
      if (e.message == 'retry_download_part') {
        // pass
      } else {
        throw e
      }
    } finally {
      partInfo.end_time = Date.now()
    }
  }

  notifyPartCompleted(partInfo) {
    const cp = this.getCheckpoint()
    let part = JSON.parse(JSON.stringify(partInfo))

    if (typeof this.part_completed === 'function') {
      this.part_completed(cp, part)
    }
    this.emit('partialcomplete', cp, part)
  }

  /* istanbul ignore next */
  async downloadPartRetry(partInfo, opt) {
    return await this.vendors.http_util.callRetry(this.doDownloadPart, this, [partInfo, opt], {
      verbose: this.verbose,
      getStopFlagFun: () => {
        return this.stopFlag
      },
    })
  }

  async doDownloadPart(partInfo, opt) {
    try {
      return await this._axiosDownloadPart(partInfo, opt)
    } catch (e) {
      if (
        e.response &&
        e.response.status == 403 &&
        e.response.data &&
        e.response.data.includes('AccessDenied') &&
        e.response.data.includes('expired')
      ) {
        // download_url 过期，需要重新获取
        if (this.verbose) console.warn('download_url 过期, 需要重新获取')
        await this.getDownloadUrl()
        opt.url = this.download_url
        return await this._axiosDownloadPart(partInfo, opt)
      } else {
        throw e
      }
    }
  }
  async _axiosDownloadPart(partInfo, opt) {
    const {CancelToken} = Axios
    const source = CancelToken.source()
    this.cancelSources.push(source)

    try {
      const result = await this.http_client_call('axiosDownloadPart', opt, {
        key: partInfo.part_number,
        cancelToken: source.token,
      })

      // check size 和 md5 等值，如果文件有变化，则失败
      // console.log(result.headers)
      // content-length
      // x-oss-hash-crc64ecma
      // content-md5
      this.checkMatch(
        this.content_md5,
        result.headers['content-md5'],
        'Content-MD5 not match, The file has been modified',
      )
      this.checkMatch(
        this.crc64ecma,
        result.headers['x-oss-hash-crc64ecma'],
        'x-oss-hash-crc64ecma not match, The file has been modified',
      )
      // 这个content-length 不是整个文件的，无法判断
      // this.checkMatch(
      //   this.file.size,
      //   parseInt(result.headers['content-length']),
      //   'Content-Length not match, The file has been modified'
      // )

      return result
    } catch (e) {
      if (Axios.isCancel(e)) {
        throw new Error('stopped')
      } else throw e
    } finally {
      removeItem(this.cancelSources, source)
    }
  }
  checkMatch(a, b, msg) {
    if (a != null && a != b) throw new Error(msg)
  }
  pipeWS(stream, partInfo) {
    const {fs} = this.context

    // partInfo.loaded = 0
    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(this.file.temp_path, {
        // autoClose: true,
        flags: 'r+',
        start: partInfo.from + partInfo.loaded,
      })

      stream.on('data', chunk => {
        // if (!chunk) return;
        if (this.stopFlag) {
          const stopErr = new Error('stopped')

          // 流要destroy掉
          stream.destroy(stopErr)
          ws.destroy(stopErr)

          reject(stopErr)
          return
        }
        partInfo.loaded += chunk.byteLength

        // 回调太频繁，需要缓冲，不然会影响下载速度
        this.updateProgressThrottle()
      })

      stream.pipe(ws)

      stream.on('error', e => {
        reject(e)
      })
      ws.on('finish', () => {
        if (partInfo.loaded != partInfo.part_size) {
          console.log('---------ws finish', partInfo.loaded, partInfo.part_size, 'retry_download_part')
          reject(new Error('retry_download_part'))
        } else {
          resolve()
        }
      })
      ws.on('error', e => {
        reject(e)
      })
    })
  }

  updateProgress() {
    let running_loaded = 0
    this.part_info_list.forEach(n => {
      running_loaded += n.loaded
    })
    this.loaded = running_loaded

    // console.log('---on data',partInfo.part_number, partInfo.part_size, partInfo.loaded,  this.loaded, this.done_part_loaded, chunk.byteLength)
    this.progress = formatProgress(this.loaded / this.file.size)

    this.notifyProgress(this.state, this.progress)
  }

  notifyProgress(state, progress) {
    if (typeof this.progress_changed === 'function') {
      this.progress_changed(state, progress)
    }
    this.emit('progress', state, progress)
  }

  async complete() {
    const {fs} = this.context
    // Error: EPERM: operation not permitted, rename 'C:\Users\Administrator\Downloads\a.iso.download' -> 'C:\Users\Administrator\Downloads\a.iso'
    await fs.promises.rename(this.file.temp_path, this.file.path)
    await this.changeState('complete')
  }

  async headCRC64() {
    return await this.vendors.http_util.callRetry(this.doHeadCRC64, this, [], {
      verbose: this.verbose,
      getStopFlagFun: () => {
        return this.stopFlag
      },
    })
  }
  async doHeadCRC64() {
    const {Axios: NodeAxios, https, AxiosNodeAdapter} = this.context
    const result = await NodeAxios({
      method: 'GET',
      headers: {
        Range: 'bytes=0-1',
      },
      adapter: AxiosNodeAdapter,
      httpsAgent: new https.Agent({rejectUnauthorized: false}),
      url: this.download_url,
    })

    return result.headers['x-oss-hash-crc64ecma'] || ''
  }

  async checkFileHash() {
    // 全部下载完，计算crc
    await this.checkFileHash_all()
  }
  async checkFileHash_all() {
    // const {fs} = this.context

    this.timeLogStart('crc64', Date.now())

    const timeKey = `crc64[${this.file.name}](${Math.random()}) elapse:`
    if (this.verbose) console.time(timeKey)

    await this.changeState('checking')
    this.crc64_hash = await this.headCRC64()

    const _crc64_fun = this.custom_crc64_fun || this.vendors.calc_util.calcFileCrc64

    const result = await _crc64_fun({
      file_path: this.file.temp_path,
      process_calc_crc64_size: this.process_calc_crc64_size,
      onProgress: progress => {
        this.checking_progress = Math.round(progress) // 0-100
      },
      getStopFlagFun: () => {
        return this.stopFlag
      },
      context: this.context,
    })

    this.calc_crc64 = result

    if (this.verbose) console.timeLog(timeKey, ` result:`, result)

    this.timeLogEnd('crc64', Date.now())

    if (this.calc_crc64 != this.crc64_hash) {
      throw new Error(`crc64_hash not match: ${this.calc_crc64} != ${this.crc64_hash}`)
    }
  }
}
// end

function removeItem(arr, item) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === item) {
      // if(item) item.cancel('stopped')
      arr.splice(i, 1)
      break
    }
  }
}
