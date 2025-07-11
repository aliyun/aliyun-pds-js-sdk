/**
 * 注意: Uploader.js 是 basic UI 和 widget 共用的模块, 依赖尽量从 vendors 传入，不要直接引入。
 */

import Axios from 'axios'
import {PDSError} from '../utils/PDSError'
// import {} from '../utils/LoadUtil'
import {BaseLoader} from './BaseLoader'
import {checkAllowExtName} from '../utils/FileNameUtil'
import {isNetworkError, isStoppableError, isOssUrlExpired} from '../utils/HttpUtil'
import {formatSize, formatPercents, elapse} from '../utils/Formatter'
import {formatCheckpoint, initCheckpoint} from '../utils/CheckpointUtil'
import {calcUploadMaxConcurrency, calcSmoothSpeed, removeItem, getIfVpcUrl} from '../utils/LoadUtil'

import {genID} from '../utils/IDUtil'

const INIT_MAX_CON = 5 // 初始并发
// const MAX_SIZE_LIMIT = 10 * 1024 * 1024 * 1024 * 1024 // 10 TB
const MAX_CHUNK_SIZE = 50 * 1024 * 1024 // 50MB
const LIMIT_PART_NUM = 9000 // OSS分片数最多不能超过1w片，这里取值 9000

const MIN_SIZE_FOR_PRE_HASH = 100 * 1024 * 1024 // 大于 100MB 计算预秒传
const PROCESS_CALC_CRC64_SIZE = 50 * 1024 * 1024 // 文件大小超过将启用子进程计算 crc64
const PROCESS_CALC_HASH_SIZE = 50 * 1024 * 1024 // 文件大小超过将启用子进程计算 sha1
const PROGRESS_EMIT_STEP = 0.2 // 进度通知 step
const MAX_SPEED_0_COUNT = 10 // 速度为0 连续超过几次，将cancel所有请求重来
// const STREAM_HIGH_WATER_MARK = 512 * 1024 // 512KB
console.timeLog = console.timeLog || console.timeEnd

/**
 * events:  statechange, progress, partialcomplete
 */
export class BaseUploader extends BaseLoader {
  /**
   * abstract 需要重写实现, 返回是否秒传成功
   * @return Promise<boolean>
   */
  /* istanbul ignore next */
  async prepareAndCreate() {
    throw new Error('Method not implemented.')
  }
  /* istanbul ignore next */
  async initChunks() {
    throw new Error('Method not implemented.')
  }
  /* istanbul ignore next  */
  mockErrorBeforeCreate() {}
  /* istanbul ignore next  */
  mockErrorAfterComplete() {}
  /**
   * abstract 需要重写实现, 返回是否秒传成功
   * @return Promise<void>
   */
  /* istanbul ignore next */
  async upload() {
    throw new Error('Method not implemented.')
  }

  constructor(checkpoint, configs = {}, vendors = {}, context_ext = {}, axios_options = {}) {
    super()

    // 避免警告： possible EventEmitter memory leak detected
    // if (this.setMaxListeners) this.setMaxListeners(100)

    this.vendors = vendors
    this.context_ext = context_ext
    this.axios_options = axios_options

    // {http_client, js_sha1, js_crc64_file, util}  = vendors

    // checkpoint 参数
    const {
      // from  html5 file
      file,

      // to folder info
      new_name, // 重命名
      path_type,
      loc_id,
      loc_type,
      parent_file_key,

      drive_id,
      share_id,
      file_id,

      parent_file_id,

      // 以下可选
      id,
      file_key,
      upload_id,
      rapid_upload,

      part_info_list,

      crc64_hash, // complete的时候，服务端返回

      state,
      message,
      //
      progress,
      speed,
      loaded,
      chunk_size, // 分片大小

      start_time,
      end_time,

      // 均速计算
      used_avg_speed,
      used_time_len,
    } = initCheckpoint(checkpoint)

    const {
      // check_name_mode: overwrite (直接覆盖，以后多版本有用), auto_rename (自动换一个随机名称), refuse (不会创建，告诉你已经存在), ignore (会创建重名的), skip (如果同名，直接成功)
      check_name_mode = 'auto_rename',
      check_name_mode_refuse_ignore_error = false, // 默认会 throw

      hash_name = 'sha1', // 秒传计算方法， sha1, sha256

      user_tags = [], // 标签

      max_file_size_limit, // 文件大小限制
      file_ext_list_limit, // 文件后缀限制

      // 是否校验
      checking_crc,
      // 调优
      max_chunk_size, // 分片大小
      init_chunk_con, // 自定义指定并发数， chunk_con_auto==false 时生效
      chunk_con_auto, // 自动调整并发数策略

      min_size_for_pre_hash, // 文件大小超过此Bytes才预秒传，否则直接秒传。

      custom_crc64_fun, // 自定义计算 crc64 方法

      /**
       * @deprecated Please use custom_hash_fun instead
       */
      custom_sha1_fun, // 自定义计算sha1 方法
      /**
       * @deprecated Please use custom_parts_hash_fun instead
       */
      custom_parts_sha1_fun, // 自定义计算 sha1 方法 (分part)

      custom_hash_fun, // 自定义计算hash方法，
      custom_parts_hash_fun, // 自定义计算hash方法，

      // (标准模式) 是否启用分片并发上传,  托管模式默认时并发的
      parallel_upload,

      // 最大分片数：10000片
      limit_part_num,

      process_calc_crc64_size, // 文件大小超过多少，将启用子进程计算 crc64
      process_calc_sha1_size, // 文件大小超过多少，将启用子进程计算 sha1
      process_calc_hash_size,

      verbose,
      ignore_rapid, // 忽略秒传
      use_vpc, // 强制使用vpc，即使在公网环境

      // functions
      state_changed,
      progress_changed,
      part_completed,
      set_calc_max_con,
      // x-share-token
      share_token,
      refresh_share_token,
    } = configs

    this.parallel_upload = parallel_upload

    // 初始化
    this.id = id || genID()

    // from
    if (!file || !file.name || isNaN(file.size)) {
      throw new Error('Fatal: Invalid file struct')
    }
    this.file = file // {name, size, path, type}
    this.size = file.size

    // to
    this.new_name = new_name
    this.path_type = path_type || 'StandardMode'

    this.loc_id = loc_id || drive_id || share_id
    this.loc_type = loc_type || (drive_id ? 'drive' : 'share')
    this.file_key = file_key || file_id
    this.parent_file_key = parent_file_key || parent_file_id

    this.crc64_hash = crc64_hash
    this.hash_name = hash_name

    this.max_file_size_limit = max_file_size_limit
    this.file_ext_list_limit = file_ext_list_limit

    // 调优: 最小100K，最大5G
    this.max_chunk_size = parseInt(max_chunk_size) || MAX_CHUNK_SIZE

    this.init_chunk_con = init_chunk_con || INIT_MAX_CON
    this.chunk_con_auto = chunk_con_auto !== false

    this.user_tags = user_tags

    this.min_size_for_pre_hash = min_size_for_pre_hash || MIN_SIZE_FOR_PRE_HASH

    this.custom_crc64_fun = custom_crc64_fun

    // 自定义计算文件hash方法
    this.custom_hash_fun = custom_hash_fun || custom_sha1_fun
    this.custom_parts_hash_fun = custom_parts_hash_fun || custom_parts_sha1_fun

    this.process_calc_crc64_size = process_calc_crc64_size || PROCESS_CALC_CRC64_SIZE
    this.process_calc_hash_size = process_calc_hash_size || process_calc_sha1_size || PROCESS_CALC_HASH_SIZE

    // 标准模式（串行）和托管模式需要通过crc64来校验文件完整性，标准模式(并发)通过sha1校验文件完整性
    this.checking_crc = 'StandardMode' == path_type && parallel_upload ? false : checking_crc !== false
    this.limit_part_num = limit_part_num || LIMIT_PART_NUM

    // 同名 策略
    this.check_name_mode = check_name_mode
    this.check_name_mode_refuse_ignore_error = check_name_mode_refuse_ignore_error

    // funs
    this.state_changed = state_changed
    this.progress_changed = progress_changed
    this.part_completed = part_completed

    // debug
    this.set_calc_max_con = this.chunk_con_auto
      ? set_calc_max_con || calcUploadMaxConcurrency
      : () => {
          /* istanbul ignore next */
          return this.init_chunk_con
        }

    // progress & state
    this.state = state || 'waiting'
    this.message = message || ''
    this.is_skip = false
    this.progress = progress || 0
    this.speed = speed || 0
    this.loaded = loaded || 0

    this.left_time = 0

    this.start_time = start_time
    this.end_time = end_time

    this.chunk_size = chunk_size

    // 是否打印详细日志
    this.verbose = verbose != null ? verbose : true

    // 均值计算
    this.used_avg_speed = used_avg_speed || 0
    this.used_time_len = used_time_len || 0
    this.avg_speed = this.used_avg_speed

    // uploading info
    this.upload_id = upload_id
    this.rapid_upload = rapid_upload || false

    part_info_list ? (this.part_info_list = part_info_list) : null

    this.cancelSources = []
    this.checking_progress = 0

    this.hash_progress = 0
    // 测试专用

    this.ignore_rapid = ignore_rapid || false
    this.use_vpc = use_vpc || false
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
        `${this.file.name} (uploadId: ${this.upload_id}, size:${this.file.size}) 上传失败, 耗时:${
          this.end_time - this.start_time
        }ms. [${e.name || 'ERROR'}]: ${e.message}`,
      )
    }

    if (isNetworkError(e) || isStoppableError(e)) {
      this.stop()
    } else {
      // 只要error，cancel 所有请求
      this.cancelAllUploadRequests()
      this.calcTotalAvgSpeed()
      this.on_calc_crc_success = false
      this.on_calc_crc_failed = false

      // 报错，下次要重头开始
      this.upload_id = ''
      this.part_info_list = []

      // node.js: "ENOENT: no such file or directory, open '/Users/zu/works/sdk/pds-js-sdk/tests/ft/tmp/tmp-rgclient1029-upload-task-restore.txt' [code: ClientError]"
      // 浏览器： NotFoundError: A requested file or directory could not be found at the time an operation was processed.
      if (/A requested file or directory could not be found|no such file or directory/.test(e.message)) {
        // 本地文件不存在, 创建的 file_id, 要去掉保存。重试
        this.created_file_id = undefined
        this.file_id = undefined
        this.file_key = undefined
      }

      await this.changeState('error', e)
      this.stopCalcSpeed()
    }
    return e
  }

  getCheckpoint() {
    let cp = {
      id: this.id,
      // progress & state
      loaded: this.loaded,
      size: this.size,
      progress: this.progress, // 0-100
      state: this.state,

      hash_name: this.hash_name,

      // 计算的均速
      used_avg_speed: this.used_avg_speed,
      // 计算的时长
      used_time_len: this.used_time_len,
      start_time: this.start_time,
      end_time: this.end_time,

      // 分片大小
      chunk_size: this.chunk_size,

      // from
      file: {
        name: this.file.name,
        size: this.file.size,
        path: this.file.path,
        type: this.file.type,
      },

      // to
      new_name: this.new_name,
      path_type: this.path_type,
      loc_id: this.loc_id,
      loc_type: this.loc_type,
      parent_file_key: this.parent_file_key,

      file_key: this.file_key,

      // uploading info
      upload_id: this.upload_id || undefined,
      crc64_hash: this.crc64_hash || undefined,
      rapid_upload: this.rapid_upload || false, // create时是否秒传成功
      is_skip: this.is_skip,
      part_info_list: (this.part_info_list || []).map(n => {
        const item = {
          part_number: n.part_number,
          part_size: n.part_size,
          etag: n.etag,
          from: n.from,
          to: n.to,
          start_time: n.start_time,
          end_time: n.end_time,
        }
        if (this.parallel_upload) {
          let key = `parallel_${this.hash_name}_ctx`
          item[key] = n[key]
        }
        return item
      }),
    }

    return formatCheckpoint(cp)
  }

  async wait() {
    if (['waiting'].includes(this.state)) return

    this.error = null
    this.stopCalcSpeed()
    this.stopFlag = false
    this.cancelFlag = false

    if (['error'].includes(this.state)) {
      // 从头来
      delete this.upload_id
      delete this.end_time
      delete this.message
      this.initChunks()
    }

    await this.changeState('waiting')
  }
  calcTotalAvgSpeed() {
    // this.used_time_len = this.used_time_len;
    // this.used_avg_speed = this.used_avg_speed;
    const cur_time_len = Date.now() - this.upload_start_time
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

    this.stopCalcSpeed()
    this.calcTotalAvgSpeed()

    this.stopFlag = true

    if (['stopped', 'success', 'rapid_success', 'error', 'cancelled'].includes(this.state)) return

    this.cancelAllUploadRequests()

    if (!this.calc_crc64) {
      this.on_calc_crc_success = false
      this.on_calc_crc_failed = false
    }
    if (!doNotChangeStatus) await this.changeState('stopped')
  }
  async cancel() {
    if (this.verbose) console.log(`cancel task: ${this.state} => cancelled`)
    this.cancelFlag = true
    this.stop(true)
    await this.changeState('cancelled')
  }

  cancelAllUploadRequests() {
    if (this.verbose) console.warn('cancel all upload request')

    if (this.cancelSources && this.cancelSources.length > 0) {
      this.cancelSources.forEach(n => {
        n.cancel('stopped')
      })
      this.cancelSources = []
    }
  }

  startCalcSpeed() {
    this.left_time = 0
    this.speed = 0
    let lastLoaded = this.loaded

    let curSpeed = 0
    let speedList = []

    if (this.tid_speed) clearInterval(this.tid_speed)
    this.tid_speed = setInterval(() => {
      // 进度会回退, 可能为负数，max(0, )
      curSpeed = Math.max(0, this.loaded - lastLoaded)

      speedList.push(curSpeed)
      if (speedList.length > 10) speedList.shift()

      this.speed = calcSmoothSpeed(speedList)

      // 进度为0，left_time就会为 Infinity，改为1天
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

  async checkTimeout() {
    // 如果速度一直是０，则表示断网。stop
    if (this.speed_0_count == null) this.speed_0_count = 0

    if (this.speed == 0) {
      this.speed_0_count++
    } else {
      this.speed_0_count = 0
    }
    if (this.verbose && this.speed_0_count > 0) {
      console.log(`speed==0 ${this.speed_0_count}次, ${MAX_SPEED_0_COUNT}次将重新请求`)
    }
    if (this.speed_0_count >= MAX_SPEED_0_COUNT) {
      // this.stop();
      this.speed_0_count = 0
      this.retryAllUploadRequest()
    }
  }

  /* istanbul ignore next */
  async retryAllUploadRequest() {
    this.stop(true)
    // wait for 1 second
    // stop是异步的，需要等待 getStopFlag 都执行到。
    await new Promise(a => setTimeout(a, 1000))
    this.doStart()
  }

  stopCalcSpeed() {
    if (this.tid_speed) {
      clearInterval(this.tid_speed)
    }
    this.speed = 0
  }

  async changeState(state, error = null) {
    this.state = state

    if (['rapid_success', 'success'].includes(state)) {
      // if (!this.context_ext.isNode) {
      // 成功后释放 HTML5 File 对象，减少内存占用
      this.file = {
        name: this.file.name,
        size: this.file.size,
        path: this.file.path,
        type: this.file.type,
      }
      // }
    }

    if (this.verbose) {
      console.log(`[${this.file.name}] state: ${state} ${error ? `[ERROR]${error.message}` : ''}`)
    }

    const cp = this.getCheckpoint()
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
    // if (['success', 'rapid_success'].includes(this.status)) return
    if (!['waiting', 'error', 'stopped', 'cancelled'].includes(this.state)) return

    // 防止多次调用 start()
    this.changeState('start')
    await this.doStart()
  }
  async doStart() {
    this.stopFlag = false
    this.cancelFlag = false

    try {
      // 上传流程，可以被抛出的异常阻断
      await this.run()
    } catch (e) {
      if (this.stopFlag || this.cancelFlag) {
        // 忽略
        return
      }
      console.debug('上传文件失败:', `[${this.file.name}]`, e)
      await this.handleError(e)
    }
  }

  async run() {
    // 限制文件大小
    let max_size_limit = parseInt(this.max_file_size_limit)
    if (max_size_limit && this.file.size > max_size_limit) {
      throw new PDSError(`File size exceeds limit: ${formatSize(max_size_limit)}`, 'FileSizeExceedUploadLimit')
    }

    // 允许文件类型
    if (!checkAllowExtName(this.file_ext_list_limit, this.file.name)) {
      throw new PDSError(`File extention is invalid`, 'FileExtentionIsInvalid')
    }

    if (!this.start_time) {
      this.start_time = Date.now()
      this.timeLogStart('task', this.start_time)
    }

    // 上次暂停前，已经秒传过
    if (this.rapid_upload) {
      this.end_time = new Date()
      return await this.changeState('rapid_success')
    }

    // 1. 启动异步 worker, 计算 crc64
    this.startCrc64Worker()

    // 如果有此项，说明已经 调用成功 complete 接口
    if (!this.crc64_hash) {
      try {
        // mock
        this.mockErrorBeforeCreate()

        // 2.初始化分片信息
        if (!this.part_info_list || this.part_info_list.length === 0) {
          // 初始化分片信息
          if (this.upload_id) {
            // 之前上传过，有进度，从服务端获取进度
            const parts = await this.listAllUploadedParts()
            this.initChunks(parts)
          } else {
            this.initChunks()
          }
        }

        // 3. 获取 upload urls， 如果还没创建，先创建（创建过程包含 获取 upload urls）
        if (!this.upload_id) {
          let isRapidSuccess = await this.prepareAndCreate()

          if (isRapidSuccess) {
            this.end_time = Date.now()
            this.timeLogEnd('task', Date.now())

            this.loaded = this.file.size

            await this.changeState('rapid_success')

            if (this.verbose) {
              console.log(
                `%c${this.file.name} (size:${this.file.size}) 秒传成功,耗时:${this.end_time - this.start_time}ms`,
                'background:green;color:white;padding:2px 4px;',
              )
              this.printTimeLogs()
            }

            // 秒传成功，终止
            return
          }
        } else {
          // 获取 upload_url
          try {
            await this.getUploadUrl()
          } catch (e) {
            if (e.code === 'AlreadyExist.File') {
              // 调用 create，秒传成功，还没来得及返回，但是点了暂停。 下次再 getUploadUrl 会报这个错
              this.end_time = Date.now()
              this.timeLogEnd('task', Date.now())

              this.loaded = this.file.size

              await this.changeState('rapid_success')

              if (this.verbose) {
                console.log(
                  `%c${this.file.name} (size:${this.file.size}) 秒传成功,耗时:${this.end_time - this.start_time}ms`,
                  'background:green;color:white;padding:2px 4px;',
                )
                this.printTimeLogs()
              }

              // 秒传成功，终止
              return
            } else throw e
          }
        }

        if (this.cancelFlag) {
          if (this.state != 'cancelled') await this.changeState('cancelled')
          return
        }
        // fix created 状态无法 stopped
        if (this.stopFlag) {
          if (this.state != 'stopped') await this.changeState('stopped')
          return
        }

        this.upload_start_time = Date.now()
        this.timeLogStart('upload', Date.now())

        await this.changeState('running')

        this.startCalcSpeed()

        // 4. 分片上传
        await this.upload()

        this.stopCalcSpeed()

        // 5. 统计平均网速和总上传时长
        this.calcTotalAvgSpeed()

        this.timeLogEnd('upload', Date.now())

        // 6. 分片上传完成，调接口 complete
        await this.complete()

        // mock
        this.mockErrorAfterComplete()
      } catch (e) {
        if (e.code !== 'stopped' && e.message !== 'stopped') {
          console.warn(e)
        }

        // 调用了 complete 成功，但是还没来得及存 checkpoint. 下次再调 listAllUploadedParts， 或者 getUploadUrl 等，会报错
        if (e.code == 'NotFound.UploadId' || e.code?.startsWith?.('NotFound.UploadId')) {
          // 为了排除未完成的 upload ID 被回收，再 getFile 查询一下，如果在的话，就说明上次上传成功了
          try {
            await this.getFile()
          } catch (e2) {
            console.warn(e2)
            // 如果只有上传权限，没有 getFile 权限，403 认为成功了。TODO：在被回收的情况会有问题，几率较小
            if (e2.status !== 403) throw e
          }
        } else if (e.message == 'refuse') {
          if (!this.check_name_mode_refuse_ignore_error) {
            // throw AlreadyExists error
            throw new PDSError('A file with the same name already exists', 'AlreadyExists')
          } else {
            // check_name_mode 为 refuse，也算成功。
            if (this.verbose) {
              console.log(`${this.file.name} 发现同名文件（check_name_mode==refuse）, 忽略。`)
            }
          }
        } else if (e.message == 'skip') {
          this.is_skip = true
          if (this.verbose) {
            console.log(`${this.file.name} 发现同名文件（check_name_mode==skip）, 忽略。`)
          }
          throw new PDSError('A file with the same name already exists', 'AlreadyExists')
        } else {
          throw e
        }
      }
    }

    this.end_time = Date.now()
    this.timeLogEnd('task', Date.now())

    // 7. 修改状态成功
    await this.changeState('success')

    if (this.verbose) {
      console.log(
        `%c${this.file.name} (size:${this.file.size}) 上传成功,耗时:${this.end_time - this.start_time}ms`,
        'background:green;color:white;padding:2px 4px;',
      )
      this.printTimeLogs()

      console.log(
        `avg speed: ${formatSize(this.used_avg_speed)}/s, elapsed: ${elapse(this.end_time - this.start_time)}`,
      )
    }

    return this
  }

  async startCrc64Worker() {
    this.on_calc_crc_success = false
    this.on_calc_crc_failed = false
    const workerRun = async () => {
      console.debug('start worker: calcFileCRC64')
      try {
        this.calc_crc64 = await this.calcFileCRC64()
        if (this.on_calc_crc_success) this.on_calc_crc_success(this.calc_crc64)
      } catch (e) {
        if (e.message == 'stopped' || e.code == 'stopped') return
        if (this.on_calc_crc_failed) this.on_calc_crc_failed(new PDSError(e.message))
      }
    }
    if (this.checking_crc && !this.calc_crc64) {
      workerRun()
    }
  }

  async create() {
    return await this.vendors.http_util.callRetry(this.doCreate, this, [], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }
  /* istanbul ignore next */
  async getUploadUrl() {
    return await this.vendors.http_util.callRetry(this.doGetUploadUrl, this, [], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }
  /* istanbul ignore next */
  async complete() {
    return await this.vendors.http_util.callRetry(this.doComplete, this, [], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }
  /* istanbul ignore next */
  async getFile() {
    return await this.vendors.http_util.callRetry(this.doGetFile, this, [], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }

  async http_client_call(action, opt, options = {}, retry = 3, retry2 = 50) {
    const _key = options.key || Math.random().toString(36).substring(2)
    delete options.key
    this.timeLogStart(action + '-' + _key, Date.now())

    const useShareToken = !['axiosUploadPart'].includes(action)
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

  async doGetFile() {
    let info = await this.http_client_call(
      'getFile',
      {
        drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
        share_id: this.loc_type == 'share' ? this.loc_id : undefined,
        file_id: this.file_key,
      },
      this.axios_options,
    )

    // 上传成功
    this.content_hash = info.content_hash
    this.content_hash_name = info.content_hash_name
    this.crc64_hash = info.crc64_hash
    return info
  }

  async doCreate() {
    const parallel_upload = this.parallel_upload
    const opt = {
      name: this.new_name || this.file.name,

      type: 'file', // file folder
      content_type: this.file.type || 'application/octet-stream',
      size: this.file.size,

      drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
      share_id: this.loc_type == 'share' ? this.loc_id : undefined,
      parent_file_id: this.parent_file_key,

      part_info_list: this.part_info_list,

      content_hash_name: this.hash_name, // this.sha1 ? 'sha1' : undefined,
      content_hash: this.hash, //  this.sha1 || undefined,
      pre_hash: this.pre_hash, // this.presha1 || undefined,
      parallel_upload,
    }

    if (this.path_type == 'StandardMode') {
      // 同名策略
      opt.check_name_mode = ['overwrite', 'skip'].includes(this.check_name_mode) ? 'refuse' : this.check_name_mode

      // 多版本支持，传入 file_id
      opt.file_id = this.file_key

      // 标签
      if (this.user_tags && this.user_tags.length > 0) opt.user_tags = this.user_tags
    }

    let result

    try {
      result = await this.http_client_call('createFile', opt, this.axios_options)
    } catch (e) {
      if (e.code === 'InvalidParameterNotSupported.ParallelUpload' && this.parallel_upload) {
        // if (Global) {
        //   Global.shardEnabled = false
        // }
        this.parallel_upload = false
        console.error(e.message)
        return await this.doCreate()
      } else {
        throw e
      }
    }

    // 同名策略
    if (result.exist) {
      // refuse
      if (this.check_name_mode == 'refuse') {
        throw new Error('refuse')
      }
      // skip
      if (this.check_name_mode == 'skip') {
        throw new Error('skip')
      }
      // 覆盖 create
      if (this.check_name_mode == 'overwrite') {
        opt.file_id = result.file_id
        result = await this.http_client_call('createFile', opt, this.axios_options)
      }
    }

    this.upload_id = result.upload_id
    this.file_key = result.file_id
    this.created_file_id = result.file_id

    this.new_name = result.file_name
    ;(result.part_info_list || []).forEach((n, i) => {
      this.part_info_list[i].upload_url = getIfVpcUrl(this.use_vpc, n.upload_url, n.internal_upload_url)
      this.part_info_list[i].content_type = n.content_type || ''
    })

    this.rapid_upload = result.rapid_upload || false

    await this.changeState('created')

    return result
  }
  /* istanbul ignore next */
  async doGetUploadUrl() {
    const result = await this.http_client_call(
      'getFileUploadUrl',
      {
        upload_id: this.upload_id,
        drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
        share_id: this.loc_type == 'share' ? this.loc_id : undefined,
        part_info_list: this.part_info_list.map(n => {
          const checkpoint = {part_number: n.part_number}
          if (n.parallel_sha1_ctx) {
            checkpoint.parallel_sha1_ctx = n.parallel_sha1_ctx
          }
          if (n.parallel_sha256_ctx) {
            checkpoint.parallel_sha256_ctx = n.parallel_sha256_ctx
          }
          return checkpoint
        }),
        file_id: this.file_key,
      },
      this.axios_options,
    )

    result.part_info_list.forEach((n, i) => {
      this.part_info_list[i].upload_url = getIfVpcUrl(this.use_vpc, n.upload_url, n.internal_upload_url)
      this.part_info_list[i].content_type = n.content_type || ''
    })
    return result
  }

  notifyPartCompleted(partInfo) {
    const cp = this.getCheckpoint()
    let part = JSON.parse(JSON.stringify(partInfo))
    delete part.upload_url

    if (typeof this.part_completed === 'function') {
      this.part_completed(cp, part)
    }
    this.emit('partialcomplete', cp, part)
  }

  notifyProgress(state, progress) {
    if (typeof this.progress_changed === 'function') {
      this.progress_changed(state, progress)
    }
    this.emit('progress', state, progress)
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

  async uploadPartRetry(partInfo, opt) {
    return await this.vendors.http_util.callRetry(this.doUploadPart, this, [partInfo, opt], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }

  /* istanbul ignore next */
  async doUploadPart(partInfo, opt) {
    try {
      return await this._axiosUploadPart(partInfo, opt)
    } catch (e) {
      // 文件必须存在，不然就throw
      await this.context_ext.fileMustExists.call(this.context_ext, this.file)

      if (isOssUrlExpired(e)) {
        // upload_url 过期，需要重新获取
        if (this.verbose)
          console.warn(`part-${partInfo.part_number} upload_url 过期，需要重新获取：${partInfo.upload_url}`)
        await this.getUploadUrl()
        // update url
        opt.url = partInfo.upload_url
        if (this.verbose) console.warn(`part-${partInfo.part_number} 重新获取的 upload_url: ${partInfo.upload_url}`)
        return await this.doUploadPart(partInfo, opt)
      } else if (e.message.includes('connect EADDRNOTAVAIL') || e.message.includes('socket hang up')) {
        // OSS 报错 EADDRNOTAVAIL 或 socket hang up
        setTimeout(() => {
          this.retryAllUploadRequest()
        })
        this.message = e.message
        throw new PDSError('stopped', 'stopped')
      } else {
        throw e
      }
    }
  }
  async _axiosUploadPart(partInfo, opt) {
    const {CancelToken} = Axios
    const source = CancelToken.source()
    this.cancelSources.push(source)

    try {
      return await this.http_client_call('axiosUploadPart', {
        ...opt,
        cancelToken: source.token,
        key: partInfo.part_number,
      })
    } catch (e) {
      if (Axios.isCancel(e)) {
        throw new PDSError('stopped', 'stopped')
      } else throw e
    } finally {
      removeItem(this.cancelSources, source)
    }
  }

  /* istanbul ignore next */
  async getUploadPart(part_number) {
    // StandardMode 专用
    const result = await this.listUploadParts(part_number, 1)
    // 只返回一个
    const arr = result.uploaded_parts || []
    return arr.length === 1 ? arr[0] : null
  }
  /* istanbul ignore next */
  async listAllUploadedParts() {
    let part_number = 0
    let arr = []
    do {
      // eslint-disable-next-line no-await-in-loop
      const {next_part_number_marker, uploaded_parts = []} = await this.listUploadParts(part_number, 1000)
      part_number = next_part_number_marker
      arr = arr.concat(uploaded_parts || [])
    } while (part_number)
    return arr
  }
  /* istanbul ignore next */
  async listUploadParts(part_number, limit = 1000) {
    // StandardMode 专用
    return this.vendors.http_util.callRetry(this.doListUploadParts, this, [part_number, limit], {
      verbose: this.verbose,
      getStopFlag: () => {
        return this.stopFlag
      },
    })
  }
  /* istanbul ignore next */
  async doListUploadParts(part_number, limit = 1000) {
    const opt = {
      drive_id: this.loc_type === 'drive' ? this.loc_id : undefined,
      share_id: this.loc_type === 'share' ? this.loc_id : undefined,

      file_id: this.file_key,

      upload_id: this.upload_id,
      limit,
    }
    if (part_number > 1) {
      // part_number_marker==1, 则返回 part_number=2 的
      opt.part_number_marker = part_number - 1
    }
    const result = await this.http_client_call('listFileUploadedParts', opt, this.axios_options)

    return result
  }

  async doComplete() {
    if (this.state == 'complete') return

    const params = {
      drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
      share_id: this.loc_type == 'share' ? this.loc_id : undefined,

      file_id: this.file_key,

      upload_id: this.upload_id,
      // content_type: this.file.type,

      part_info_list: this.part_info_list.map(n => {
        return {
          part_number: n.part_number,
          etag: n.etag,
        }
      }),
    }

    if (this.checking_crc) {
      await this.changeState('checking')

      await this.waitForCrc64()
      // 新版支持 file/complete 时传入 crc64 到服务端校验。
      params.crc64_hash = this.calc_crc64
    }

    const result = await this.http_client_call('completeFile', params, this.axios_options)

    this.content_hash_name = result.content_hash_name
    this.content_hash = result.content_hash
    this.crc64_hash = result.crc64_hash
    // await this.changeState('complete')

    return result
  }
  /* istanbul ignore next */
  async waitForCrc64() {
    if (!this.calc_crc64) {
      this.calc_crc64 = await new Promise((a, b) => {
        this.on_calc_crc_success = result => {
          a(result)
        }
        this.on_calc_crc_failed = e => {
          b(e)
        }
      })
    }
    return this.calc_crc64
  }

  /* istanbul ignore next */
  async calcFileCRC64() {
    this.timeLogStart('crc64', Date.now())

    const timeKey = `crc64[${this.file.name}](${Math.random()}) elapse:`
    if (this.verbose) console.time(timeKey)

    const _crc64_fun = this.custom_crc64_fun || this.context_ext.calcFileCrc64
    let result = await _crc64_fun.call(this.context_ext, {
      file: this.file,
      verbose: this.verbose,
      process_calc_crc64_size: this.process_calc_crc64_size,
      onProgress: progress => {
        this.checking_progress = Math.round(progress) // 0-100
        if (this.state == 'checking') this.notifyProgress(this.state, this.checking_progress)
      },
      getStopFlag: () => {
        return this.stopFlag
      },
      // context: this.context_ext.context,
    })

    if (this.verbose) console.timeLog(timeKey, ` result:`, result)

    this.timeLogEnd('crc64', Date.now())

    return result
  }
  sliceFilePart(partInfo) {
    const start = partInfo.from
    let end = partInfo.to
    return this.context_ext.sliceFile.call(this.context_ext, this.file, start, end)
  }
}
// end
