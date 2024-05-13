import {IContextExt, IClientParams, IPDSRequestConfig, IListRes, IListReq} from '../Types'
import {PDSBaseAPIClient} from './api_base'
import {formatSize, formatUsedSpace} from '../utils/Formatter'

export class PDSDriveAPIClient extends PDSBaseAPIClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  searchDrives(data: ISearchDrivesReq = {}, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/search', data, options)
  }

  getDrive(data: {drive_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<IDriveItem>('/drive/get', data, options)
  }

  createDrive(data: ICreateDriveReq, options?: IPDSRequestConfig) {
    return this.postAPI<ICreateDriveRes>('/drive/create', data, options)
  }
  updateDrive(data: IUpdateDriveReq, options?: IPDSRequestConfig) {
    return this.postAPI<IDriveItem>('/drive/update', data, options)
  }
  deleteDrive(data: {drive_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<void>('/drive/delete', data, options)
  }

  getDefaultDrive(data: {user_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<IDriveItem>('/drive/get_default_drive', data, options)
  }

  listMyDrives(data: IListReq = {}, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/list_my_drives', data, options)
  }
  listDrives(data: IListDrivesReq = {}, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/list', data, options)
  }
  async listAllMyDrives(data: IListReq = {}, options?: IPDSRequestConfig) {
    const {items} = await this.listAllItems<IDriveItem, IListReq>('/drive/list_my_drives', data, options)
    // items.forEach(n => {
    //   n.expired = n.expired === undefined ? Date.parse(n.expiration) < Date.now() : n.expired
    // })
    return {items}
  }
  async listAllDrives(data: IListDrivesReq = {}, options?: IPDSRequestConfig, type?: string) {
    let {items = []} = await this.listAllItems<IDriveItem, IListDrivesReq>('/drive/list', data, options)
    items = items
      .filter(it => !type || it.owner_type === type)
      .map(it => {
        const u = {...it}
        if (it.total_size) {
          u.total = formatSize(it.total_size)
          u.used = formatSize(it.used_size)
          u.used_total = formatUsedSpace(it.used_size, it.total_size, true)
        }
        return u
      })
    return {items}
  }

  async listMyGroupDrives(data: IListReq = {}, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/list_my_group_drive', data, options)
  }

  async listAllMyGroupDrives(data: IListReq = {}, options?: IPDSRequestConfig) {
    const {items, root_group_drive} = await this.listAllItems<IDriveItem, IListReq>(
      '/drive/list_my_group_drive',
      data,
      options,
      'root_group_drive',
    )
    // items.forEach(n => {
    //   n.expired = n.expired === undefined ? Date.parse(n.expiration) < Date.now() : n.expired
    // })
    return {items, root_group_drive}
  }
}

export type TDriveType = 'normal' | 'large'
export type TOwnerType = 'group' | 'user'
export type TDriveStatus = 'enabled' | 'disabled'

// 请求相关接口 start
export interface ISearchDrivesReq extends IListReq {
  drive_name?: string // 全量搜索时不传
  owner?: string
  owner_type?: TOwnerType
}

export interface IListDrivesReq extends IListReq {
  owner_type?: TOwnerType
  owner?: string
}

export interface ICreateDriveReq {
  drive_name: string // 空间名称，最长 128 字符
  owner: string
  owner_type: TOwnerType

  // 是否默认drive, 只允许设置一个默认drive 默认值 : false样例 : true
  default?: boolean
  description?: string // 描述，最长 1024 字符
  drive_type?: TDriveType

  status?: TDriveStatus
  total_size?: number // 总大小，单位为字节，不限制大小时填 -1

  disable_assign_group_default_permission?: boolean // 表示创建团队云盘不自动授权
}

export interface IUpdateDriveReq {
  drive_id: string
  drive_name?: string // 空间名称，最长 128 字符
  description?: string // 描述，最长 1024 字符
  status?: TDriveStatus
  total_size?: number // 总大小，单位为字节，不限制大小时填 -1
}

// 返回相关接口 start

export interface ICreateDriveRes {
  drive_id: string
  domain_id: string
  subdomain_id?: string

  [propName: string]: any
}

export interface IDriveItem {
  domain_id?: string
  subdomain_id?: string
  drive_id?: string

  drive_name: string
  drive_type: TDriveType
  description?: string
  owner_type?: TOwnerType
  owner?: string

  // relative_path?: string
  status?: TDriveStatus
  // store_id?: string
  total_size: number
  used_size: number

  // encrypt_mode?: string
  // encrypt_data_access?: string

  created_at: string
  creator?: string

  // action_list?: string[]
  // permission?: string[]

  [propName: string]: any
}
