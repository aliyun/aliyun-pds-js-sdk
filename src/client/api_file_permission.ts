/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes, IListReq} from '../Types'
import {IFileItem} from './api_file'
import {PDSFileExtAPIClient} from './api_file_ext'

export class PDSFilePermissionClient extends PDSFileExtAPIClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  // 我的共享文件列表
  async listSharingFiles(data: IListReq = {}, options?: AxiosRequestConfig) {
    return await this.postAPI<IListRes<IFileItem>>('/file/list_sharing_file', data, options)
  }

  // 收到的共享文件列表
  async listReceivedShareFiles(data: IListReq = {}, options?: AxiosRequestConfig) {
    return await this.postAPI<IListRes<IFileItem>>('/file/list_received_file', data, options)
  }

  //  添加文件权限 （创建共享 更新共享）
  addFilePermission(data: IAddFilePermissionReq, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/file/add_permission', data, options)
  }

  //  移除文件权限 (删除共享)
  removeFilePermission(data: IAddFilePermissionReq, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/file/remove_permission', data, options)
  }

  // 获取文件的授权成员
  listFilePermissions(data: IListPermissionReq, options?: AxiosRequestConfig) {
    return this.postAPI<IPermissionStandard[]>('/file/list_permission', data, options)
  }

  // 继承自上级目录的权限  （共享情况）
  listFileInheritPermissions(data: IListPermissionReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IListInheritRes>>('/file/list_inherit_permission', data, options)
  }

  // 用户维度，获取共享信息
  listUserPermissions(data: IUserPermissionReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IListPermissionRes>>('/file/list_user_permission', data, options)
  }

  // 列举当前用户管理的共享记录
  async listManageSharingFiles(data: IListReq = {}, options?: AxiosRequestConfig) {
    return await this.postAPI<IListRes<IFileItem>>('/file/list_manage_sharing_file', data, options)
  }
}

interface IAddFilePermissionReq {
  drive_id: string
  file_id: string
  member_list: IPermissionStandard[]
}

interface IPermissionStandard {
  identity: IIdentityRes
  expire_time: number // 时间戳
  role_id: string
  disinherit_sub_group: boolean
}

// 列举共享成员 标准
interface IListPermissionReq {
  drive_id: string
  file_id: string
}

type TUserType = 'self' | 'group'
interface IUserPermissionReq {
  user_id: string
  type?: TUserType
}

interface IIdentityRes {
  identity_id: string
  identity_name?: string
  identity_type: string
}
interface IListPermissionRes {
  disinherit_sub_group: boolean
  expire_time: number // 时间戳
  identity: IIdentityRes
  role_id: string
  domain_id: string
  drive_id: string
  file_id: string
  file_full_path: string
  creator: string
  created_at: number
  can_access: boolean
}
interface IListInheritRes {
  file_id: string
  member: IListPermissionRes
}

export {
  IAddFilePermissionReq,
  IPermissionStandard,
  IListPermissionReq,
  IUserPermissionReq,
  IIdentityRes,
  IListPermissionRes,
  IListInheritRes,
}
