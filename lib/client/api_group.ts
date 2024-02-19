import {IContextExt, IClientParams, IPDSRequestConfig, IListReq, IListRes} from '../Types'
import {IMembershipReq, TMemberType, PDSMembershipApiClient} from './api_membership'
import {IUserItem} from './api_user'

export class PDSGroupApiClient extends PDSMembershipApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  async createGroup(data: ICreateGroupReq, options?: IPDSRequestConfig) {
    const info = await this.postAPI<IGroupItem>('/group/create', data, options)
    return info
  }

  async deleteGroup(data: {group_id: string}, options?: IPDSRequestConfig) {
    const info = await this.postAPI<void>('/group/delete', data, options)
    return info
  }

  async updateGroup(data: IUpdateGroupReq, options?: IPDSRequestConfig) {
    const info = await this.postAPI<IGroupItem>('/group/update', data, options)
    return info
  }

  /**
   * @param data @deprecated  Please use updateGroup instead
   */
  async updateGroupName(data: {group_id: string; name: string}, options?: IPDSRequestConfig) {
    const info = await this.postAPI<IGroupItem>('/group/update_name', data, options)
    return info
  }

  getGroup(data: {group_id: string}, options?: IPDSRequestConfig) {
    return this.postAPI<IGroupItem>('/group/get', data, options)
  }

  listGroups(data?: IListReq, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IGroupItem>>('/group/list', data, options)
  }

  searchGroups(data: IListReq & {group_name: string}, options?: IPDSRequestConfig) {
    return this.postAPI<IListRes<IGroupItem>>('/group/search', data, options)
  }

  /**
   * 列举一个 group 下的所有子 group或user,
   * @deprecated Please use listGroupMembers instead
   * @param data
   * @param options
   * @returns
   */
  async listMembers(
    data: IListReq & Pick<IMembershipReq, 'group_id' | 'member_type'>,
    options?: IPDSRequestConfig,
  ): Promise<IListRes> {
    const {items, next_marker} = await this.listDirectChildMemberships(data, options)
    if (!items) return {items: [], next_marker}

    const ids = items.map(e => e.sub_group_id)
    const {items: allGroups} = await this.listAllGroups()
    const res: any[] = []
    allGroups.forEach(e => {
      if (ids.indexOf(e.group_id) !== -1) {
        res.push(e)
      }
    })
    return {items: res, next_marker}
  }

  /**
   * @description 获取所有group
   */
  listAllGroups(data: IListReq = {}, options?: IPDSRequestConfig) {
    return this.listAllItems<IGroupItem, IListReq>('/group/list', data, options)
  }

  /** 添加用户到group */
  addGroupMember(data: IAddGroupMemberReq, options?: IPDSRequestConfig) {
    return this.postAPI<any>('/group/add_member', data, options)
  }
  /** 从 group 移除用户 */
  removeGroupMember(data: IRemoveGroupMemberReq, options?: IPDSRequestConfig) {
    return this.postAPI<any>('/group/remove_member', data, options)
  }

  listGroupMembers(
    data: IListReq & {group_id: string; member_type?: TMemberType},
    options?: IPDSRequestConfig,
  ): Promise<IListGroupMembersRes> {
    return this.postAPI<IListGroupMembersRes>('/group/list_member', data, options)
  }
}

export interface IAddGroupMemberReq {
  /** 目标群组ID，表示将成员添加到目标群组下 */
  group_id: string
  /* 成员类型，当前只能添加用户，群组可以在创建时直接选择加入的父群组
  user（用户）
  注意：群组只能作为一个群组的成员，不能同时成为多个群组的成员。 用户可以同时成为多个群组的成员
  */
  member_type: 'user'
  /** 成员ID， 当member_type为user时，此字段填对应的userID。*/
  member_id: string
}
export interface IRemoveGroupMemberReq extends IAddGroupMemberReq {}

export interface ICreateGroupReq {
  group_name: string
  description?: string
  is_root?: boolean
  parent_group_id?: string
}
export interface IUpdateGroupReq {
  group_name?: string
  group_id: string
  description?: string
}

export interface IGroupItem {
  domain_id: string
  group_id: string
  group_name: string
  description?: string
  created_at: number
  updated_at?: number
  permission?: any
  creator?: string
}

export interface IListGroupMembersRes {
  next_marker?: string
  user_items?: IUserItem[]
  group_items?: IGroupItem[]
}
