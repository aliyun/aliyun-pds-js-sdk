/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListReq, IListRes} from '../Types'
import {IMembershipReq, PDSMembershipApiClient} from './api_membership'

export class PDSGroupApiClient extends PDSMembershipApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  async createGroup(data: ICreateGroupReq, options?: AxiosRequestConfig) {
    const info = await this.postAPI<IGroupItem>('/group/create', data, options)

    return info
  }

  async deleteGroup(data: {group_id: string}, options?: AxiosRequestConfig) {
    const info = await this.postAPI<void>('/group/delete', data, options)

    return info
  }

  async updateGroup(data: IUpdateGroupReq, options?: AxiosRequestConfig) {
    const info = await this.postAPI<IGroupItem>('/group/update', data, options)

    return info
  }

  async updateGroupName(data: {group_id: string; name: string}, options?: AxiosRequestConfig) {
    const info = await this.postAPI<IGroupItem>('/group/update_name', data, options)

    return info
  }

  getGroup(data: {group_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IGroupItem>('/group/get', data, options)
  }

  listGroups(data?: IListReq, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IGroupItem>>('/group/list', data, options)
  }

  searchGroups(data: IListReq & {group_name: string}, options?: AxiosRequestConfig) {
    return this.postAPI<IListRes<IGroupItem>>('/group/search', data, options)
  }

  // 列举一个 group 下的所有子 group或user,
  async listMembers(
    data: IListReq & Pick<IMembershipReq, 'group_id' | 'member_type'>,
    options?: AxiosRequestConfig,
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
  listAllGroups(data?: IListReq, options?: AxiosRequestConfig) {
    return this.listAllItems<IGroupItem, IListReq>('/group/list', data, options)
  }
}

interface ICreateGroupReq {
  group_name: string
  description?: string
  is_root?: boolean
  parent_group_id?: string
}
interface IUpdateGroupReq {
  group_name?: string
  group_id: string
  description?: string
}

interface IGroupItem {
  domain_id: string
  group_id: string
  group_name: string
  description: string
  created_at: Date
  updated_at: Date
  permission: any
}

export {ICreateGroupReq, IUpdateGroupReq, IGroupItem}
