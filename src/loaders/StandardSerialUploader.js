/** @format */

import {BaseUploader} from './BaseUploader'
import {calc_uploaded, init_chunks_sha1} from '../utils/ChunkUtil'
import {throttleInTimes} from '../utils/LoadUtil'
import {isNetworkError} from '../utils/HttpUtil'
import Debug from 'debug'
const debug = Debug('PDSJS:StandardSerialUploader')
console.timeLog = console.timeLog || console.timeEnd

// const MAX_SIZE_FOR_SHA1 = 10 * 1024 * 1024 * 1024 // 10GB
// const MIN_SIZE_FOR_PRE_SHA1 = 100 * 1024 * 1024 // 100MB

export class StandardSerialUploader extends BaseUploader {
  /**
   * 标准模式 sha1 分片 串行上传
   * @param parts
   */
  initChunks(parts = []) {
    debug('initChunks:', 'from parts[' + parts.length + ']')

    let [part_info_list, chunk_size] = init_chunks_sha1(this.file.size, parts, this.chunk_size || this.max_chunk_size)

    this.part_info_list = part_info_list
    this.chunk_size = chunk_size
  }

  async prepareAndCreate() {
    // if (!this.ignore_rapid && this.file.size < this.max_size_for_sha1) {
    if (!this.ignore_rapid) {
      // 计算sha1，秒传
      try {
        // var rapidUploadResult =
        const is_rapid_success = await this.checkRapidUpload()
        if (is_rapid_success) {
          // 秒传成功， 终止job

          // fix 暂停后，重新启动。
          // this.end_time = Date.now()
          // this.loaded = this.file.size
          // await this.changeState('rapid_success')

          // 终止job
          return true
        }
      } catch (e) {
        if (!this.stopFlag) throw e
      }
    } else {
      // 直接create
      try {
        await this.create()
        return false
      } catch (e) {
        if (!this.stopFlag) throw e
      }
    }
  }

  async checkRapidUpload() {
    this.notNeedCalcSha1 = false
    if (this.file.size > this.min_size_for_pre_sha1) {
      // 大于 100MB， 预秒传。 （小于100MB直接秒传）
      await this.changeState('computing_hash')

      const logKey = `计算预秒传 ${this.file.name} (size:${this.file.size}) ${Math.random()}`
      if (this.verbose) console.time(logKey)

      const sha1 = await this.calcSha1(this.file, 1024)

      if (this.verbose) console.timeLog(logKey, ' result:', sha1)
      this.presha1 = sha1

      if (this.stopFlag) throw new Error('stopped')

      try {
        await this.create()

        // 不用算sha1了, 直接upload
        this.notNeedCalcSha1 = true
        // this.changeState('running')
      } catch (e) {
        // if (e.status == 409) {
        if (e.status == 409) {
          // match ，再算sha1
          this.notNeedCalcSha1 = false
        } else {
          throw e
          // return this.handlerError(e || new Error('create failed:' + this.file.name))
        }
      }
    }

    if (this.stopFlag) throw new Error('stopped')

    // 秒传
    if (!this.notNeedCalcSha1) {
      await this.changeState('computing_hash')

      const logKey = `计算秒传 ${this.file.name} (size:${this.file.size}) ${Math.random()}`
      if (this.verbose) {
        console.time(logKey)
      }

      let throttleFn = throttleInTimes(
        fn => {
          fn()
        },
        10,
        100,
      )

      const sha1 = await this.calcSha1(
        this.file,
        null, // pre_size
        progress => {
          throttleFn(() => {
            // progress
            this.sha1_progress = Math.round(progress) // 0-100
            if (this.state == 'computing_hash') this.notifyProgress(this.state, this.sha1_progress)
          })
        },
        () => {
          return this.stopFlag
        },
      )

      if (this.verbose) {
        console.timeLog(logKey, ' result:', sha1)
      }
      this.sha1 = sha1
      this.presha1 = undefined

      /// ///////////////////////////////

      if (this.stopFlag) throw new Error('stopped')
      await this.create()

      // 秒传成功
      if (this.rapid_upload) {
        return true // 终止job
      }
      /// ///////////////////////////////
    }
  }

  async calcSha1(file, pre_size, onProgress = () => {}, getStopFlagFun = () => {}) {
    this.timeLogStart(pre_size ? 'pre_sha1' : 'sha1', Date.now())

    let _sha1_fun = this.custom_sha1_fun || this.vendors.calc_util.calcFileSha1
    let result = await _sha1_fun({
      file,
      verbose: this.verbose,
      pre_size,
      process_calc_sha1_size: this.process_calc_sha1_size,
      onProgress,
      getStopFlagFun,
      context: this.context,
    })

    this.timeLogEnd(pre_size ? 'pre_sha1' : 'sha1', Date.now())

    return result
  }
  async upload() {
    return await this.upload_sequential()
  }

  getNextPart() {
    for (const n of this.part_info_list) {
      if (!n.etag && !n.running) return n
    }
    return null
  }

  // 串行上传
  async upload_sequential() {
    this.done_part_loaded = calc_uploaded(this.part_info_list)
    this.start_done_part_loaded = this.done_part_loaded // 用于计算平均速度
    this.loaded = this.done_part_loaded
    let last_opt = {last_prog: 0}

    // 串行
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let partInfo = this.getNextPart()
      if (!partInfo) return

      if (this.stopFlag) {
        throw new Error('stopped')
      }
      try {
        partInfo.start_time = Date.now()
        this.timeLogStart('part-' + partInfo.part_number, Date.now())
        partInfo.running = true

        const reqHeaders = {
          'Content-Type': '',
        }

        if (this.context.isNode) {
          // 浏览器由于安全限制无法设置 Content-Length,  node.js 可以的
          reqHeaders['Content-Length'] = partInfo.part_size
        }

        // if(this.verbose) console.log(`[${this.file.name}] upload part_number:`, partInfo.part_number, partInfo.from,'~', partInfo.to)
        let keep_part_loaded = 0

        // eslint-disable-next-line no-await-in-loop
        const result = await this.uploadPartRetry(partInfo, {
          method: 'put',
          url: partInfo.upload_url,
          headers: reqHeaders,
          maxContentLength: Infinity,
          maxRedirects: 5,
          data: this.sliceFile(partInfo),
          onUploadProgress: ({loaded}) => {
            keep_part_loaded = loaded
            this.loaded = this.done_part_loaded + loaded || 0

            this.updateProgressStep(last_opt)
          },
        })

        if (this.file.size == 0) {
          // fix size=0 的情况
          this.progress = 100
          this.notifyProgress(this.state, this.progress)
        }

        if ((keep_part_loaded || 0) != partInfo.part_size) {
          console.warn('--------------------块上传失败(需重试)', keep_part_loaded, partInfo.part_size)
          continue
        }

        partInfo.etag = result.headers.etag
        if (!partInfo.etag) {
          console.error('Not found etag, res.headers:', result.headers)
          throw new Error('请确定Bucket是否配置了正确的跨域设置')
        }

        this.done_part_loaded += partInfo.part_size

        // this.uploadResult = result;
        delete partInfo.running
        partInfo.end_time = Date.now()
        this.timeLogEnd('part-' + partInfo.part_number, Date.now())

        if (this.verbose) {
          console.log(
            `[${this.file.name}] upload part[${partInfo.part_number}/${this.part_info_list.length}] complete, elapse:${
              partInfo.end_time - partInfo.start_time
            }ms`,
          )
        }

        this.notifyPartCompleted(partInfo)
      } catch (e) {
        if (e.response) {
          if (e.response.status == 409) {
            // 由于浏览器无法设置 content-length, 有可能已经上传成功了一部分，返回409
            // 处理该 part 未完成部分，放到下一片
            await this.fix409(partInfo)
            continue
          } else if (e.response.status == 400 && e.response.code == 'PartNotSequential') {
            // 浏览器端上传会遇到此问题，重试
            console.warn(
              `upload part ${partInfo.part_number} error: ${e.response.code}: ${e.response.message}, retry..`,
            )
            continue
          } else if (e.response.status == 504 || isNetworkError(e)) {
            // 海外连国内，可能会504
            // 重试当前片
            continue
          }
        }

        throw e
      }
    }
  }

  async fix409(partInfo) {
    // 假设第3片上传失败  partInfo.part_number == 3
    // 第3片本来要上传10MB，但是上传了6MB，网络断了，服务端认为本片完成。客户端没有etag，认为没完成。
    // 客户端重复上传第3片，报409 已经存在。进入此方法。
    //* ********************** */
    console.warn('fix upload part for 409 error', partInfo.part_number)

    // 向服务端查询本片的 etag （6MB）
    const up_part = await this.getUploadPart(partInfo.part_number)
    if (!up_part) return
    if (!up_part.etag) return

    /*
    up_part 样例：
    { content_type: "",
      etag: "\"F2A43A97777D22FC44186B46777469C9\"",
      internal_upload_form_info: null,
      internal_upload_url: "",
      part_number: 1,
      part_size: 10485824,
      upload_form_info: null,
      upload_url: "" 
    }
    */

    const part_info = this.part_info_list[partInfo.part_number - 1] // 和传入的变量 partInfo 应该引用一样的。
    // assert part_info.etag == null
    part_info.etag = up_part.etag

    delete partInfo.running
    partInfo.end_time = Date.now()
    this.timeLogEnd('part-' + partInfo.part_number, Date.now())

    // fix done_part_loaded
    this.done_part_loaded += up_part.part_size

    const p_size = part_info.part_size - up_part.part_size
    if (p_size > 0) {
      // 提前完成，后半部放到下一片中
      console.warn(`part [${part_info.part_number}](${part_info.part_size}-${p_size}) 提前完成，后半部放到下一片中..`)

      // 修复本片
      part_info.part_size = up_part.part_size
      part_info.to = part_info.from + part_info.part_size

      // 修复下一片

      // 判断是否是最后一片
      if (partInfo.part_number == this.part_info_list.length) {
        // 是最后一片，再增加一片
        this.part_info_list[partInfo.part_number] = {
          part_number: partInfo.part_number + 1,
          from: part_info.to + 1,
          part_size: p_size,
          to: this.file.size,
        }
        await this.getUploadUrl()
      } else {
        // 不是最后一片，放到下一片
        const next_part_info = this.part_info_list[partInfo.part_number]
        next_part_info.part_size += p_size
        next_part_info.from -= p_size
        delete next_part_info.running
      }
    }

    // 事件
    this.notifyPartCompleted(part_info)
  }
}
