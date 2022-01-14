/** @format */

import {BaseUploader} from './BaseUploader'
import {init_chunks_parallel} from '../utils/ChunkUtil'

import Debug from 'debug'
import {throttleInTimes} from '../utils/LoadUtil'
const debug = Debug('PDSJS:StandardParallelUploader')

export class StandardParallelUploader extends BaseUploader {
  /**
   * 标准模式 多分片 并行分片
   * @param parts
   */
  initChunks(parts = []) {
    debug('initChunks:', 'from parts[' + parts.length + ']')

    let [part_info_list, chunk_size] = init_chunks_parallel(
      this.file.size,
      parts,
      this.chunk_size || this.max_chunk_size,
    )

    this.part_info_list = part_info_list
    this.chunk_size = chunk_size
  }

  async prepareAndCreate() {
    try {
      // var rapidUploadResult =
      const is_rapid_success = await this.checkRapidUpload()
      if (is_rapid_success) {
        // 秒传成功， 终止job

        // 终止job
        return true
      }
    } catch (e) {
      if (!this.stopFlag) throw e
    }
  }

  async checkRapidUpload() {
    this.notNeedCalcSha1 = false
    // 计算秒传
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

    const sha1 = await this.calcHash(
      this.file,
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

    // 不秒传
    if (!this.ignore_rapid) this.sha1 = sha1
    this.presha1 = undefined

    if (this.stopFlag) throw new Error('stopped')

    await this.create()

    // 秒传成功
    if (this.rapid_upload) {
      return true // 终止job
    }
  }

  async calcHash(file, onProgress = () => {}, getStopFlagFun = () => {}) {
    this.timeLogStart('multi_sha1', Date.now())
    if (this.context.isNode) {
      // 桌面端
      let _multi_sha1_fun = this.custom_multi_sha1_fun || this.vendors.file_util.js_sha1_multi_node
      let {part_info_list, content_hash} = await _multi_sha1_fun({
        file,
        part_info_list: this.part_info_list,
        onProgress,
        getStopFlagFun,
        context: this.context,
      })
      this.part_info_list = part_info_list

      this.timeLogEnd('multi_sha1', Date.now())
      return content_hash
    } else {
      // 浏览器
      let _multi_sha1_fun = this.custom_multi_sha1_fun || this.vendors.file_util.js_sha1_multi

      let {part_info_list, content_hash} = await _multi_sha1_fun({
        file,
        part_info_list: this.part_info_list,
        onProgress,
        getStopFlagFun,
        // context: {}, // this.context
      })
      this.part_info_list = part_info_list

      this.timeLogEnd('multi_sha1', Date.now())
      return content_hash
    }
  }

  async upload() {
    return await this.upload_parallel()
  }
}
