/** @format */

import {BaseUploader} from './BaseUploader'
import {init_chunks_parallel} from '../utils/ChunkUtil'

import Debug from 'debug'
const debug = Debug('PDSJS:HostingUploader')

export class HostingUploader extends BaseUploader {
  /**
   * 托管模式 分片
   *   并行上传
   *
   * @param parts
   *
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
    debug('start creating...')
    // 直接 create
    await this.create()
    // 没有秒传，返回false
    return false
  }

  // 并发上传
  async upload() {
    debug('start uploading...')
    return await this.upload_parallel()
  }
}
