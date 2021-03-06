/** @format */
import {EventEmitter} from '../utils/EventEmitter'
import {IClientParams, IContext, ITokenInfo, AxiosRequestConfig, TMethod, PathType} from '../Types'

import {PDSError} from '../utils/PDSError'

import Debug from 'debug'
import {isNetworkError} from '../utils/HttpUtil'
const debug = Debug('PDSJS:HttpClient')

export interface IHttpClient {
  context: IContext
  postAPI<T = any>(pathname: string, data?: any, options?: AxiosRequestConfig): Promise<T>
  // postAuth<T = any>(pathname: string, data?: any, options?: AxiosRequestConfig): Promise<T>
}

// emit('error')
export class HttpClient extends EventEmitter implements IHttpClient {
  token_info?: ITokenInfo
  share_token?: string
  api_endpoint?: string
  auth_endpoint?: string
  refresh_token_fun?: () => Promise<ITokenInfo>
  refresh_share_token_fun?: () => Promise<string>
  path_type: PathType
  version: string
  context: IContext
  constructor(params: IClientParams, context: IContext) {
    super()

    this.validateParams(params, context)

    let {
      token_info,
      share_token,
      api_endpoint,
      auth_endpoint,
      refresh_token_fun,
      refresh_share_token_fun,
      path_type = 'StandardMode',
      version = 'v2',
    } = params

    Object.assign(this, {
      token_info,
      share_token,
      api_endpoint,
      auth_endpoint,
      refresh_token_fun,
      refresh_share_token_fun,
      path_type,
      version,
      context,
    })
  }

  validateParams(params: IClientParams, context: IContext) {
    if (!params) {
      throw new PDSError('constructor params is required', 'InvalidParameter')
    }
    if (!context) {
      throw new PDSError('constructor context is required', 'InvalidParameter')
    }
    if (!params.api_endpoint && !params.auth_endpoint) {
      throw new PDSError('api_endpoint or auth_endpoint is required', 'InvalidParameter')
    }

    if (params.token_info) {
      this.validateTokenInfo(params.token_info)
    }

    if (params.refresh_token_fun && typeof params.refresh_token_fun != 'function') {
      throw new PDSError('Invalid refresh_token_fun', 'InvalidParameter')
    }
  }
  validateTokenInfo(tokenInfo: ITokenInfo) {
    if (!tokenInfo || !tokenInfo.access_token) {
      throw new PDSError('token_info.access_token is required', 'InvalidParameter')
    }
    if (tokenInfo.expire_time && isNaN(Date.parse(tokenInfo.expire_time))) {
      throw new PDSError('Invalid token_info.expire_time', 'InvalidParameter')
    }
  }

  setToken(tokenInfo: ITokenInfo) {
    this.validateTokenInfo(tokenInfo)
    this.token_info = tokenInfo
  }
  setShareToken(share_token: string) {
    this.share_token = share_token
  }

  async postAPI<T = any>(pathname: string, data = {}, options: AxiosRequestConfig = {}): Promise<T> {
    return await this.request(this.api_endpoint, 'POST', pathname, data, options)
  }
  async postAuth<T = any>(pathname: string, data = {}, options: AxiosRequestConfig = {}): Promise<T> {
    return await this.request(this.auth_endpoint, 'POST', pathname, data, options)
  }
  async postAPIAnonymous<T = any>(pathname: string, data = {}, options: AxiosRequestConfig = {}): Promise<T> {
    let res = await this.send('POST', getUrl(this.api_endpoint, this.path_type, this.version, pathname), data, options)
    return res.data
  }
  async postAuthAnonymous<T = any>(pathname: string, data = {}, options: AxiosRequestConfig = {}): Promise<T> {
    let res = await this.send('POST', getUrl(this.auth_endpoint, this.path_type, this.version, pathname), data, options)
    return res.data
  }

  protected async send(
    method: TMethod,
    url: string,
    data = {},
    options: AxiosRequestConfig = {},
    retries = 0,
  ): Promise<any> {
    let req_opt: AxiosRequestConfig = {
      method,
      url,
      data,
      ...options,
    }
    try {
      let res = await this.context.Axios(req_opt)
      return res
    } catch (err) {
      debug('send error:', err.response || err)

      let pdsErr = new PDSError(err)

      this.emitError(pdsErr, req_opt)

      if (retries > 0) {
        // ??????????????????
        if (isNetworkError(pdsErr)) {
          // ??????
          return await this.send(method, url, data, options, --retries)
        }
      }
      throw pdsErr
    }
  }

  protected async request(
    endpoint: string,
    method: TMethod,
    pathname: string,
    data: {[key: string]: any} = {},
    options = {},
    retries = 0,
  ): Promise<any> {
    let req_opt: AxiosRequestConfig = {
      method,
      url: getUrl(endpoint, this.path_type, this.version, pathname),
      data,
      ...options,
    }
    debug('request:', JSON.stringify(req_opt))

    req_opt.headers = req_opt.headers || {}

    if (this.share_token) req_opt.headers['x-share-token'] = this.share_token

    let hasShareToken = !!req_opt.headers['x-share-token']

    if (!hasShareToken) {
      await this.checkRefreshToken(req_opt)
      req_opt.headers['Authorization'] = 'Bearer ' + this.token_info.access_token
    }

    try {
      // ????????????
      let response = await this.context.Axios(req_opt)
      debug('response:', response.data)

      return response.data
    } catch (e) {
      debug('request error:', e.response || e)

      let pdsErr = new PDSError(e)

      // ???????????? http error ???emit
      if (
        req_opt.data?.donot_emit_error !== true &&
        !(req_opt.data?.donot_emit_notfound === true && pdsErr.status === 404)
      ) {
        this.emitError(pdsErr, req_opt)
      }

      if (retries > 0) {
        // ??????????????????
        if (isNetworkError(pdsErr)) {
          // ??????
          return await this.request(endpoint, method, pathname, data, options, --retries)
        }
      }

      if (pdsErr.status == 401) {
        // token ??????
        if (!hasShareToken) {
          if (this.refresh_token_fun) {
            await this.customRefreshTokenFun()
            return await this.request(endpoint, method, pathname, data, options, --retries)
          } else {
            throw new PDSError(pdsErr.message, 'TokenExpired')
          }
        } else {
          // share_token ??????
          // code: "ShareLinkTokenInvalid"
          // message: "ShareLinkToken is invalid. expired"
          if (this.refresh_share_token_fun) {
            this.share_token = await this.refresh_share_token_fun()
            return await this.request(endpoint, method, pathname, data, options, --retries)
          }
        }
      }

      throw pdsErr
    }
  }

  /* istanbul ignore next */
  async checkRefreshToken(req_opt: AxiosRequestConfig) {
    if (!this.token_info || !this.token_info.access_token) {
      this.throwError(new PDSError('access_token is required', 'AccessTokenInvalid'), req_opt)
    }
    const expire_time = Date.parse(this.token_info.expire_time)
    if (!isNaN(expire_time) && Date.now() > expire_time) {
      if (this.refresh_token_fun) {
        await this.customRefreshTokenFun()
      } else {
        this.throwError(new PDSError('Invalid expire_time', 'TokenExpired'), req_opt)
      }
    }
  }
  async customRefreshTokenFun(): Promise<ITokenInfo> {
    try {
      //?????????refresh_token??????
      var new_token_info = await this.refresh_token_fun()
      //??????????????????
      this.token_info = new_token_info
      return new_token_info
    } catch (e) {
      throw new PDSError(e)
    }
  }
  emitError(e: PDSError, opt?: AxiosRequestConfig) {
    this.emit('error', e, opt)
  }
  throwError(e: PDSError, opt?: AxiosRequestConfig) {
    this.emitError(e, opt)
    throw e
  }
}

function getUrl(endpoint: string, path_type: PathType, version: string, url: string): string {
  var pre = ''
  if (url.startsWith('/share/list_received')) return `${endpoint}${version ? '/' + version : ''}${url}`

  if (url.startsWith('/file/') || url.startsWith('/share/') || url === '/store_file/list') {
    pre = 'HostingMode' == path_type ? '/hosting' : ''
  }

  if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('//')) return url
  return `${endpoint}${version ? '/' + version : ''}${pre}${url}`
}
