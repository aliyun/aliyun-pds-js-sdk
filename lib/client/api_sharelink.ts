import {IContextExt, IClientParams, IPDSRequestConfig, IListReq, IListRes} from '../Types'
import {PDSRoleApiClient} from './api_role'

export class PDSShareLinkApiClient extends PDSRoleApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  /** 获取分享列表 */
  listShareLinks(data?: IListShareLinksReq, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IShareLinkItem>>('/share_link/list', data, options)
  }

  /** 搜索分享 */
  searchShareLinks(data?: ISearchShareLinkReq, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IShareLinkItem>>('/share_link/search', data, options)
  }

  /** 创建分享 */
  createShareLink(data: ICreateShareLinkReq, options?: IPDSRequestConfig) {
    return this.postAPI<IShareLinkItem>('/share_link/create', data, options)
  }

  /** 查看分享详情 */
  getShareLink(data: {share_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<IShareLinkItem>('/share_link/get', data, options)
  }

  /** 修改分享  */
  updateShareLink(data: IUpdateShareLinkReq, options?: IPDSRequestConfig) {
    return this.postAPI<IShareLinkItem>('/share_link/update', data, options)
  }

  /** 取消分享 */
  cancelShareLink(data: {share_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<void>('/share_link/cancel', data, options)
  }
  /** 匿名获取分享信息 */
  getShareLinkByAnonymous(data: {share_id: string}, options?: IPDSRequestConfig) {
    return this.postAPIAnonymous<IAnonymousShareLinkItem>('/share_link/get_by_anonymous', data, options)
  }
  /** 匿名获取分享token */
  getShareToken(data: IGetShareTokenReq, options?: IPDSRequestConfig) {
    return this.postAPIAnonymous<IShareToken>('/share_link/get_share_token', data, options)
  }
}

export interface IListShareLinksReq extends IListReq {
  creator?: string
  order_by?: string
  order_direction?: string
  include_cancelled?: boolean
}
export interface ISearchShareLinkReq extends IListReq {
  order_by?: 'created_at' | 'share_name' | 'updated_at' | 'description' | string
  order_direction?: 'ASC' | 'DESC'
  include_cancelled?: boolean
  return_total_count?: boolean
  creators?: string[]
  query?: string
}
export interface IGetShareTokenReq {
  share_id: string
  share_pwd?: string
  /** 令牌有效时长。参数合法范围是(0, 7200]；参数为0或缺省时默认7200秒。 */
  expire_sec?: number
  /** 管理员可以免密访问 */
  check_share_pwd?: boolean
}
export interface IUpdateShareLinkReq {
  share_id?: string
  share_pwd?: string
  share_name?: string
  expiration?: string
  description?: string
  // comments?: string
  status?: string

  preview_count?: number
  save_count?: number
  download_count?: number
  access_count?: number
  report_count?: number
  video_preview_count?: number

  /** 禁止预览文件 */
  disable_preview?: boolean
  /** 禁止转存文件 */
  disable_save?: boolean
  /** 禁止下载文件 */
  disable_download?: boolean
  /** 分享预览次数限制，0表示不限制 */
  preview_limit?: number
  save_limit?: number
  download_limit?: number
  /** 分享转存加下载次数限制，0表示不限制 */
  save_download_limit?: number
  /** 此分享要求domain用户才能查看 */
  require_login?: boolean

  /** 是否允许上传 */
  creatable?: boolean
  /** 允许上传的目录列表 */
  creatable_file_id_list?: string[]
}
export interface ICreateShareLinkReq {
  drive_id: string
  /** 是否分享整个drive中的文件 */
  share_all_files?: boolean
  /** 分享父路径文件id列表。 父路径文件个数范围[1, 100]。 如果share_all_files=true，那么此字段无效，否则必须要填写 */
  file_id_list?: string[]

  /** 提取码。 提取码长度范围[0, 64]字节 不设置或者设置为空表示无提取码，在获取分享令牌的时候也不用设置提取码参数。 要求使用ASCII可见字符。 */
  share_pwd?: string
  /** 分享名。 如果未设置，默认使用file_id_list中的第一个id对应的文件名。 长度范围[0, 128]字符 */
  share_name?: string
  /** 失效时间点。 RFC3339格式，比如："2020-06-28T11:33:00.000+08:00"。 当expiration取值""时，表示永久有效 */
  expiration?: string
  /** 分享描述。 长度范围[0, 1024]字符 */
  description?: string
  // comments?: string
  share_icon?: string
  user_id?: string

  /** 权限相关 */

  /** 禁止预览文件 */
  disable_preview?: boolean
  /** 禁止转存文件 */
  disable_save?: boolean
  /** 禁止下载文件 */
  disable_download?: boolean

  /** 分享预览次数限制，0表示不限制 */
  preview_limit?: number
  save_limit?: number

  /** 分享下载次数限制。 次数0表示不限制 */
  download_limit?: number

  /** 分享转存加下载次数限制，0表示不限制 */
  save_download_limit?: number

  /** 此分享要求domain用户才能查看 */
  require_login?: boolean

  /** 是否允许上传 */
  creatable?: boolean

  /** 允许上传的目录列表 */
  creatable_file_id_list?: string[]
}

export interface IShareToken {
  expire_time?: string
  expires_in?: number
  share_token: string
}

export interface IAnonymousShareLinkItem {
  avatar?: string
  access_count?: number
  /** 创建者 id */
  creator_id?: string
  /** 创建者名字（已脱敏）*/
  creator_name?: string
  /** 创建者手机号（已脱敏）*/
  creator_phone?: string
  comments?: string
  disable_download?: boolean
  disable_preview?: boolean
  disable_save?: boolean
  download_count?: number
  download_limit?: number
  enable_upload?: boolean
  expiration?: string
  preview_limit?: number
  preview_count?: number
  require_login?: boolean
  save_download_limit?: number
  share_name?: string
  save_count?: number
  save_limit?: number
  updated_at?: string
  report_count?: number
  video_preview_count?: number
  [key: string]: any
}

/** 分享item */
export interface IShareLinkItem {
  /** 访问次数 */
  access_count?: number
  // 格式如: "2021-11-23T03:52:22.352Z"
  created_at?: string
  //举例: '2b9dc96336bf4fe08e69f25985a93d86'
  creator?: string
  description?: string //''
  download_count?: number // 0
  download_limit?: number
  disable_download?: boolean
  disable_preview?: boolean
  disable_save?: boolean
  drive_id?: string //'2030'
  expiration?: string //'2021-11-30T03:50:33.664Z'
  expired?: boolean // false
  file_id?: string //'617b96d512f5ef997f23435297f882b1bc1c58fc'
  file_id_list?: string[] // ['617b96d512f5ef997f23435297f882b1bc1c58fc']

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
  updated_at: string //'2021-11-23T03:52:22.352Z'

  video_preview_count?: number
  [key: string]: any
}
