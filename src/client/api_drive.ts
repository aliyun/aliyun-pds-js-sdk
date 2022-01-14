/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes, IListReq} from '../Types'
import {PDSBaseAPIClient} from './api_base'
import {formatSize, formatUsedSpace} from '../utils/Formatter'

export class PDSDriveAPIClient extends PDSBaseAPIClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  searchDrives(data: ISearchDrivesReq = {}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/search', data, options)
  }

  getDrive(data: {drive_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IDriveItem>('/drive/get', data, options)
  }

  createDrive(data: ICreateDriveReq, options?: AxiosRequestConfig) {
    return this.postAPI<ICreateDriveRes>('/drive/create', data, options)
  }
  updateDrive(data: IUpdateDriveReq, options?: AxiosRequestConfig) {
    return this.postAPI<IDriveItem>('/drive/update', data, options)
  }
  deleteDrive(data: {drive_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/drive/delete', data, options)
  }

  listMyDrives(data: IListReq = {}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/list_my_drives', data, options)
  }
  listDrives(data: IListDrivesReq = {}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/list', data, options)
  }

  async listAllDrives(data: IListDrivesReq = {}, options?: AxiosRequestConfig, type?: string) {
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

  // async listAllDrives(data: IListDriveReq = {}, options?: AxiosRequestConfig, type?: string) {
  //   let {items=[]} = await this.listAllItems<IDriveItem, IListDriveReq>('/drive/list', data, options)
  //    items = items
  //     .filter(it => !type || it.owner_type === type)
  //     .map(it => {
  //       const u = {...it}
  //       if (it.total_size) {
  //         u.total = num2text(it.total_size)
  //         u.used = num2text(it.used_size)
  //         u.used_total = divide(it.used_size, it.total_size, true)
  //       }
  //       return u
  //     })
  //   return {items}
  // }

  async listMyGroupDrives(data: IListReq = {}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IDriveItem>>('/drive/list_my_group_drive', data, options)
  }

  async listAllMyGroupDrives(data: IListReq = {}, options?: AxiosRequestConfig) {
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

type TDriveType = 'normal' | 'large'
type TOwnerType = 'group' | 'user'
type TDriveStatus = 'enabled' | 'disabled'

// 请求相关接口 start
interface ISearchDrivesReq extends IListReq {
  drive_name?: string // 全量搜索时不传
  owner_type?: TOwnerType
}
interface IListDrivesReq extends IListReq {
  owner_type?: TOwnerType
  owner?: string
}

interface ICreateDriveReq {
  // 是否默认drive, 只允许设置一个默认drive 默认值 : false样例 : true
  default?: boolean

  description?: string
  drive_name: string
  drive_type?: TDriveType
  relative_path?: string

  status?: TDriveStatus
  owner: string
  owner_type?: TOwnerType
  // encrypt_mode?: string // “server”

  store_id?: string // HostingMode 有效
  total_size?: number
}

interface IUpdateDriveReq {
  drive_id: string // 必须

  drive_name?: string
  // encrypt_data_access?: boolean

  // encrypt_mode?: string // server
  description?: string
  status?: TDriveStatus
  total_size?: number

  // [propName: string]: any
}

// 返回相关接口 start

interface ICreateDriveRes {
  drive_id: string
  domain_id: string
  subdomain_id?: string

  [propName: string]: any
}

interface IDriveItem {
  domain_id?: string
  subdomain_id?: string
  drive_id?: string

  drive_name: string
  drive_type: TDriveType

  owner_type?: TOwnerType
  owner?: string
  creator?: string

  relative_path?: string
  status?: TDriveStatus
  store_id?: string
  total_size: number
  used_size: number
  description?: string
  encrypt_mode?: string
  encrypt_data_access?: string

  created_at: Date
  updated_at: Date

  action_list?: string[]
  permission?: string[]

  [propName: string]: any
}

export {
  TDriveType,
  TOwnerType,
  TDriveStatus,
  ISearchDrivesReq,
  IListDrivesReq,
  ICreateDriveReq,
  IUpdateDriveReq,
  ICreateDriveRes,
  IDriveItem,
}
