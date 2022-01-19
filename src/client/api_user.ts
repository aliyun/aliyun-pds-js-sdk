/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes, IListReq} from '../Types'
import {formatSize, formatUsedSpace} from '../utils/Formatter'
import {IGroupItem} from './api_group'
import {TMemberType} from './api_membership'
import {PDSStoreApiClient} from './api_store'

export class PDSUserApiClient extends PDSStoreApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  getUser(data: {user_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IUserItem>('/user/get', data, options)
  }

  async createUser(data: ICreateUserReq, options?: AxiosRequestConfig) {
    const info = await this.postAPI<IUserItem>('/user/create', data, options)
    return info
  }

  updateUser(data: IUpdateUserReq, options?: AxiosRequestConfig) {
    return this.postAPI<IUserItem>('/user/update', data, options)
  }

  deleteUser(data: {user_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/user/delete', data, options)
  }

  listUsers(data?: IListReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IUserItem>>('/user/list', data, options)
  }

  searchUsers(data: ISearchUsersReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IUserItem>>('/user/search', data, options)
  }

  listGroupUsers(data: IListGroupUserReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListGroupUserRes>('/user/list_group_user', data, options)
  }

  async generalSearchUsers(data: IUserGeneralSearchReq, options?: AxiosRequestConfig) {
    const {items, next_marker} = await this.postAPI<IListRes<IUserItem>>('/user/general_search', data, options)
    const userList = formatGeneralUserItems(items)
    return {next_marker, items: userList}
  }

  async generalGetUser(
    data: {user_id?: string; extra_return_info?: TUserExtraReturnInfoType},
    options?: AxiosRequestConfig,
  ) {
    let info = await this.postAPI<IUserItem>('/user/general_get', data, options)
    return formatGeneralUserItems([info])[0]
  }

  async importUser(data: IImportUserReq, options?: AxiosRequestConfig) {
    return await this.postAPI<IUserItem>('/user/import', data, options)
  }
  /* istanbul ignore next */
  createAccountLink(data: ICreateAccountLinkReq, options?: AxiosRequestConfig) {
    data.custom_identity = data.identity || undefined
    return this.postAuth<any>('/account/link', data, options)
  }
  /* istanbul ignore next */
  getAccountLink(data: IGetAccountLinkReq, options?: AxiosRequestConfig) {
    data.custom_identity = data.identity || undefined
    return this.postAuth<IAccountLinkInfo>('/account/get_link_info', data, options)
  }
  /* istanbul ignore next */
  getAccountLinkByUserId(data: {user_id: string}, options?: AxiosRequestConfig) {
    return this.postAuth<IListRes<IAccountLinkInfo>>('/account/get_link_info_by_user_id', data, options)
  }
}

function formatGeneralUserItems(items: IUserItem[]) {
  return items.map(it => {
    const u = {...it}
    u.group_name = (it.parent_group || []).map((g: {group_name: string}) => g.group_name).join(',') || '-'
    if (it.default_drive) {
      const {total_size, used_size} = it.default_drive
      u.total_size = total_size
      u.total = formatSize(total_size)
      u.used = formatSize(used_size)
      u.used_total = formatUsedSpace(used_size, total_size, true)
    }
    return u
  })
}

type TUserStatus = 'enabled' | 'disabled'
type TUserRole = 'user' | 'admin' | 'superadmin' | 'subdomain_super_admin' | 'subdomain_admin'
type TUserExtraReturnInfoType = Array<'group' | 'drive'>
type TAuthenticationType = 'mobile' | 'email' | 'ldap' | 'custom'
type TAccountLinkStatus = 'normal'

interface ISearchUsersReq {
  email?: string
  limit?: number
  marker?: string
  nick_name?: string
  user_name?: string
  phone?: string
  role?: TUserRole
  status?: TUserStatus
  nick_name_for_fuzzy?: string // 用户昵称模糊搜索
}
interface ICreateUserReq {
  user_id: string
  user_name?: string
  status?: TUserStatus
  role?: TUserRole
  phone?: string
  nick_name?: string
  description?: string
  avatar?: string // 头像，可以为 http(s)开头的url 或 base64url
  email?: string
}

// 用户可以修改自己的description，nick_name，avatar；管理员在用户基础上还可修改status（可以修改任意用户）；
// 超级管理员在管理员基础上还可修改role（可以修改任意用户）。
interface IUpdateUserReq {
  user_id: string
  status?: TUserStatus
  role?: TUserRole
  phone?: string
  nick_name?: string
  description?: string
  avatar?: string // 头像，可以为 http(s)开头的url 或 base64url
  email?: string
}

interface IUserItem {
  avatar?: string // ''
  created_at?: Date // 1637115816804
  default_drive_id?: string //'10620'

  description?: string // ''
  domain_id?: string //'stg11239'
  email?: string //''
  nick_name?: string //'王'

  phone?: string //'176029255'
  role: TUserRole
  status: TUserStatus

  updated_at?: Date // 1637116004105

  user_id: string //'152dc494d4094d848f8adc65b91b651f'
  user_name?: string //'王'

  user_data?: any // {}
  default_drive?: any

  parent_group?: any

  permission?: any //null
  deny_change_password_by_self?: boolean // false  禁止自己修改密码
  need_change_password_next_login?: boolean // false

  [key: string]: any
}

interface IListGroupUserReq extends IListReq {
  group_id?: string // 查询某个group下的user和group
  member_type?: TMemberType // 可选参数：user、group  不传默认都返回
  extra_return_info?: TUserExtraReturnInfoType //  管理员才可以传此字段 可 选枚举：drive、group， 表示返回用户的drive或group信息。 如果此字段带上group会大幅减慢查询速度，调用一次不能超过30条记录。
}
interface IListGroupUserRes {
  readonly group_items?: IGroupItem[]
  readonly user_items?: IUserItem[]
  readonly next_marker?: any
}

interface IUserGeneralSearchReq {
  nick_name?: string
  nick_name_for_fuzzy?: string
  parent_group_id_list?: string[]
  direct_parent_group_id?: string
  extra_return_info?: TUserExtraReturnInfoType
}

interface IImportUserReq {
  identity: string
  custom_identity?: string
  nick_name?: string
  plain_password?: string
  deny_change_password_by_self?: boolean
  need_change_password_next_login?: boolean
  auto_create_drive?: boolean
  drive_total_size?: number
  authentication_type: TAuthenticationType // 'mobile' | 'email' | 'ldap' | 'custom'
  parent_group_id?: string
}

interface ICreateAccountLinkReq {
  detail?: string
  custom_identity?: string
  identity: string // 唯一身份标识 样例 : "152*****341"
  status?: TAccountLinkStatus // 状态 样例 : "normal"
  type: string // 认证类型 样例 : "mobile"
  user_id: string
}

interface IAccountLinkInfo {
  authentication_type: TAuthenticationType // 认证类型 样例 : "mobile"
  created_at: number //创建时间 样例 : 1556163159820
  domain_id: string //必填 Domain ID 样例 : "5000"
  identity: string // 唯一身份标识 样例 : "152*****341"
  last_login_time: number // 最后登录时间 样例 : 1556163159820
  status: TAccountLinkStatus //状态 样例 : "normal"
  user_id: string
}
interface IGetAccountLinkReq {
  identity: string
  type: string
  custom_identity?: string
}

export {
  TUserStatus,
  TUserRole,
  TUserExtraReturnInfoType,
  TAuthenticationType,
  TMemberType,
  ISearchUsersReq,
  ICreateUserReq,
  IUpdateUserReq,
  IUserItem,
  IListGroupUserReq,
  IListGroupUserRes,
  IUserGeneralSearchReq,
  IImportUserReq,
  ICreateAccountLinkReq,
  IAccountLinkInfo,
  IGetAccountLinkReq,
}
