/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes, IListReq} from '../Types'
import {PDSFileAPIClient} from './api_file'

export class PDSMembershipApiClient extends PDSFileAPIClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  //创建membership
  createMembership(data: IMembershipReq, options?: AxiosRequestConfig) {
    return this.postAPI<IMembershipItem>('/membership/create', data, options)
  }

  //查看membership
  getMembership(data: IMembershipReq, options?: AxiosRequestConfig) {
    return this.postAPI<IMembershipItem>('/membership/get', data, options)
  }

  //更新membership
  updateMembership(data: Omit<IMembershipReq, 'is_root'>, options?: AxiosRequestConfig) {
    return this.postAPI<IMembershipItem>('/membership/update', data, options)
  }

  //删除membership
  deleteMembership(data: Omit<IMembershipReq, 'is_root'>, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/membership/delete', data, options)
  }

  //群成员关系判定
  hasMember(data: Omit<IMembershipReq, 'is_root'>, options?: AxiosRequestConfig) {
    return this.postAPI<{result: boolean}>('/membership/has_member', data, options)
  }

  //列举直接子成员
  listDirectChildMemberships(
    data: IListReq & Pick<IMembershipReq, 'group_id' | 'member_type'>,
    options?: AxiosRequestConfig,
  ) {
    return this.postAPI<IListRes<IMembershipItem>>('/membership/list_direct_child_memberships', data, options)
  }

  //列举直接父group  获取群成员所在的直接上一级的群列表
  listDirectParentMemberships(
    data: IListReq & Partial<Pick<IMembershipReq, 'group_id' | 'member_type' | 'sub_group_id' | 'user_id'>>,
    options?: AxiosRequestConfig,
  ) {
    return this.postAPI<IListRes<IMembershipItem>>('/membership/list_direct_parent_memberships', data, options)
  }
}

type TMemberType = 'user' | 'group'
type TMemberRole = 'member' | 'admin'
// memberShip参数
interface IMembershipReq {
  group_id: string // 群id
  user_id?: string // 用户id
  sub_group_id?: string // 子群id（不能是root group）
  member_type: TMemberType // 群成员类型 1、user：子用户 2、group：子群组
  member_role?: TMemberRole // 群成员角色：
  description?: string // 群描述
  is_root?: boolean // true则为顶层目录
}

interface IMembershipItem {
  domain_id: string
  group_id: string
  user_id: string
  sub_group_id: string
  member_type: TMemberType
  member_role: TMemberRole
  description: string
  created_at: Date
  updated_at: Date
}

export {TMemberType, TMemberRole, IMembershipReq, IMembershipItem}
