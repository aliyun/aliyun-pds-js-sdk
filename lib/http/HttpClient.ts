import {EventEmitter} from '../utils/EventEmitter'
import {IClientParams, IContextExt, ITokenInfo, IPDSRequestConfig, TMethod, PathType} from '../Types'

import {PDSError} from '../utils/PDSError'

import {delayRandom, isNetworkError} from '../utils/HttpUtil'

const MAX_RETRY = 5

export interface IHttpClient {
  contextExt: IContextExt
  sendOSS(options?: IPDSRequestConfig): Promise<any>
  postAPI<T = any>(pathname: string, data?: any, options?: IPDSRequestConfig): Promise<T>
  // postAuth<T = any>(pathname: string, data?: any, options?: IPDSRequestConfig): Promise<T>
}

// emit('error')
export class HttpClient extends EventEmitter implements IHttpClient {
  token_info?: ITokenInfo
  share_token?: string
  api_endpoint?: string
  auth_endpoint?: string
  refresh_token_fun?: () => Promise<ITokenInfo>
  refresh_share_token_fun?: () => Promise<string>
  path_type: PathType = 'StandardMode'
  version: string = ''
  contextExt: IContextExt
  verbose: boolean

  constructor(params: IClientParams, contextExt: IContextExt) {
    super()

    validateParams(params, contextExt)

    let {
      token_info,
      share_token,
      api_endpoint,
      auth_endpoint,
      refresh_token_fun,
      refresh_share_token_fun,
      path_type = 'StandardMode',
      version = 'v2',
      verbose = false,
    } = params

    Object.assign(this, {
      token_info,
      share_token,
      api_endpoint: api_endpoint,
      auth_endpoint: auth_endpoint || api_endpoint,
      refresh_token_fun,
      refresh_share_token_fun,
      path_type,
      version,
      verbose,
      contextExt,
    })
  }

  /* istanbul ignore next */
  setToken(tokenInfo: ITokenInfo) {
    validateTokenInfo(tokenInfo)
    this.token_info = tokenInfo
  }
  /* istanbul ignore next */
  setShareToken(share_token: string) {
    this.share_token = share_token
  }

  /**
   * 基础 API 服务调用方法。基于此方法，可以封装出调用任何 PDS API 方法。
   * @param pathname <string> 调用 API 服务的 pathname。 比如 API 是 /v2/file/list, 此处传入 /file/list 即可。
   * @param data     <object> 调用 pathname 对应接口的参数 JSON。
   * @param options
   * @returns
   */
  async postAPI<T = any>(pathname: string, data = {}, options: IPDSRequestConfig = {}): Promise<T> {
    return await this.request(this.api_endpoint || '', 'POST', pathname, data, options)
  }
  async postAuth<T = any>(pathname: string, data = {}, options: IPDSRequestConfig = {}): Promise<T> {
    return await this.request(this.auth_endpoint || '', 'POST', pathname, data, options)
  }
  async postAPIAnonymous<T = any>(pathname: string, data = {}, options: IPDSRequestConfig = {}): Promise<T> {
    let res = await this.send('POST', getUrl(this.api_endpoint || '', this.version, pathname), data, options)
    return res.data
  }
  async postAuthAnonymous<T = any>(pathname: string, data = {}, options: IPDSRequestConfig = {}): Promise<T> {
    let res = await this.send('POST', getUrl(this.auth_endpoint || '', this.version, pathname), data, options)
    return res.data
  }

  /* istanbul ignore next */
  async sendOSS(options: IPDSRequestConfig = {}): Promise<any> {
    return this.contextExt.sendOSS.call(this.contextExt, options)
  }

  async send(
    method: TMethod,
    url: string,
    data = {},
    options: IPDSRequestConfig = {},
    retries = MAX_RETRY,
  ): Promise<any> {
    let req_opt: IPDSRequestConfig = {
      method,
      url,
      data,
      ...options,
    }
    if (this.verbose) console.debug('send:', JSON.stringify(req_opt))
    try {
      let res = await this.contextExt.axiosSend.call(this.contextExt, req_opt)
      if (this.verbose) console.debug('response:', res.data)
      return res
    } catch (err) {
      if (this.verbose) console.debug('send error:', err.response || err)
      let pdsErr = new PDSError(err)

      this.emitError(pdsErr, req_opt)

      if (retries > 0) {
        // 网络无法连接
        if (pdsErr.status === 429 || isNetworkError(pdsErr)) {
          console.debug('[should retry] error:', pdsErr)
          await delayRandom()
          // 重试
          return await this.send(method, url, data, options, --retries)
        }
      }
      throw pdsErr
    }
  }

  async request(
    endpoint: string,
    method: TMethod,
    pathname: string,
    data: {[key: string]: any} = {},
    options = {},
    retries = MAX_RETRY,
  ): Promise<any> {
    let req_opt: IPDSRequestConfig = {
      method,
      url: getUrl(endpoint, this.version, pathname),
      data,
      ...options,
    }

    if (this.verbose) console.debug('request:', JSON.stringify(req_opt))

    req_opt.headers = req_opt.headers || {}

    if (this.share_token) req_opt.headers['x-share-token'] = this.share_token

    let hasShareToken = !!req_opt.headers['x-share-token']

    if (!hasShareToken) {
      await this.checkRefreshToken(req_opt)
      req_opt.headers['Authorization'] = 'Bearer ' + this.token_info?.access_token
    }

    try {
      // 发送请求
      let response = await this.contextExt.axiosSend.call(this.contextExt, req_opt)
      if (this.verbose) console.debug('response:', response.data)

      return response.data
    } catch (e) {
      if (this.verbose) console.debug('request error:', e.response || e)

      let pdsErr = new PDSError(e)

      // 不是每个 http error 都emit
      if (
        req_opt.data?.donot_emit_error !== true &&
        !(req_opt.data?.donot_emit_notfound === true && pdsErr.status === 404)
      ) {
        this.emitError(pdsErr, req_opt)
      }

      if (retries > 0) {
        // 网络无法连接
        if (pdsErr.status === 429 || isNetworkError(pdsErr)) {
          console.debug('[should retry] error:', pdsErr)
          await delayRandom()
          // 重试
          return await this.request(endpoint, method, pathname, data, options, --retries)
        }
      }

      if (pdsErr.status == 401) {
        // token 失效
        if (pdsErr.code?.includes('AccessTokenInvalid')) {
          if (this.refresh_token_fun) {
            await this.customRefreshTokenFun()
            await delayRandom()
            return await this.request(endpoint, method, pathname, data, options, retries)
          } else {
            throw new PDSError(pdsErr.message, 'TokenExpired')
          }
        } else if (pdsErr.code?.includes('ShareLinkTokenInvalid')) {
          // share_token 失效
          // code: "ShareLinkTokenInvalid"
          // message: "ShareLinkToken is invalid. expired"
          if (this.refresh_share_token_fun) {
            this.share_token = await this.refresh_share_token_fun()
            await delayRandom()
            return await this.request(endpoint, method, pathname, data, options, retries)
          } else {
            throw new PDSError(pdsErr.message, 'ShareLinkTokenInvalid')
          }
        }
      }

      throw pdsErr
    }
  }

  /* istanbul ignore next */
  async checkRefreshToken(request_config: IPDSRequestConfig) {
    if (!this.token_info || !this.token_info.access_token) {
      this.throwError(new PDSError('access_token is required', 'AccessTokenInvalid'), request_config)
    }
    const expire_time = Date.parse(this.token_info?.expire_time || '')
    if (!isNaN(expire_time) && Date.now() > expire_time) {
      if (this.refresh_token_fun) {
        await this.customRefreshTokenFun()
      } else {
        this.throwError(new PDSError('Invalid expire_time', 'TokenExpired'), request_config)
      }
    }
  }
  /* istanbul ignore next */
  async customRefreshTokenFun(): Promise<ITokenInfo | undefined> {
    try {
      //自定义refresh_token方法
      var new_token_info = await this.refresh_token_fun?.()
      //需要重新赋值
      this.token_info = new_token_info
      return new_token_info
    } catch (e) {
      throw new PDSError(e)
    }
  }
  emitError(e: PDSError, request_config?: IPDSRequestConfig) {
    this.emit('error', e, request_config)
  }
  throwError(e: PDSError, request_config?: IPDSRequestConfig) {
    this.emitError(e, request_config)
    throw e
  }
}

export function getUrl(endpoint: string, version: string, url: string): string {
  if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('//')) return url
  return `${endpoint}${version ? '/' + version : ''}${url}`
}

export function validateParams(params: IClientParams, contextExt: IContextExt) {
  if (!params) {
    throw new PDSError('params is required', 'InvalidParameter')
  }
  if (!contextExt) {
    throw new PDSError('contextExt is required', 'InvalidParameter')
  }

  if (!params.api_endpoint && !params.auth_endpoint) {
    throw new PDSError('api_endpoint or auth_endpoint is required', 'InvalidParameter')
  }

  if (params.token_info) {
    validateTokenInfo(params.token_info)
  }

  if (params.refresh_token_fun && typeof params.refresh_token_fun != 'function') {
    throw new PDSError('Invalid refresh_token_fun', 'InvalidParameter')
  }
}
export function validateTokenInfo(tokenInfo: ITokenInfo) {
  if (!tokenInfo || !tokenInfo.access_token) {
    throw new PDSError('token_info.access_token is required', 'InvalidParameter')
  }
  if (tokenInfo.expire_time && isNaN(Date.parse(tokenInfo.expire_time))) {
    throw new PDSError('Invalid token_info.expire_time', 'InvalidParameter')
  }
}
