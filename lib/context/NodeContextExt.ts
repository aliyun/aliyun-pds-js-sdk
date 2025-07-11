import {IncomingMessage} from 'http'
import {ReadStream} from 'fs'
import {platform, os, fs, path, cp, http, https, crypto, AxiosNodeAdapter} from './NodeContext'

import {PDSError} from '../utils/PDSError'
import {
  IContext,
  IContextExt,
  IFile,
  IPDSRequestConfig,
  IDownCheckpoint,
  IUpPartInfo,
  ICalcFileParams,
  THashName,
} from '../Types'
import {fix_filename_4_windows} from '../utils/FileNameUtil'
import {
  calc_hash,
  calc_file_parts_hash,
  calc_file_hash,
  calc_file_crc64,
  get_free_disk_size,
  calc_crc64,
} from './NodeFileUtil'
import pkg from '../pkg'
import {sign as sign_jwt} from '../utils/JWTUtil'
import {TextEncoder} from 'util'

const STREAM_HIGH_WATER_MARK = 512 * 1024 // 512KB

export class NodeContextExt implements IContextExt {
  context: IContext
  constructor(context: IContext) {
    if (!context.isNode) throw new Error('NodeContextExt should not be used in browser')
    context = {
      AxiosNodeAdapter,
      platform,
      fs,
      os,
      path,
      cp,
      crypto,
      https,
      http,
      ...context,
    }
    this.context = context
  }
  signJWT(params, privateKey: string, algorithm: string = 'RS256'): string {
    return sign_jwt(params, privateKey, algorithm)
  }
  async sendOSS(options): Promise<any> {
    try {
      return await this.axiosSend(options)
    } catch (e) {
      throw new PDSError(e as PDSError)
    }
  }
  async axiosSend({xOptions, onDownloadProgress, ...options}: IPDSRequestConfig & {xOptions?: XOptions}) {
    let {Axios, https, AxiosNodeAdapter, fs} = this.context
    try {
      let result = await Axios({
        adapter: AxiosNodeAdapter,
        httpsAgent: new https.Agent({rejectUnauthorized: false}),
        ...options,
        headers: {'pds-js-sdk': pkg.version, ...options?.headers},
      })

      // node 下载 progress 实现
      if (onDownloadProgress && xOptions?.downloadPath) {
        let {start, loaded, total, downloadPath, getStopFlag} = xOptions

        await pipeWS({
          fs,
          stream: result.data,
          block_size: STREAM_HIGH_WATER_MARK,
          onProgress: ({loaded, bytes}) => {
            onDownloadProgress({loaded, bytes, download: true})
          },
          downloadPath: downloadPath,
          start: start || 0,
          loaded: loaded || 0,
          total: total || 0,
          getStopFlag,
        })
      }

      return result
    } catch (e) {
      if (e.message == 'stopped') throw new PDSError('stopped', 'stopped')
      // else if (e.message == 'cancelled') throw new PDSError('cancelled', 'cancelled')

      if (e.response && e.response.data) {
        if (e.response.data instanceof ReadStream) {
          e.response.data = await streamToString(e.response.data)
        }
      }
      throw new PDSError(e)
    }
  }
  parseUploadIFile(file: string | IFile): IFile {
    if (typeof file == 'string') {
      let {size} = this.context.fs.statSync(file)

      return {
        size,
        path: file,
        name: this.context.path.basename(file),
        type: '',
      }
    } else {
      return file
    }
  }
  parseDownloadTo(download_to: string, checkpoint: Partial<IDownCheckpoint>): IFile {
    let p = this.context.path.resolve(download_to)
    let size = checkpoint.file?.size || checkpoint.size || 0
    return {
      type: checkpoint.content_type,
      name: !!download_to ? this.context.path.basename(download_to) : checkpoint.file?.name || checkpoint.name,
      path: p,
      size,
    }
  }

  sliceFile(file: IFile, start: number, end: number) {
    const {fs} = this.context
    end = Math.max(0, end - 1)
    return fs.createReadStream(file.path, {
      start,
      end,
      highWaterMark: STREAM_HIGH_WATER_MARK,
    })
  }
  getByteLength(str: string | ArrayBuffer) {
    if (typeof str == 'string') return new TextEncoder().encode(str).byteLength
    else return str.byteLength
  }

  /* istanbul ignore next */
  fileMustExists(file: IFile) {
    if (!this.context.fs.existsSync(file.path)) {
      new Error('A requested file or directory could not be found')
    }
  }
  async calcCrc64(str: string | Uint8Array, last: string = '0') {
    if (str === undefined || str === null) return last
    return await calc_crc64(this.textEncode(str), last)
  }

  async calcHash(hashName: THashName, str: string | Uint8Array) {
    if (['sha1', 'sha256'].includes(hashName)) {
      return await calc_hash(hashName, this.textEncode(str), this.context)
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
    // 桌面端
    let {hash_name, file, file_path, verbose, pre_size, process_calc_hash_size, onProgress, getStopFlag} = params
    file_path = file_path || file?.path
    hash_name = hash_name || 'sha1'
    pre_size = pre_size || 0

    if (['sha1', 'sha256'].includes(hash_name)) {
      return await calc_file_hash(hash_name, file_path, pre_size, onProgress, getStopFlag, this.context)
    } else throw new PDSError('Invalid hash_name', 'InvalidHashName')
  }
  async calcFilePartsHash(
    params: ICalcFileParams & {
      hash_name?: THashName
      part_info_list?: IUpPartInfo[]
      process_calc_hash_size?: number
    },
  ) {
    let {file, hash_name, file_path, verbose, process_calc_hash_size, part_info_list, onProgress, getStopFlag} = params
    file_path = file_path || file?.path
    hash_name = params.hash_name || 'sha1'
    part_info_list = part_info_list || []

    if (['sha1', 'sha256'].includes(hash_name)) {
      return await calc_file_parts_hash(hash_name, file_path, part_info_list, onProgress, getStopFlag, this.context)
    } else throw new PDSError('Invalid hash_name', 'InvalidHashName')
  }
  async calcFileCrc64(params: ICalcFileParams & {process_calc_crc64_size?: number}) {
    let {file, file_path, verbose, process_calc_crc64_size, onProgress, getStopFlag} = params
    file_path = file_path || file?.path || ''

    return await calc_file_crc64(file_path, onProgress, getStopFlag, this.context)
  }

  /*************************************** */
  // for download
  /*************************************** */

  /* istanbul ignore next */
  async getFreeDiskSize(file_path: string): Promise<number> {
    return await get_free_disk_size(file_path, this.context)
  }
  /* istanbul ignore next */
  fixFileName4Windows(file_path: string): string {
    if (this.context.platform == 'win32') {
      return fix_filename_4_windows(this.context.path.resolve(file_path))
    }
    return file_path
  }
  /* istanbul ignore next */
  async createFile(file_path: string, content: string = '') {
    const {fs} = this.context
    if (fs.existsSync(file_path)) {
      await fs.promises.unlink(file_path)
    }
    await fs.promises.writeFile(file_path, content)
  }
  /* istanbul ignore next */
  async createFileIfNotExists(file_path: string, content: string = '') {
    const {fs} = this.context
    if (!fs.existsSync(file_path)) {
      await fs.promises.writeFile(file_path, content)
    }
  }
  async renameFile(from_path: string, to_path: string) {
    const {fs} = this.context
    await fs.promises.rename(from_path, to_path)
  }
  // async getOSSObjectCrc64(download_url: string): Promise<string> {
  //   const result = await this.axiosSend({
  //     method: 'GET',
  //     headers: {
  //       Range: 'bytes=0-1',
  //     },
  //     url: download_url,
  //   })
  //   return result.headers['x-oss-hash-crc64ecma'] || ''
  // }
}
export interface XOptions {
  start: number
  loaded: number
  total: number
  downloadPath: string
  getStopFlag: () => boolean
}

export function streamToString(stream: any) {
  if (!(stream instanceof ReadStream || stream instanceof IncomingMessage)) return stream
  return new Promise<string>((resolve, reject) => {
    var a = ''
    stream.on('data', chunk => {
      a += chunk
    })
    stream.on('end', () => {
      resolve(a)
    })
    stream.on('error', e => {
      reject(e)
    })
  })
}

export function pipeWS({fs, stream, downloadPath, start, loaded, total, block_size, onProgress, getStopFlag}) {
  let c = 0
  let part_loaded = loaded || 0
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(downloadPath, {
      flags: 'r+',
      start,
    })

    stream.on('data', chunk => {
      if (getStopFlag()) {
        const stopErr = new PDSError('stopped', 'stopped')
        // 流要destroy掉
        stream.destroy(stopErr)
        ws.destroy(stopErr)

        reject(stopErr)
        return
      }

      part_loaded += chunk.byteLength
      c += chunk.byteLength

      if (c >= block_size) {
        c = 0
        onProgress({loaded: part_loaded, bytes: total})
      }
    })

    stream.pipe(ws)

    stream.on('error', e => {
      reject(e)
    })
    ws.on('finish', () => {
      if (part_loaded != total) {
        console.warn('--------------------块下载失败(需重试)', part_loaded, total, 'LengthNotMatchError')

        onProgress({loaded: part_loaded, bytes: total})
        reject(new Error('LengthNotMatchError'))
      } else {
        onProgress({loaded: part_loaded, bytes: total})
        resolve(void 0)
      }
    })
    ws.on('error', e => {
      reject(e)
    })
  })
}
