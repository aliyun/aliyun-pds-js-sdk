import {IContextExt, IClientParams, IPDSRequestConfig, IListRes, IListReq} from '../Types'
import {formatSize, formatUsedSpace} from '../utils/Formatter'
import {IGroupItem} from './api_group'
import {TMemberType} from './api_membership'
import {TAuthenticationType} from './api_account'
import {PDSShareLinkApiClient} from './api_sharelink'

export class PDSUserApiClient extends PDSShareLinkApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  getUser(data: {user_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<IUserItem>('/user/get', data, options)
  }

  createUser(data: ICreateUserReq, options?: IPDSRequestConfig) {
    return this.postAPI<IUserItem>('/user/create', data, options)
  }

  updateUser(data: IUpdateUserReq, options?: IPDSRequestConfig) {
    return this.postAPI<IUserItem>('/user/update', data, options)
  }

  deleteUser(data: {user_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<void>('/user/delete', data, options)
  }

  listUsers(data?: IListReq, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IUserItem>>('/user/list', data, options)
  }

  searchUsers(data: ISearchUsersReq, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IUserItem>>('/user/search', data, options)
  }

  listGroupUsers(data: IListGroupUserReq, options?: IPDSRequestConfig) {
    return this.postAPI<IListGroupUserRes>('/user/list_group_user', data, options)
  }

  async generalSearchUsers(data: IUserGeneralSearchReq, options?: IPDSRequestConfig) {
    const {items, next_marker} = await this.postAPI<IListRes<IUserItem>>('/user/general_search', data, options)
    const userList = formatGeneralUserItems(items)
    return {next_marker, items: userList}
  }

  async generalGetUser(
    data: {user_id?: string; extra_return_info?: TUserExtraReturnInfoType},
    options?: IPDSRequestConfig,
  ) {
    let info = await this.postAPI<IUserItem>('/user/general_get', data, options)
    return formatGeneralUserItems([info])[0]
  }

  async importUser(data: IImportUserReq, options?: IPDSRequestConfig) {
    return await this.postAPI<IUserItem>('/user/import', data, options)
  }
}

export function formatGeneralUserItems(items: IUserItem[]) {
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

export type TUserStatus = 'enabled' | 'disabled'
export type TUserRole = 'user' | 'admin' | 'superadmin' | 'subdomain_super_admin' | 'subdomain_admin'
export type TUserExtraReturnInfoType = Array<'group' | 'drive'>

export interface ISearchUsersReq extends IListReq {
  email?: string
  nick_name?: string // 用户昵称，最长128字符
  user_name?: string // 用户名称，最长128字符
  phone?: string
  role?: TUserRole
  status?: TUserStatus // 昵称-模糊搜索，最长128字符
  nick_name_for_fuzzy?: string // 用户昵称模糊搜索
}
export interface ICreateUserReq {
  user_id: string
  user_name?: string
  status?: TUserStatus
  role?: TUserRole
  nick_name?: string
  description?: string
  avatar?: string // 头像，可以为 http(s)开头的url 或 base64url
  email?: string
  phone?: string
  user_data?: string // 用户自定义数据，最长1024字符
  group_info_list?: {group_id: string}[]
}

// 用户可以修改自己的description，nick_name，avatar；管理员在用户基础上还可修改status（可以修改任意用户）；
// 超级管理员在管理员基础上还可修改role（可以修改任意用户）。
export interface IUpdateUserReq {
  user_id: string
  status?: TUserStatus
  role?: TUserRole
  phone?: string
  nick_name?: string
  description?: string
  expired_at?: number
  avatar?: string // 头像地址, http形式时，以http:// 或https:// 作为前缀，参数长度最长4KB, data形式时，以data://作为前缀，base64编码，参数长度最长300KB
  email?: string
  user_data?: any
  group_info_list?: {group_id: string}[]
}

export interface IUserItem {
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

  creator?: string
  [key: string]: any
}

export interface IListGroupUserReq extends IListReq {
  group_id?: string // 查询某个group下的user和group
  member_type?: TMemberType // 可选参数：user、group  不传默认都返回
  extra_return_info?: TUserExtraReturnInfoType //  管理员才可以传此字段 可 选枚举：drive、group， 表示返回用户的drive或group信息。 如果此字段带上group会大幅减慢查询速度，调用一次不能超过30条记录。
}
export interface IListGroupUserRes {
  readonly group_items?: IGroupItem[]
  readonly user_items?: IUserItem[]
  readonly next_marker?: any
}

export interface IUserGeneralSearchReq {
  nick_name?: string
  nick_name_for_fuzzy?: string
  parent_group_id_list?: string[]
  direct_parent_group_id?: string
  extra_return_info?: TUserExtraReturnInfoType
}

export interface IImportUserReq {
  authentication_type: TAuthenticationType
  authentication_display_name?: string
  identity: string
  extra?: string
  custom_identity?: string
  nick_name?: string
  auto_create_drive?: boolean
  drive_total_size?: number
  parent_group_id?: string
  plain_password?: string
  deny_change_password_by_self?: boolean
  need_change_password_next_login?: boolean
}
