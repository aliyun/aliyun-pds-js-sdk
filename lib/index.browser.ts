import './fix-browser-env'
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

import {
  calc_crc64,
  calc_file_crc64,
  calc_hash,
  calc_file_hash,
  calc_file_parts_hash,
  calc_sha1,
  calc_sha256,
  calc_file_sha1,
  calc_file_sha256,
  calc_file_parts_sha1,
  calc_file_parts_sha256,
} from './context/BrowserFileUtil'
import {init_chunks_download, init_chunks_parallel, init_chunks_sha} from './utils/ChunkUtil'
import {IClientParams, IContext} from './Types'
import {PDSError} from './utils/PDSError'
export * from './utils/Formatter'
import pkg from './pkg'

const version = pkg.version
console.log('%caliyun-pds-js-sdk@' + version, `${version.includes('-') ? 'color:#ddd' : ''}`)

const CalcUtil = {
  calc_crc64,
  calc_file_crc64,

  calc_hash,
  calc_file_hash,
  calc_file_parts_hash,

  calc_sha1,
  calc_sha256,
  calc_file_sha1,
  calc_file_sha256,
  calc_file_parts_sha1,
  calc_file_parts_sha256,
}
const ChunkUtil = {
  init_chunks_download,
  init_chunks_parallel,
  /**
   * @deprecated please use init_chunks_sha instead
   */
  init_chunks_sha1: init_chunks_sha,
  init_chunks_sha,
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
