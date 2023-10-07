import {IContextExt, IClientParams, ITokenInfo, IPDSRequestConfig} from '../Types'
import {PDSAccountApiClient} from './api_account'

export class PDSAuthClient extends PDSAccountApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }
  // node.js only
  /* istanbul ignore next */
  async getUserJwtToken(params: IGetUserJwtTokenReq, options: IPDSRequestConfig = {}): Promise<ITokenInfo> {
    return await this.getJwtToken({...params, sub_type: 'user'}, options)
  }
  // node.js only
  /* istanbul ignore next */
  async getServiceJwtToken(params: IGetServiceJwtTokenReq, options: IPDSRequestConfig = {}): Promise<ITokenInfo> {
    return await this.getJwtToken({...params, sub_type: 'service'}, options)
  }
  // node.js only
  /* istanbul ignore next */
  protected async getJwtToken(params: IGetJWTTokenReq, options: IPDSRequestConfig = {}): Promise<ITokenInfo> {
    let {
      client_id,
      private_key_pem,

      domain_id,
      subdomain_id = '',
      user_id,
      sub_type,
      auto_create = false,
    } = params

    let now_sec = Math.floor(Date.now() / 1000)
    let opt = {
      iss: client_id,
      sub: sub_type == 'user' ? user_id : domain_id,
      sub_type, // user, services
      aud: domain_id,
      jti: Math.random().toString(36).substring(2),
      exp: now_sec + 300,
      iat: now_sec - 300,
      // nbf: '',
      auto_create,
    }

    // node.js only
    const assertion = this.contextExt.signJWT.call(this.contextExt, opt, private_key_pem, 'RS256')

    let data: any = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      client_id,
      assertion,
    }
    if (subdomain_id) data.subdomain_id = subdomain_id

    return await this.getToken(data, options)
  }

  /* istanbul ignore next */
  async refreshJwtToken(params: IRefreshJwtTokenReq, options: IPDSRequestConfig = {}) {
    let data: any = {
      app_id: params.client_id,
      refresh_token: params.refresh_token,
      grant_type: 'refresh_token',
    }
    return await this.postAuthAnonymous(`/account/token`, data, options)
  }

  /* istanbul ignore next */
  async getTokenByCode(params: IGetTokenByCodeReq, options: IPDSRequestConfig = {}): Promise<ITokenInfo> {
    let data: any = {
      ...params,
      grant_type: 'code',
    }
    return await this.getToken(data, options)
  }
  /* istanbul ignore next */
  async refreshToken(params: IRefreshTokenReq, options: IPDSRequestConfig = {}) {
    let data: any = {
      ...params,
      grant_type: 'refresh_token',
    }
    return await this.getToken(data, options)
  }

  /* istanbul ignore next */
  private async getToken(data: any, options: IPDSRequestConfig = {}) {
    return await this.postAuthAnonymous(
      `/oauth/token`,
      //注意：请求参数要放在body里
      Object.keys(data)
        .map(k => `${k}=${encodeURIComponent(data[k])}`)
        .join('&'),
      //注意：要设置请求的 content-type 为 application/x-www-form-urlencoded
      {
        ...options,
        headers: {
          ...options?.headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )
  }
}

export interface IGetJWTTokenReq {
  client_id: string
  private_key_pem: string
  domain_id: string
  subdomain_id?: string
  sub_type?: 'user' | 'service'
  user_id?: string
  auto_create?: boolean
}
export interface IGetUserJwtTokenReq extends IGetJWTTokenReq {
  user_id: string
}

export interface IGetServiceJwtTokenReq extends Omit<IGetJWTTokenReq, 'user_id' | 'sub_type'> {}
export interface IRefreshJwtTokenReq {
  client_id: string
  // grant_type: "refresh_token"
  refresh_token: string
}

export interface IGetTokenByCodeReq {
  client_id: string
  client_secret?: string
  redirect_uri: string
  code: string
  // grant_type: 'code'
}
export interface IRefreshTokenReq {
  client_id: string
  client_secret?: string
  redirect_uri: string
  refresh_token: string
  // grant_type: 'refresh_token'
}
