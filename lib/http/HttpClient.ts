import {EventEmitter} from '../utils/EventEmitter'
import {IClientParams, IContextExt, ITokenInfo, IPDSRequestConfig, TMethod, PathType} from '../Types'

import {PDSError} from '../utils/PDSError'

import {delayRandom, exponentialBackoff, isNetworkError} from '../utils/HttpUtil'

const MAX_RETRY = 10

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
  /* istanbul ignore next */
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
    if (this.verbose) {
      console.log('request:', {
        method: req_opt.method,
        url: req_opt.url,
        headers: JSON.stringify(req_opt?.headers),
        params: JSON.stringify(req_opt?.params),
        data: JSON.stringify(req_opt?.data),
      })
    }
    try {
      let res = await this.contextExt.axiosSend.call(this.contextExt, req_opt)
      if (this.verbose) {
        console.log('response:', {
          status: res.status,
          headers: JSON.stringify(res.headers),
          data: JSON.stringify(res.data),
        })
      }
      return res
    } catch (err) {
      let pdsErr = new PDSError(err)

      if (this.verbose) console.log('error:', pdsErr)

      // 不是每个 http error 都emit
      if (
        req_opt.data?.donot_emit_error !== true &&
        !(req_opt.data?.donot_emit_notfound === true && pdsErr.status === 404)
      ) {
        this.emitError(pdsErr, req_opt)
      }

      if (retries > 0) {
        // 网络无法连接
        if (pdsErr.type == 'ClientError' && isNetworkError(pdsErr)) {
          console.debug('[should retry] error:', pdsErr)
          try {
            await exponentialBackoff(MAX_RETRY - retries, 1000, 30000, MAX_RETRY)
            // 重试
            return await this.send(method, url, data, options, --retries)
          } catch (err) {
            console.error(err)
          }
        }

        // 服务端限流
        if (pdsErr.status === 429) {
          console.debug('[should retry] error:', pdsErr)
          await delayRandom(1000, 3000)
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

    if (this.verbose) {
      console.log('request:', {
        method: req_opt.method,
        url: req_opt.url,
        headers: JSON.stringify(req_opt?.headers),
        params: JSON.stringify(req_opt?.params),
        data: JSON.stringify(req_opt?.data),
      })
    }

    req_opt.headers = req_opt.headers || {}

    if (this.share_token) req_opt.headers['x-share-token'] = this.share_token

    let hasShareToken = !!req_opt.headers['x-share-token']

    try {
      // 如果没有token或token失效，统一 emitError
      if (!hasShareToken) {
        await this.checkRefreshToken()
      }

      if (this.token_info?.access_token) {
        req_opt.headers['Authorization'] = 'Bearer ' + this.token_info?.access_token
      }

      // 发送请求
      let response = await this.contextExt.axiosSend.call(this.contextExt, req_opt)
      if (this.verbose) {
        console.log('response:', {
          status: response.status,
          headers: JSON.stringify(response.headers),
          data: JSON.stringify(response.data),
        })
      }

      return response.data
    } catch (e) {
      let pdsErr = new PDSError(e)

      if (this.verbose) console.log('error:', pdsErr)

      // 不是每个 http error 都emit
      if (
        req_opt.data?.donot_emit_error !== true &&
        !(req_opt.data?.donot_emit_notfound === true && pdsErr.status === 404)
      ) {
        this.emitError(pdsErr, req_opt)
      }

      if (retries > 0) {
        // 网络无法连接
        if (pdsErr.type == 'ClientError' && isNetworkError(pdsErr)) {
          console.debug('[should retry] error:', pdsErr)
          try {
            await exponentialBackoff(MAX_RETRY - retries, 1000, 30000, MAX_RETRY)
            // 重试
            return await this.request(endpoint, method, pathname, data, options, --retries)
          } catch (err) {
            console.error(err)
          }
        }

        // 服务端限流
        if (pdsErr.status === 429) {
          console.debug('[should retry] error:', pdsErr)
          await delayRandom(1000, 3000)
          // 重试
          return await this.request(endpoint, method, pathname, data, options, --retries)
        }
      }

      // token 失效
      if (/AccessTokenInvalid|TokenExpired/.test(pdsErr.code || '')) {
        if (this.refresh_token_fun) {
          await this.customRefreshTokenFun()
          await delayRandom(0, 1000)
          return await this.request(endpoint, method, pathname, data, options, --retries)
        } else {
          throw new PDSError(pdsErr.message, 'TokenExpired')
        }
      } else if (pdsErr.code?.includes('ShareLinkTokenInvalid')) {
        // share_token 失效
        // code: "ShareLinkTokenInvalid"
        // message: "ShareLinkToken is invalid. expired"
        if (this.refresh_share_token_fun) {
          await this.customRefreshShareTokenFun()
          await delayRandom(0, 1000)
          return await this.request(endpoint, method, pathname, data, options, --retries)
        } else {
          throw new PDSError(pdsErr.message, 'ShareLinkTokenInvalid')
        }
      }

      throw pdsErr
    }
  }

  /* istanbul ignore next */
  async checkRefreshToken() {
    if (!this.token_info || !this.token_info.access_token) {
      throw new PDSError('access_token is required', 'AccessTokenInvalid')
    }
    const expire_time = Date.parse(this.token_info?.expire_time || '')
    if (!isNaN(expire_time) && Date.now() > expire_time) {
      if (this.refresh_token_fun) {
        await this.customRefreshTokenFun()
      } else {
        throw new PDSError('Invalid expire_time', 'TokenExpired')
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
  /* istanbul ignore next */
  async customRefreshShareTokenFun(): Promise<string | undefined> {
    try {
      //自定义refresh_share_token_fun方法
      var new_share_token = await this.refresh_share_token_fun?.()
      //需要重新赋值
      this.share_token = new_share_token
      return new_share_token
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
