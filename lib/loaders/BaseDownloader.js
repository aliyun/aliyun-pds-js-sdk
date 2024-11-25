import Axios from 'axios'
import {calcDownloadMaxConcurrency, calcSmoothSpeed, getIfVpcUrl} from '../utils/LoadUtil'
import {BaseLoader} from './BaseLoader'
import {isNetworkError, isStoppableError, isOssUrlExpired} from '../utils/HttpUtil'
import {formatSize, formatPercents, randomHex, elapse} from '../utils/Formatter'
import {checkAllowExtName} from '../utils/FileNameUtil'
import {PDSError} from '../utils/PDSError'
import {formatCheckpoint, initCheckpoint} from '../utils/CheckpointUtil'
import {init_chunks_download} from '../utils/ChunkUtil'

const INIT_MAX_CON = 10 // 初始并发
const MAX_CHUNK_SIZE = 100 * 1024 * 1024 // 100MB
const SUFFIX = '.download'
const LIMIT_PART_NUM = 9000 // 最多分片数量
const PROCESS_CALC_CRC64_SIZE = 50 * 1024 * 1024 // 文件大小超过将启用子进程计算 crc64
const PROGRESS_EMIT_STEP = 0.2 // 进度通知 step
const MAX_SPEED_0_COUNT = 10 // 速度为0 连续超过几次，将cancel所有请求重来

import {genID} from '../utils/IDUtil'

console.timeLog = console.timeLog || console.timeEnd

export class BaseDownloader extends BaseLoader {
  /**
   * abstract 需要重写实现, 返回是否秒传成功
   * @return Promise<void>
   */
  /* istanbul ignore next */
  async download() {
    throw new Error('Method not implemented.')
  }
  // 可以重写
  async prepare() {
    await this.getDownloadUrl()
  }

  constructor(checkpoint, configs = {}, vendors = {}, context_ext = {}, axios_options = {}) {
    super()

    // 避免警告： possible EventEmitter memory leak detected
    // if (this.setMaxListeners) this.setMaxListeners(100)

    this.vendors = vendors
    this.context_ext = context_ext
    this.axios_options = axios_options

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

      archive_file_ids,
      archive_async_task_id,

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
    } = initCheckpoint(checkpoint)

    const {
      verbose,

      use_vpc, // 强制使用vpc，即使在公网环境

      checking_crc,
      max_file_size_limit,
      file_ext_list_limit,

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

      // x-share-token
      share_token,
      refresh_share_token,
    } = configs

    // 初始化
    this.id = id || genID()

    // to
    if (!file || !file.name || (!archive_file_ids?.length && isNaN(file.size))) {
      throw new Error('Fatal: Invalid file struct')
    }
    this.file = file // {name,size,path,type,temp_path?}
    this.size = file.size

    this.file.path = this.context_ext.fixFileName4Windows?.call?.(this.context_ext, this.file.path)

    this.content_md5 = content_md5
    this.crc64ecma = crc64ecma

    this.file.temp_path = this.file.path + SUFFIX

    // from
    this.path_type = path_type
    this.loc_id = loc_id || drive_id || share_id
    this.loc_type = loc_type || (drive_id ? 'drive' : 'share')
    this.file_key = file_key || file_id

    this.archive_file_ids = archive_file_ids
    this.archive_async_task_id = archive_async_task_id

    this.max_chunk_size = parseInt(max_chunk_size) || MAX_CHUNK_SIZE
    this.init_chunk_con = init_chunk_con || INIT_MAX_CON
    this.chunk_con_auto = chunk_con_auto !== false
    this.checking_crc = checking_crc !== false

    this.max_file_size_limit = max_file_size_limit // 文件大小限制
    this.file_ext_list_limit = file_ext_list_limit // 文件类型限制

    // 可选
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

    this.use_vpc = use_vpc || false
    // chunk info

    this.part_info_list = part_info_list || []

    this.cancelSources = []
    this.checking_progress = 0
    this.start_done_part_loaded = 0

    // x-share-token 支持
    this.share_token = share_token
    this.refresh_share_token = refresh_share_token
  }

  async handleError(e) {
    if (this.cancelFlag) {
      await this.changeState('error', e)
      return e
    }

    if (e.message == 'stopped' || e.code == 'stopped') {
      this.stop()
      return e
    }

    this.message = e.message
    this.error = e
    this.end_time = Date.now()
    this.timeLogEnd('task', Date.now())

    if (this.verbose) {
      console.warn(
        `${this.file.name} (size:${this.file.size}) 下载失败, 耗时:${this.end_time - this.start_time}ms. [ERROR]: ${
          e.message
        }`,
      )
    }

    if (isNetworkError(e) || isStoppableError(e)) {
      this.stop()
    } else {
      // 只要error，cancel 所有请求
      this.cancelAllDownloadRequests()
      this.calcTotalAvgSpeed()
      this.stopCalcSpeed()

      // 报错，下次要重头开始
      this.download_id = ''
      this.part_info_list = []

      this.on_calc_part_crc_success = false
      await this.changeState('error', e)
    }
    return e
  }

  getCheckpoint() {
    let cp = {
      id: this.id,
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
        type: this.file.type, // content-type
      },

      content_md5: this.content_md5,
      crc64ecma: this.crc64ecma,

      // from
      path_type: this.path_type,
      loc_id: this.loc_id,
      loc_type: this.loc_type,
      file_key: this.file_key,

      // for archive download
      archive_file_ids: this.archive_file_ids,
      archive_async_task_id: this.archive_async_task_id,

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

    let [part_info_list, chunk_size] = init_chunks_download(this.file.size, this.max_chunk_size)
    this.part_info_list = part_info_list
  }

  async wait() {
    if (['waiting'].includes(this.state)) return
    this.error = null
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

  async stop(doNotChangeStatus) {
    if (this.verbose && !doNotChangeStatus) console.log(`stop task: ${this.state} => stopped`)
    this.calcTotalAvgSpeed()
    this.stopCalcSpeed()
    this.stopFlag = true

    if (['stopped', 'success', 'error', 'cancelled'].includes(this.state)) return

    this.cancelAllDownloadRequests()
    this.on_calc_part_crc_success = false
    if (!doNotChangeStatus) await this.changeState('stopped')
  }

  async cancel() {
    if (this.verbose) console.log(`cancel task: ${this.state} => cancelled`)
    this.cancelFlag = true
    this.stop(true)
    this.destroy?.()
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
    }
  }

  async changeState(state, error = null) {
    this.state = state
    if (this.verbose) {
      console.log(`[${this.file.name}] state: ${state} ${error ? `[ERROR]${error.message}` : ''}`)
    }

    const cp = this.getCheckpoint()
    // notify
    if (typeof this.state_changed === 'function') {
      ;(async () => {
        try {
          await this.state_changed(cp, cp.state, error)
        } catch (err) {
          console.error(err)
        }
      })()
    }
    this.emit('statechange', cp, cp.state, error)
  }

  async start() {
    if (this.verbose) console.log(`start task: ${this.state} => start`)
    if (!['waiting', 'error', 'stopped', 'cancelled'].includes(this.state)) return
    this.changeState('start')

    await this.doStart()
  }
  async doStart() {
    this.stopFlag = false
    this.cancelFlag = false
    this.on_calc_part_crc_success = false

    try {
      // 下载流程，可以被抛出的异常阻断
      await this.run()
    } catch (e) {
      if (this.stopFlag || this.cancelFlag) {
        // 忽略
        return
      }
      console.debug('下载文件失败:', `[${this.file.name}]`, e)
      return await this.handleError(e || new Error(`download failed:${this.file.name}`))
    }
  }
  async run() {
    // 限制文件大小
    let max_size_limit = parseInt(this.max_file_size_limit)
    if (max_size_limit && this.file.size > max_size_limit) {
      throw new PDSError(`File size exceeds limit: ${formatSize(max_size_limit)}`, 'FileSizeExceedDownloadLimit')
    }
    // 允许文件类型
    if (!checkAllowExtName(this.file_ext_list_limit, this.file.name)) {
      throw new PDSError(`File extention is invalid`, 'FileExtentionIsInvalid')
    }

    if (!this.start_time) {
      this.start_time = Date.now()
      this.timeLogStart('task', Date.now())
    }

    // 获取 download_url，web打包下载还会获取 file.size
    await this.prepare()
    // this.download_url
    // this.file.size

    if (!this.part_info_list || this.part_info_list.length == 0) {
      this.initChunks()
    }

    // fix created 状态无法 stopped
    if (this.cancelFlag) {
      if (this.state != 'cancelled') await this.changeState('cancelled')
      return
    }
    if (this.stopFlag) {
      if (this.state != 'stopped') await this.changeState('stopped')
      return
    }

    // 2. 只有create了，task id 才正式生成。
    await this.create()

    // 3. check 本地磁盘空间
    await this.checkLocalDiskSize()

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

    // 4. 开始下载
    await this.changeState('running')

    this.startCalcSpeed()

    // 分片并发下载
    await this.download()

    this.stopCalcSpeed()

    this.timeLogEnd('download', Date.now())
    // 统计
    this.calcTotalAvgSpeed()
    if (this.verbose) {
      console.log(`[${this.file.name}] all part downloaded`)
      console.log('---------------')
      console.log(this.part_info_list.map(n => `${n.part_number}:${n.crc64}`).join('\n'))
      console.log('---------------')
    }

    // 5. 校验文件完整性， crc64
    if (this.checking_crc) {
      await this.checkFileHash()
    }

    // 6. 完成。 重命名去掉 .download 后缀
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
      console.log(
        `avg speed: ${formatSize(this.used_avg_speed)}/s, elapsed: ${elapse(this.end_time - this.start_time)}`,
      )
    }

    return this
  }

  async checkLocalDiskSize() {
    const freeDiskSize = await this.context_ext.getFreeDiskSize.call(this.context_ext, this.file.temp_path)
    if (this.verbose) console.log('本地剩余磁盘空间:', freeDiskSize)
    if (freeDiskSize < this.file.size + 10 * 1024 * 1024) {
      throw new Error('Insufficient disk space')
    }
  }

  async create() {
    const p = this.file.temp_path

    if (!this.download_id) {
      await this.context_ext.createFile.call(this.context_ext, p, '')
      this.download_id = randomHex()
      await this.changeState('created')
    } else {
      await this.context_ext.createFileIfNotExists.call(this.context_ext, p, '')
    }
  }

  async http_client_call(action, opt, options = {}, retry = 3, retry2 = 50) {
    const _key = options.key || Math.random().toString(36).substring(2)
    delete options.key
    this.timeLogStart(action + '-' + _key, Date.now())

    const useShareToken = !['axiosDownloadPart'].includes(action)
    const hasRefreshShareTokenFun = typeof this.refresh_share_token == 'function'

    // 支持 x-share-token 上传
    if (useShareToken && this.share_token) {
      options.headers = options.headers || {}
      options.headers['x-share-token'] = this.share_token
    }

    try {
      return await this.vendors.http_client[action](opt, options)
    } catch (e2) {
      let e = new PDSError(e2)
      if (e.code != 'stopped' && e.message != 'stopped' && this.verbose) console.warn(action, 'ERROR:', e)

      // 504 服务端timeout的情况, 等待后重试
      if (e.status == 504) {
        if (retry2 > 0) {
          // 等 1-4 秒
          await new Promise(a => setTimeout(a, parseInt(1000 + Math.random() * 3000)))
          return await this.http_client_call(action, opt, options, retry, --retry2)
        } else {
          throw new PDSError('stopped', 'stopped')
        }
      }
      // 分享页面上传文件, x-share-token 失效的情况
      // code: "ShareLinkTokenInvalid"
      // message: "ShareLinkToken is invalid. expired"
      if (useShareToken && hasRefreshShareTokenFun && e.status == 401 && retry > 0) {
        // 重新 refresh x-share-token
        let shareToken = await this.refresh_share_token()
        this.share_token = shareToken
        options.headers['x-share-token'] = shareToken
        return await this.http_client_call(action, opt, options, --retry)
      }
      throw e
    } finally {
      this.timeLogEnd(action + '-' + _key, Date.now())
    }
  }

  async getDownloadUrl() {
    // if (this.archive_file_ids?.length) {
    //   return await this.getArchiveDownloadUrl()
    // } else {
    return await this.vendors.http_util.callRetry(this.doGetDownloadUrl, this, [], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
    // }
  }

  async doGetDownloadUrl() {
    const result = await this.http_client_call(
      'getDownloadUrl',
      {
        drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
        share_id: this.loc_type == 'share' ? this.loc_id : undefined,
        file_name: this.file.name,
        file_id: this.file_key,
      },
      this.axios_options,
    )
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
      this.download_url = getIfVpcUrl(this.use_vpc, result.url || this.download_url, result.internal_url)
    }

    if (result.crc64_hash != null) {
      this.crc64_hash = result.crc64_hash
    }
    if (result.size != null) {
      this.file.size = result.size
    }
    return result
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

      this.speed = calcSmoothSpeed(speedList)
      // 进度为0，left_time 就会为 Infinity，改为1天
      this.left_time = this.speed === 0 ? 24 * 3600 : (this.file.size - this.loaded) / this.speed

      lastLoaded = this.loaded

      this.maxConcurrency = this.set_calc_max_con(
        this.speed,
        this.part_info_list[0].part_size,
        this.maxConcurrency,
        this.init_chunk_con,
      )

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
    if (this.verbose && this.speed_0_count > 0)
      console.log(`speed==0 ${this.speed_0_count}次, ${MAX_SPEED_0_COUNT}次将重新请求`)

    if (this.speed_0_count >= MAX_SPEED_0_COUNT) {
      // this.stop()
      this.speed_0_count = 0
      this.retryAllDownloadRequest()
    }
  }

  /* istanbul ignore next */
  async retryAllDownloadRequest() {
    this.stop(true)
    // wait for 1 second
    // stop是异步的，需要等待 getStopFlag 都执行到。
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
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }

  async doDownloadPart(partInfo, opt) {
    try {
      return await this._axiosDownloadPart(partInfo, opt)
    } catch (e) {
      if (isOssUrlExpired(e)) {
        // download_url 过期，需要重新获取
        if (this.verbose) console.warn('download_url 过期, 需要重新获取:', this.download_url)
        await this.getDownloadUrl()
        opt.url = this.download_url
        if (this.verbose) console.warn(`重新获取的 download_url: ${this.download_url}`)
        return await this._axiosDownloadPart(partInfo, opt)
      } else if (e.message.includes('connect EADDRNOTAVAIL') || e.message.includes('socket hang up')) {
        // OSS 报错 EADDRNOTAVAIL 或 socket hang up
        console.warn(e)
        this.message = e.message

        setTimeout(() => {
          this.retryAllDownloadRequest()
        })
        throw new PDSError('stopped', 'stopped')
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
      const result = await this.http_client_call('axiosDownloadPart', {
        ...opt,
        key: partInfo.part_number,
        cancelToken: source.token,
      })

      return result
    } catch (e) {
      if (Axios.isCancel(e)) {
        throw new PDSError('stopped', 'stopped')
      } else throw e
    } finally {
      removeItem(this.cancelSources, source)
    }
  }

  updateProgressStep(opt) {
    let prog = (this.loaded * 100) / this.file.size
    opt.last_prog = opt.last_prog || 0

    if (prog - opt.last_prog > PROGRESS_EMIT_STEP) {
      this.progress = formatPercents(prog)
      opt.last_prog = prog
      this.notifyProgress(this.state, this.progress)
    }
  }

  notifyProgress(state, progress) {
    if (typeof this.progress_changed === 'function') {
      this.progress_changed(state, progress)
    }
    this.emit('progress', state, progress)
  }

  async complete() {
    // Error: EPERM: operation not permitted, rename 'C:\Users\Administrator\Downloads\a.iso.download' -> 'C:\Users\Administrator\Downloads\a.iso'
    await this.context_ext.renameFile.call(this.context_ext, this.file.temp_path, this.file.path)
    await this.changeState('complete')
  }

  async headCRC64() {
    return await this.vendors.http_util.callRetry(this.doHeadCRC64, this, [], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }
  async doHeadCRC64() {
    let res = await this.http_client_call(
      'getFile',
      {
        drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
        share_id: this.loc_type == 'share' ? this.loc_id : undefined,
        file_id: this.file_key,
      },
      this.axios_options,
    )
    return res.crc64_hash
    // return await this.context_ext.getOSSObjectCrc64.call(this.context_ext, this.download_url)
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

    const _crc64_fun = this.custom_crc64_fun || this.context_ext.calcFileCrc64

    const result = await _crc64_fun.call(this.context_ext, {
      verbose: this.verbose,
      file: this.file, // for browser
      file_path: this.file.temp_path, // for node
      process_calc_crc64_size: this.process_calc_crc64_size,
      onProgress: progress => {
        this.checking_progress = Math.round(progress) // 0-100
      },
      getStopFlag: () => {
        return this.stopFlag
      },
      // context: this.context.context,
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
      arr.splice(i, 1)
      break
    }
  }
}
