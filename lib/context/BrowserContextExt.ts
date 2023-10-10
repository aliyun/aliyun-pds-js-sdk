import {IContext, IFile, ICalcFileParams, IUpPartInfo, IContextExt, IDownCheckpoint} from '../Types'
import {PDSError} from '../utils/PDSError'
import {
  calc_crc64,
  calc_sha1,
  calc_file_parts_sha1,
  calc_file_sha1,
  calc_file_crc64,
  slice_file,
  does_file_exist,
} from './BrowserFileUtil'

import {basename} from '../utils/PathUtil'

// import pkg from '../pkg'

// import {sign as sign_jwt} from 'jsonwebtoken'
// import {TextEncoder} from 'util'

export class BrowserContextExt implements IContextExt {
  context: IContext
  constructor(context: IContext) {
    this.context = context
  }
  /* istanbul ignore next */
  signJWT(params, privateKey, algorithm): string {
    throw new PDSError('The signJWT method can only be used in node.js')
    // return sign_jwt(params, privateKey, options)
  }
  async sendOSS(options) {
    try {
      return await this.axiosSend(options)
    } catch (e) {
      throw new PDSError(e)
    }
  }
  async axiosSend(options) {
    let {Axios} = this.context
    try {
      return await Axios({
        ...options,

        // 没法设置 Error: Headers x-pds-js-sdk forbidden
        // headers: {'x-pds-js-sdk': pkg.version, ...options?.headers},
      })
    } catch (e) {
      if (e.message == 'stopped') throw new PDSError('stopped', 'stopped')
      // else if (e.message == 'cancelled') throw new PDSError('cancelled', 'cancelled')
      else throw new PDSError(e)
    }
  }
  parseUploadIFile(file: IFile): IFile {
    return file
  }
  parseDownloadTo(download_to: string, checkpoint: Partial<IDownCheckpoint>): IFile {
    let file: IFile = {
      name: download_to ? basename(download_to) : checkpoint.file?.name || 'unknown',
      path: download_to,
      size: checkpoint.file?.size || checkpoint.size || 0,
    }
    return file
  }
  calcCrc64(str: string | Uint8Array, last: string = '0') {
    return calc_crc64(this.textEncode(str), last)
  }
  calcSha1(str: string | Uint8Array) {
    return calc_sha1(this.textEncode(str))
  }
  textEncode(str: string | Uint8Array): Uint8Array {
    if (typeof str == 'string') {
      str = new TextEncoder().encode(str)
    }
    return str
  }
  async calcFileSha1(
    params: ICalcFileParams & {
      pre_size?: number
      process_calc_sha1_size: number
    },
  ) {
    let {file, pre_size, onProgress, getStopFlag} = params
    return await calc_file_sha1(file, pre_size || 0, onProgress, getStopFlag)
  }
  async calcFilePartsSha1(
    params: ICalcFileParams & {
      part_info_list: IUpPartInfo[]
      process_calc_sha1_size: number
    },
  ) {
    let {file, part_info_list, onProgress, getStopFlag} = params
    return await calc_file_parts_sha1(file, part_info_list || [], onProgress, getStopFlag)
  }

  async calcFileCrc64(
    params: ICalcFileParams & {
      part_info_list: IUpPartInfo[]
      process_calc_sha1_size: number
    },
  ) {
    let {file, onProgress, getStopFlag} = params
    return await calc_file_crc64(file, onProgress, getStopFlag)
  }
  /* istanbul ignore next */
  async fileMustExists(file: IFile): Promise<boolean> {
    return await does_file_exist(file)
  }
  sliceFile(file: IFile, start: number, end: number) {
    return slice_file(file, start, end)
  }
  getByteLength(str: string | ArrayBuffer) {
    if (typeof str == 'string') return new TextEncoder().encode(str).byteLength
    else return str.byteLength
  }

  // for downloads
  /* istanbul ignore next */
  getFreeDiskSize(file_path: string): Promise<number> {
    throw new Error('Method not implemented.')
  }
  /* istanbul ignore next */
  fixFileName4Windows(file_path: string): string {
    return file_path
  }
  /* istanbul ignore next */
  createFile(file_path: string, content: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  /* istanbul ignore next */
  createFileIfNotExists(file_path: string, content: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  /* istanbul ignore next */
  renameFile(from_path: string, to_path: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
