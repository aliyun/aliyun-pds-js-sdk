/** @format */

import {IContext, IClientParams} from '../Types'
import {FileLoaderClient} from './FileLoaderClient'

export class PDSClient extends FileLoaderClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }
}
