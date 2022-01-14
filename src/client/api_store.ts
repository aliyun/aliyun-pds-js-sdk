/** @format */
import {IListRes, IListReq} from '..'
import {IContext, IClientParams, AxiosRequestConfig} from '../Types'
import {PDSShareLinkApiClient} from './api_sharelink'

export class PDSStoreApiClient extends PDSShareLinkApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  /**
   * @description  仅在托管模式下使用
   * @param {*} [data]
   * @param {AxiosRequestConfig} [options]
   */
  async listStores(data?: IListReq, options?: AxiosRequestConfig) {
    const {items = []} = await this.postAPI<IListRes<IStoreItem>>('/domain/list_stores', data, options)

    items.forEach((n: IStoreItem) => {
      n.oss_path = `oss://${n.bucket}/${n.base_path}`
    })
    return {items}
  }

  /**
   * @description  仅在托管模式下使用
   * @param {*} [data]
   * @param {AxiosRequestConfig} [options]
   */
  async listAllStores(options?: AxiosRequestConfig) {
    const {items = []} = await this.listAllItems<IStoreItem, IListReq>('/domain/list_stores', {}, options)

    items.forEach((n: IStoreItem) => {
      n.oss_path = `oss://${n.bucket}/${n.base_path}`
    })
    return {items}
  }
}

interface IStoreItem {
  accelerate_endpoint?: string //''
  base_path?: string //
  bucket: string //
  cdn_endpoint?: string //''
  cdn_url_auth_key?: string //''
  customized_accelerate_endpoint?: string //''
  customized_cdn_endpoint?: string //''
  customized_endpoint?: string //''
  customized_internal_endpoint?: string //''
  endpoint: string //
  internal_endpoint?: string //''
  location?: string //''
  ownership: string //'custom'
  policy: string //''
  role_arn?: string //''
  store_id: string //'8a962668b82643b4a9ad1d22d25748b5'
  type: string // 'oss'

  oss_path?: string //

  [key: string]: any
}

export {IStoreItem}
