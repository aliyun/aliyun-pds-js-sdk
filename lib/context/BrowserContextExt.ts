import {IContext, IFile, ICalcFileParams, IUpPartInfo, IContextExt, IDownCheckpoint, THashName} from '../Types'
import {PDSError} from '../utils/PDSError'
import {
  // sha1, sha256
  calc_hash,
  calc_file_parts_hash,
  calc_file_hash,
  // crc64
  calc_crc64,
  calc_file_crc64,
} from './BrowserFileUtil'

import {slice_file, does_file_exist} from '../utils/BrowserFileReaderUtil'

import {basename} from '../utils/PathUtil'

export class BrowserContextExt implements IContextExt {
  context: IContext
  constructor(context: IContext) {
    if (context.isNode) throw new Error('BrowserContextExt should not be used in node')
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
      name: !!download_to ? basename(download_to) : checkpoint.file?.name || checkpoint.name || 'unknown',
      path: download_to,
      size: checkpoint.file?.size || checkpoint.size || 0,
    }
    return file
  }
  async calcCrc64(str: string | Uint8Array, last: string = '0') {
    if (str === undefined || str === null) return last
    return await calc_crc64(this.textEncode(str), last)
  }

  async calcHash(hashName: THashName, str: string | Uint8Array) {
    if (['sha1', 'sha256'].includes(hashName)) {
      return await calc_hash(hashName, this.textEncode(str))
    } else {
      throw new PDSError('Invalid hash_name', 'InvalidHashName')
    }
  }
  textEncode(str: string | Uint8Array): Uint8Array {
    if (typeof str == 'string') {
      str = new TextEncoder().encode(str)
    }
    return str
  }
  async calcFileHash(
    params: ICalcFileParams & {
      hash_name?: THashName
      pre_size?: number
      process_calc_hash_size?: number
    },
  ) {
    let {file, hash_name, pre_size, onProgress, getStopFlag} = params
    hash_name = params.hash_name || 'sha1'
    pre_size = pre_size || 0

    if (['sha1', 'sha256'].includes(hash_name)) {
      return await calc_file_hash(hash_name, file, pre_size, onProgress, getStopFlag)
    } else throw new PDSError('Invalid hash_name', 'InvalidHashName')
  }
  async calcFilePartsHash(
    params: ICalcFileParams & {
      hash_name?: THashName
      part_info_list?: IUpPartInfo[]
      process_calc_hash_size?: number
    },
  ) {
    let {file, hash_name, part_info_list, onProgress, getStopFlag} = params
    hash_name = params.hash_name || 'sha1'
    part_info_list = part_info_list || []

    if (['sha1', 'sha256'].includes(hash_name)) {
      return await calc_file_parts_hash(hash_name, file, part_info_list, onProgress, getStopFlag)
    } else throw new PDSError('Invalid hash_name', 'InvalidHashName')
  }

  async calcFileCrc64(params: ICalcFileParams) {
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
