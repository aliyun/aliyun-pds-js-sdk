/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes, IListReq} from '../Types'
import {PDSRoleApiClient} from './api_role'

export class PDSShareApiClient extends PDSRoleApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  // 收到的共享 (托管模式)
  async listReceivedShares(data?: IListReceivedSharesReq, options?: AxiosRequestConfig) {
    const {items = []} = await this.postAPI<IListRes<IShareItem>>('/share/list_received', data, options)
    // items.forEach(n => {
    //   formatShareData(n)
    // })
    return {items}
  }

  async listAllReceivedShares(data?: IListReceivedSharesReq, options?: AxiosRequestConfig) {
    const {items = []} = await this.listAllItems<IShareItem, IListReceivedSharesReq>(
      '/share/list_received',
      data,
      options,
    )

    // items.forEach(n => {
    //   formatShareData(n)
    // })
    return {items}
  }

  // 创建共享
  createShare(data: ICreateShareReq, options?: AxiosRequestConfig) {
    return this.postAPI<ICreateShareRes>('/share/create', data, options)
  }

  // 更新共享
  updateShare(data: IUpdateShareReq, options?: AxiosRequestConfig) {
    return this.postAPI<IShareItem>('/share/update', data, options)
  }

  // 删除共享
  deleteShare(data: {share_id: string}, options?: AxiosRequestConfig) {
    return this.postAPI<void>('/share/delete', data, options)
  }

  async getShare(data: {share_id: string}, options?: AxiosRequestConfig) {
    const result = await this.postAPI<IShareItem>('/share/get', data, options)
    // formatShareData(result)
    return result
  }

  async listShares(data?: IListSharesReq, options?: AxiosRequestConfig): Promise<IListRes<IShareItem>> {
    const {items = [], next_marker} = await this.postAPI<IListRes<IShareItem>>('/share/list', data, options)
    // items.forEach(n => {
    //   formatShareData(n)
    // })
    return {items, next_marker}
  }
  async listAllShares(data = {}, options?: AxiosRequestConfig): Promise<IListRes<IShareItem>> {
    const {items = []} = await this.listAllItems<IShareItem, IListSharesReq>('/share/list', data, options)
    // items.forEach(n => {
    //   formatShareData(n)
    // })
    return {items}
  }
}

// 老GET权限对应的新权限 只应用在当前文件中
// const PER_FILE_GET: Array<string> = ['FILE.PREVIEW', 'FILE.DOWNLOAD', 'FILE.VISIBLE', 'FILE.COPY']

// share数据进行格式化，达到各个环境兼容性要求，比如权限
// function formatShareData(n: IShareItem) {
// if (n.permissions && n.permissions.includes('FILE.GET')) {
//   let p = [...n.permissions, ...PER_FILE_GET]
//   p = p.filter(e => e !== 'FILE.GET')
//   n.permissions = Array.from(new Set(p))
// }
// n.expired = n.expired === undefined ? n.expiration.getTime() < Date.now() : n.expired
// }

type TShareStatus = 'enabled' | 'disabled'
type TSharePermission =
  | 'FILE.PREVIEW'
  | 'FILE.GET'
  | 'FILE.LIST'
  | 'FILE.VISIBLE'
  | 'FILE.CREATE'
  | 'FILE.UPDATE'
  | 'FILE.COPY'
  | 'FILE.DOWNLOAD'
  | 'FILE.DELETE'
  | 'FILE.MOVE'
  | 'FILE.SHARELINK'
  | 'FILE.SHARE'
  | 'FILE.TRASH'
  | 'FILE.EDIT'

interface IListReceivedSharesReq extends IListReq {
  owner?: string
}
interface IListSharesReq extends IListReq {
  creator?: string
  owner?: string
}

interface IShareItem {
  // 返回值
  drive_id: string
  domain_id: string
  created_at: Date
  updated_at: Date
  status: string // available enabled

  creator?: string
  description?: string
  expiration?: Date
  expired?: boolean
  owner?: string
  owner_type?: string
  permissions?: TSharePermission[]
  share_file_id?: string
  share_file_path?: string
  share_id?: string
  share_name?: string
  share_policy?: ISharePolicyItem[]

  [propName: string]: any
}

// 创建共享 托管
interface ICreateShareReq {
  drive_id: string
  owner: string
  // owner_type: string // group share
  description?: string
  expiration?: Date
  permissions?: TSharePermission[]
  share_file_path: string
  share_name?: string
  status: TShareStatus
}
interface IUpdateShareReq {
  description?: string
  expiration?: Date
  permissions?: TSharePermission[]

  share_id: string
  share_name?: string
  status?: TShareStatus

  share_policy?: ISharePolicyItem[]
}
interface ISharePolicyItem {
  file_path: string
  permission_inheritable: boolean
  permission_list: TSharePermission[]
  permission_type: 'allow' | 'deny'
}

interface ICreateShareRes {
  // 托管模式返回值
  domain_id: string
  share_id: string
}

export {TShareStatus, TSharePermission, IListSharesReq, IShareItem, ICreateShareReq, IUpdateShareReq, ICreateShareRes}
