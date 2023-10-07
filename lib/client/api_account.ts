import {IContextExt, IClientParams, IPDSRequestConfig, IListRes, ITokenInfo} from '../Types'
import {HttpClient} from '../http/HttpClient'

export class PDSAccountApiClient extends HttpClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  /**
   * @deprecated please use linkAccount instead
   */
  /* istanbul ignore next */
  createAccountLink(data: ICreateAccountLinkReq, options?: IPDSRequestConfig) {
    data.custom_identity = data.identity || undefined
    return this.postAuth<any>('/account/link', data, options)
  }

  linkAccount(data: ILinkAccountReq, options?: IPDSRequestConfig): Promise<ITokenInfo> {
    data.custom_identity = data.identity || undefined
    return this.postAuth<ITokenInfo>('/account/link', data, options)
  }

  unlinkAccount(data: IUnlinkAccountReq, options?: IPDSRequestConfig) {
    data.custom_identity = data.identity || undefined
    return this.postAuth<void>('/account/unlink', data, options)
  }

  getAccountLink(data: IGetAccountLinkReq, options?: IPDSRequestConfig): Promise<IAccountLinkInfo> {
    data.custom_identity = data.identity || undefined
    return this.postAuth<IAccountLinkInfo>('/account/get_link_info', data, options)
  }

  getAccountLinksByUserId(data: {user_id: string}, options?: IPDSRequestConfig): Promise<IListRes<IAccountLinkInfo>> {
    return this.postAuth<IListRes<IAccountLinkInfo>>('/account/get_link_info_by_user_id', data, options)
  }
}

export type TAuthenticationType = 'mobile' | 'email' | 'ldap' | 'ding' | 'wechat' | 'ram' | 'custom' | 'saml' | string

export interface ILinkAccountReq {
  custom_identity?: string
  identity: string // 唯一身份标识 样例 : "152*****341"
  type: TAuthenticationType // 认证类型 样例 : "mobile"
  user_id: string
  extra?: string
}

/**
 * @deprecated
 */
export interface ICreateAccountLinkReq {
  detail?: string
  custom_identity?: string
  identity: string // 唯一身份标识 样例 : "152*****341"
  type: string // 认证类型 样例 : "mobile"
  user_id: string
}

export interface IUnlinkAccountReq {
  custom_identity?: string
  identity: string // 唯一身份标识 样例 : "152*****341"
  type: TAuthenticationType // 认证类型 样例 : "mobile"
  user_id: string
  extra?: string
}

export interface IAccountLinkInfo {
  authentication_type: TAuthenticationType // 认证类型 样例 : "mobile"
  created_at: number // 创建时间 样例 : 1556163159820
  domain_id: string // 必填 Domain ID 样例 : "5000"
  identity: string // 唯一身份标识 样例 : "152*****341"
  user_id: string
  display_name?: string
  extra?: string // 账号附加信息，当账号类型为手机号时，此字段表示国家编码，比如中国大陆为86，当前只有手机号才返回此字段
  [propName: string]: any
}

export interface IGetAccountLinkReq {
  identity: string
  type: string
  custom_identity?: string
  extra?: string
}
