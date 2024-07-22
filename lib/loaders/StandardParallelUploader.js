import {ParallelUploader} from './ParallelUploader'
import {init_chunks_parallel} from '../utils/ChunkUtil'
import {throttleInTimes} from '../utils/LoadUtil'
import {PDSError} from '../utils/PDSError'

console.timeLog = console.timeLog || console.timeEnd

export class StandardParallelUploader extends ParallelUploader {
  /**
   * 标准模式 多分片 并行分片
   * @param parts
   */
  initChunks(parts = []) {
    console.debug('initChunks:', 'from parts[' + parts.length + ']')

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
    this.notNeedCalcHash = false

    if (this.stopFlag) throw new PDSError('stopped', 'stopped')

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

    const hash = await this.calcFileHash(
      this.file,
      progress => {
        throttleFn(() => {
          // progress
          this.hash_progress = Math.round(progress) // 0-100
          if (this.state == 'computing_hash') this.notifyProgress(this.state, this.hash_progress)
        })
      },
      () => {
        return this.stopFlag
      },
    )

    if (this.verbose) {
      console.timeLog(logKey, ' result:', hash)
    }

    // 不秒传
    if (!this.ignore_rapid) this.hash = hash

    // 没有预秒传
    this.pre_hash = undefined

    if (this.stopFlag) throw new PDSError('stopped', 'stopped')

    await this.create()

    // 秒传成功
    if (this.rapid_upload) {
      return true // 终止job
    }
  }

  async calcFileHash(file, onProgress = () => {}, getStopFlag = () => {}) {
    this.timeLogStart('multi_hash', Date.now())

    let _parts_hash_fun = this.custom_parts_hash_fun || this.context_ext.calcFilePartsHash

    let {part_info_list, content_hash} = await _parts_hash_fun.call(this.context_ext, {
      file,
      hash_name: this.hash_name,
      verbose: this.verbose,
      process_calc_hash_size: this.process_calc_hash_size,
      part_info_list: this.part_info_list,
      onProgress,
      getStopFlag,
      // context: this.context_ext.context,
    })
    this.part_info_list = part_info_list

    this.timeLogEnd('multi_hash', Date.now())
    return content_hash
  }
}
