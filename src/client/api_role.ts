/** @format */
import {IContext, IClientParams, AxiosRequestConfig} from '../Types'
import {PDSGroupApiClient} from './api_group'

export class PDSRoleApiClient extends PDSGroupApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }
}
