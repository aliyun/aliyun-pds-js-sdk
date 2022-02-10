/** @format */
export * from './Types'
export * from './client/api_auth'
export * from './client/api_drive'
export * from './client/api_file'
export * from './client/api_group'
export * from './client/api_membership'
export * from './client/api_role'
export * from './client/api_share'
export * from './client/api_sharelink'
export * from './client/api_store'
export * from './client/api_user'

export * from './client/FileLoaderClient'

import * as Context from './context/NodeContext'

import {PDSClient as _PDSClient} from './client/PDSClient'
import {HttpClient as _HttpClient} from './http/HttpClient'
import {IClientParams, IContext} from './Types'
import {PDSError} from './utils/PDSError'
import * as ChunkUtil from './utils/ChunkUtil'
import * as JS_CRC64 from './utils/JS_CRC64'
import * as JS_SHA1 from './utils/JS_SHA1'
export * from './utils/Formatter'

class PDSClient extends _PDSClient {
  constructor(opt: IClientParams, ctx: IContext = Context) {
    super(opt, ctx)
  }
}
class HttpClient extends _HttpClient {
  constructor(opt: IClientParams, ctx: IContext = Context) {
    super(opt, ctx)
  }
}
// for node.js
export {PDSClient, HttpClient, PDSError, JS_CRC64, JS_SHA1, ChunkUtil, Context}
