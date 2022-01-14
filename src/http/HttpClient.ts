/** @format */
import {EventEmitter} from '../utils/EventEmitter'
import {IClientParams, IContext, ITokenInfo, AxiosRequestConfig, Method, PathType} from '../Types'

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
  api_endpoint: string
  auth_endpoint?: string
  refresh_token_fun?: () => Promise<ITokenInfo>
  path_type: PathType
  version: string
  context: IContext
  constructor(params: IClientParams, context: IContext) {
    super()

    this.validateParams(params, context)

    let {
      token_info,
      api_endpoint,
      auth_endpoint,
      refresh_token_fun,
      path_type = 'StandardMode',
      version = 'v2',
    } = params

    Object.assign(this, {
      token_info,
      api_endpoint,
      auth_endpoint,
      refresh_token_fun,
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
    if (!params.api_endpoint) {
      throw new PDSError('api_endpoint is required', 'InvalidParameter')
    }
    if (!params.auth_endpoint) {
      throw new PDSError('auth_endpoint is required', 'InvalidParameter')
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
      throw new PDSError('access_token is required', 'InvalidParameter')
    }
    if (tokenInfo.expire_time && Date.parse(tokenInfo.expire_time) < Date.now()) {
      throw new PDSError('Token expired', 'TokenExpired')
    }
  }

  setToken(tokenInfo: ITokenInfo) {
    this.validateTokenInfo(tokenInfo)
    this.token_info = tokenInfo
  }

  async postAPI<T = any>(pathname: string, data = {}, options: AxiosRequestConfig = {}): Promise<T> {
    return await this.request(this.api_endpoint, Method.POST, pathname, data, options)
  }
  async postAuth<T = any>(pathname: string, data = {}, options: AxiosRequestConfig = {}): Promise<T> {
    return await this.request(this.auth_endpoint, Method.POST, pathname, data, options)
  }

  async send<T = any>(
    method: Method,
    url: string,
    data = {},
    options: AxiosRequestConfig = {},
    retries = 1,
  ): Promise<T> {
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

      if (retries > 0) {
        // 网络无法连接
        if (isNetworkError(pdsErr)) {
          // 重试
          return await this.send(method, url, data, options, --retries)
        }
      }
      throw this.throwError(pdsErr, req_opt)
    }
  }

  async request(
    endpoint: string,
    method: Method,
    pathname: string,
    data = {},
    options = {},
    retries = 1,
  ): Promise<any> {
    let req_opt: AxiosRequestConfig = {
      method,
      url: getUrl(endpoint, this.path_type, this.version, pathname),
      data,
      ...options,
    }
    debug('request:', JSON.stringify(req_opt))

    await this.checkRefreshToken(req_opt)

    req_opt.headers = req_opt.headers || {}
    req_opt.headers['Authorization'] = 'Bearer ' + this.token_info.access_token

    try {
      // 发送请求
      let response = await this.context.Axios(req_opt)
      debug('response:', response.data)

      return response.data
    } catch (e) {
      debug('request error:', e.response || e)

      let pdsErr = new PDSError(e)

      if (retries > 0) {
        // 网络无法连接
        if (isNetworkError(pdsErr)) {
          // 重试
          return await this.request(endpoint, method, pathname, data, options, --retries)
        }

        // token 失效
        if (pdsErr.status == 401) {
          if (this.refresh_token_fun) {
            await this.customRefreshTokenFun()
            return await this.request(endpoint, method, pathname, data, options, --retries)
          } else {
            this.throwError(new PDSError(pdsErr.message, 'TokenExpired'), req_opt)
          }
        } else if (pdsErr.status == 403) {
          if (pdsErr.message.includes('UserRoleChanged')) {
            this.throwError(new PDSError(pdsErr.message, 'TokenExpired'), req_opt)
          }
        }
      }

      this.throwError(pdsErr, req_opt)
    }
  }

  /* istanbul ignore next */
  async checkRefreshToken(req_opt: AxiosRequestConfig) {
    if (!this.token_info || !this.token_info.access_token) {
      this.throwError(new PDSError('access_token is required', 'TokenExpired'), req_opt)
    }
    if (Date.now() > Date.parse(this.token_info.expire_time)) {
      if (this.refresh_token_fun) {
        await this.customRefreshTokenFun()
      } else {
        this.throwError(new PDSError('Invalid expire_time', 'TokenExpired'), req_opt)
      }
    }
  }
  async customRefreshTokenFun(): Promise<ITokenInfo> {
    try {
      //自定义refresh_token方法
      var new_token_info = await this.refresh_token_fun()
      //需要重新赋值
      this.token_info = new_token_info
      return new_token_info
    } catch (e) {
      throw new PDSError(e)
    }
  }

  throwError(e: PDSError, opt?: AxiosRequestConfig) {
    this.emit('error', e, opt)
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
