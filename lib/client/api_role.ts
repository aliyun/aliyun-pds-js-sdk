import {IContextExt, IListReq, IClientParams, IPDSRequestConfig} from '../Types'
import {PDSGroupApiClient} from './api_group'

export class PDSRoleApiClient extends PDSGroupApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }
  // 分配角色，当前支持将用户设置为团队管理员角色
  async assignRole(data: IAssignRoleReq, options?: IPDSRequestConfig) {
    return await this.postAPI<any>('/role/assign', data, options)
  }
  // 取消分配角色，当前仅支持取消团队管理员角色
  async cancelAssignRole(data: ICancelAssignRoleReq, options?: IPDSRequestConfig) {
    return await this.postAPI<any>('/role/cancel_assign', data, options)
  }
  // 列举已分配的角色列表，比如可通过团队ID获取团队管理员角色列表。
  async listAssignments(data: IListAssignmentsReq, options?: IPDSRequestConfig) {
    return await this.postAPI<any>('/role/list_assignment', data, options)
  }
}

export interface IIdentity {
  identity_type: 'IT_User' | 'IT_Group' | string
  identity_id: string
}
export interface IAssignRoleReq {
  identity: IIdentity // 唯一身份标识，当前仅支持设置某个用户作为团队管理员
  role_id: 'SystemGroupAdmin' | string // 给用户分配的角色ID，当前仅支持填：SystemGroupAdmin（团队管理员）
  manage_resource_type: 'RT_Group' | string // 管理的资源类型，当前仅支持：RT_Group（团队）
  manage_resource_id: string //  管理的资源ID，当前仅支持填Group ID。
}

export interface ICancelAssignRoleReq extends IAssignRoleReq {}
export interface IListAssignmentsReq extends IListReq {
  manage_resource_type?: 'RT_Group' | string // 管理的资源类型，当前仅支持： RT_Group，查询某群组的管理员授权列表
  manage_resource_id?: string // 管理的资源ID，比如群组的ID
}
export interface IAssignment {
  domain_id: string
  identity: IIdentity
  role_id: string

  manage_resource_type?: 'RT_Group' | string // 管理的资源类型，当前仅支持： RT_Group，查询某群组的管理员授权列表
  manage_resource_id?: string // 管理的资源ID，比如群组的ID
  creator?: string
  created_at?: Date
}
export interface IListAssignmentsRes {
  assignment_list: IAssignment[]
  next_marker?: string
}
