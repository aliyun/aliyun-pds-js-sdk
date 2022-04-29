/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListReq, IListRes} from '../Types'
import {PDSShareApiClient} from './api_share'

export class PDSShareLinkApiClient extends PDSShareApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  // 获取分享列表
  listShareLinks(data?: IListReq & {creator?: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IShareLinkItem>>('/share_link/list', data, options)
  }

  // 搜索分享
  searchShareLinks(data?: ISearchShareLinkReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IShareLinkItem>>('/share_link/search', data, options)
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
   * @description: 查看分享详情
   * @param {{share_id:string}} data
   * @param {AxiosRequestConfig} options
   */
  getShareLink(data: {share_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IShareLinkItem>('/share_link/get', data, options)
  }

  /**
   * @description: 修改分享
   * @param {IUpdateShareLinkReq} data
   * @param {AxiosRequestConfig} options
   */
  updateShareLink(data: IUpdateShareLinkReq, options?: AxiosRequestConfig) {
    return this.postAPI<IShareLinkItem>('/share_link/update', data, options)
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

interface ISearchShareLinkReq extends IListReq {
  // 1) share_name
  // 2) description
  // 3) created_at
  // 4) updated_at
  order_by?: string
  order_direction?: 'ASC' | 'DESC'
  include_cancelled?: boolean
}

interface IUpdateShareLinkReq {
  share_id?: string
  share_pwd?: string
  share_name?: string
  expiration?: Date
  description?: string
  comments?: string
  status?: string

  preview_count?: number
  save_count?: number
  download_count?: number
  access_count?: number

  disable_preview?: boolean // 禁止预览文件
  disable_save?: boolean // 禁止转存文件
  disable_download?: boolean // 禁止下载文件

  preview_limit?: number // 分享预览次数限制，0表示不限制
  save_download_limit?: number // 分享转存加下载次数限制，0表示不限制

  require_login?: boolean // 此分享要求domain用户才能查看
  creatable_file_id_list?: string[] // 允许上传的目录列表
}
interface ICreateShareLinkReq {
  drive_id: string
  share_pwd?: string
  share_name?: string
  expiration?: Date
  description?: string
  comments?: string
  share_icon?: string
  file_path_list?: string[] // 仅在HostingMode
  file_id_list?: string[]
  // 权限
  disable_preview?: boolean // 禁止预览文件
  disable_save?: boolean // 禁止转存文件
  disable_download?: boolean // 禁止下载文件

  preview_limit?: number // 分享预览次数限制，0表示不限制
  save_download_limit?: number // 分享转存加下载次数限制，0表示不限制

  require_login?: boolean // 此分享要求domain用户才能查看
  creatable_file_id_list?: string[] // 允许上传的目录列表
}

interface IShareToken {
  expire_time?: Date
  expires_in?: number
  share_token: string
}

interface IAnonymousShareLinkItem {
  avatar?: string
  access_count?: number
  creator_id?: string
  creator_name?: string
  creator_phone?: string
  comments?: string
  disable_download?: boolean
  disable_preview?: boolean
  disable_save?: boolean
  download_count?: number
  download_limit?: number
  enable_upload?: boolean
  expiration?: Date
  preview_limit?: number
  preview_count?: number
  require_login?: boolean
  save_download_limit?: number
  share_name?: string
  save_count?: number
  save_limit?: number
  updated_at?: Date
  report_count?: number
  video_preview_count?: number
  [key: string]: any
}

// 分享item
interface IShareLinkItem {
  created_at?: Date // "2021-11-23T03:52:22.352Z"
  creator?: string //'2b9dc96336bf4fe08e69f25985a93d86'
  description?: string //''
  download_count?: number // 0
  download_limit?: number
  disable_download?: boolean
  disable_preview?: boolean
  disable_save?: boolean
  drive_id?: string //'2030'
  expiration?: Date //'2021-11-30T03:50:33.664Z'
  expired?: boolean // false
  file_id?: string //'617b96d512f5ef997f23435297f882b1bc1c58fc'
  file_id_list?: string[] // ['617b96d512f5ef997f23435297f882b1bc1c58fc']
  file_path_list?: string[] // null

  is_subscribed: boolean // false
  num_of_subscribers?: number // 0
  preview_count?: number //0
  preview_limit?: number //0
  report_count?: number
  require_login?: boolean
  save_count?: number //0
  save_download_limit?: number //0
  save_limit?: number //0
  share_icon?: string
  share_id: string //'YWkUdz2SJir'
  share_msg?: string //''
  share_name?: string //'321321'
  share_policy: 'url' | 'msg'
  share_pwd?: string //''
  share_url?: string //''
  status: 'enabled' | 'disabled' //'enabled'
  updated_at: Date //'2021-11-23T03:52:22.352Z'

  video_preview_count?: number
  [key: string]: any
}

export {ICreateShareLinkReq, IShareLinkItem}
