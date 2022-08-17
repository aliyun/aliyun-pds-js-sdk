/** @format */

import {ParallelUploader} from './ParallelUploader'
import {init_chunks_parallel} from '../utils/ChunkUtil'

import Debug from 'debug'
import {throttleInTimes} from '../utils/LoadUtil'
const debug = Debug('PDSJS:StandardParallelUploader')
console.timeLog = console.timeLog || console.timeEnd

export class StandardParallelUploader extends ParallelUploader {
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
    // try{
    // var rapidUploadResult =
    const is_rapid_success = await this.checkRapidUpload()
    if (is_rapid_success) {
      // 秒传成功， 终止job

      // 终止job
      return true
    }
    // } catch (e) {
    //   if (!this.stopFlag) throw e
    // }
  }

  async checkRapidUpload() {
    this.notNeedCalcSha1 = false

    if (this.stopFlag) throw new Error('stopped')

    // 计算秒传和中间值
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

    // 没有预秒传
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

    let _parts_sha1_fun = this.custom_parts_sha1_fun || this.vendors.calc_util.calcFilePartsSha1

    let {part_info_list, content_hash} = await _parts_sha1_fun({
      file,
      verbose: this.verbose,
      process_calc_sha1_size: this.process_calc_sha1_size,
      part_info_list: this.part_info_list,
      onProgress,
      getStopFlagFun,
      context: this.context,
    })
    this.part_info_list = part_info_list

    this.timeLogEnd('multi_sha1', Date.now())
    return content_hash
  }
}
