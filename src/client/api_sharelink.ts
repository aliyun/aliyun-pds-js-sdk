/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListReq, IListRes} from '../Types'
import {PDSShareApiClient} from './api_share'

export class PDSShareLinkApiClient extends PDSShareApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  /**
   * @description:  我的分享列表
   * @param {IListReq} data
   * @param {AxiosRequestConfig} options
   */
  listShareLinks(data?: IListReq & {creator?: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IShareLinkItem>>('/share_link/list', data, options)
  }

  /**
   * @description: 创建分享
   * @param {ICreateShareLinkReq} data
   * @param {AxiosRequestConfig} options
   */
  createShareLink(data: ICreateShareLinkReq, options?: AxiosRequestConfig) {
    return this.postAPI<IShareLinkItem>('/share_link/create', data, options)
  }

  /**
   * @description 取消分享
   * @param {{share_id: string}} data
   * @param {AxiosRequestConfig} options
   */
  cancelShareLink(data: {share_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/share_link/cancel', data, options)
  }

  /**
   * @description 匿名获取分享信息
   * @param {{share_id: string}} data
   * @param {AxiosRequestConfig} options
   */
  getShareLinkByAnonymous(data: {share_id: string}, options?: AxiosRequestConfig) {
    return this.postAPIAnonymous<IAnonymousShareLinkItem>('/share_link/get_by_anonymous', data, options)
  }
  /**
   * @description 匿名获取分享token
   * @param {{share_id: string}} data
   * @param {AxiosRequestConfig} options
   */
  getShareToken(data: {share_id: string; share_pwd?: string}, options?: AxiosRequestConfig) {
    return this.postAPIAnonymous<IShareToken>('/share_link/get_share_token', data, options)
  }
}

interface ICreateShareLinkReq {
  drive_id: string
  share_pwd?: string
  expiration: Date
  description: string
  file_path_list?: string[] // 仅在HostingMode
  file_id_list?: string[]
}

interface IShareToken {
  expire_time: Date
  expires_in: number
  share_token: string
}

interface IAnonymousShareLinkItem {
  avatar: string
  creator_id: string
  creator_name: string
  creator_phone: string
  disable_download: boolean
  disable_preview: boolean
  disable_save: boolean
  enable_upload: boolean
  expiration: string
  preview_limit: number
  require_login: boolean
  save_download_limit: number
  share_name: string
  updated_at: Date
  [key: string]: any
}

// 分享item
interface IShareLinkItem {
  created_at: Date // "2021-11-23T03:52:22.352Z"
  creator: string //'2b9dc96336bf4fe08e69f25985a93d86'
  description?: string //''
  download_count: number // 0
  drive_id: string //'2030'
  expiration?: Date //'2021-11-30T03:50:33.664Z'
  expired?: boolean // false
  file_id: string //'617b96d512f5ef997f23435297f882b1bc1c58fc'
  file_id_list?: string[] // ['617b96d512f5ef997f23435297f882b1bc1c58fc']
  file_path_list?: string[] // null
  is_subscribed: boolean // false
  num_of_subscribers: number // 0
  preview_count: number //0
  save_count: number //0
  share_id: string //'YWkUdz2SJir'
  share_msg?: string //''
  share_name: string //'321321'
  share_policy: 'url' | 'msg'
  share_pwd?: string //''
  share_url?: string //''
  status: 'enabled' | 'disabled' //'enabled'
  updated_at: Date //'2021-11-23T03:52:22.352Z'

  video_preview_count?: number
  [key: string]: any
}

export {ICreateShareLinkReq, IShareLinkItem}
