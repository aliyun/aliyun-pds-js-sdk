export * from './Types'
export * from './client/api_auth'
export * from './client/api_drive'
export * from './client/api_file'
export * from './client/api_file_permission'
export * from './client/api_file_ext'
export * from './client/api_file_revision'
export * from './client/api_group'
export * from './client/api_membership'
export * from './client/api_role'
export * from './client/api_sharelink'
export * from './client/api_user'
export * from './client/api_x_upload'
export * from './client/api_y_download'

import * as Context from './context/BrowserContext'
import {BrowserContextExt} from './context/BrowserContextExt'
import {PDSDownloadApiClient} from './client/api_y_download'
import {HttpClient as Http_Client} from './http/HttpClient'

import {calc_crc64, calc_sha1, calc_file_sha1, calc_file_parts_sha1, calc_file_crc64} from './context/BrowserFileUtil'
import {init_chunks_download, init_chunks_parallel, init_chunks_sha1} from './utils/ChunkUtil'
import {IClientParams, IContext} from './Types'
import {PDSError} from './utils/PDSError'
// import * as ChunkUtil from './utils/ChunkUtil'
// import * as JS_CRC64 from './utils/JS_CRC64'
// import * as JS_SHA1 from './utils/JS_SHA1'
export * from './utils/Formatter'
import pkg from './pkg'

const version = pkg.version
console.log('%caliyun-pds-js-sdk@' + version, `${version.includes('-') ? 'color:#ddd' : ''}`)

const CalcUtil = {
  calc_crc64,
  calc_sha1,
  calc_file_sha1, // 串行
  calc_file_parts_sha1, // 并行，按part计算中间值
  calc_file_crc64,
}
const ChunkUtil = {
  init_chunks_download,
  init_chunks_parallel,
  init_chunks_sha1,
}
class PDSClient extends PDSDownloadApiClient {
  constructor(opt: IClientParams, ctx: IContext = Context) {
    super(opt, new BrowserContextExt(ctx))
  }
}
class HttpClient extends Http_Client {
  constructor(opt: IClientParams, ctx: IContext = Context) {
    super(opt, new BrowserContextExt(ctx))
  }
}
// for browser
export {version, PDSClient, HttpClient, PDSError, Context, BrowserContextExt, CalcUtil, ChunkUtil}
