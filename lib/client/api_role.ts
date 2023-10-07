import {IContextExt, IClientParams} from '../Types'
import {PDSGroupApiClient} from './api_group'

export class PDSRoleApiClient extends PDSGroupApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }
}
