/** @format */

import {HostingUploader} from '../loaders/HostingUploader'
import * as calc_util from '../utils/CalcUtil'
import * as http_util from '../utils/HttpUtil'

export class HostingUploadTask extends HostingUploader {
  constructor(checkpoint, configs = {}, upload_http_client, custom_context, axios_options) {
    super(
      checkpoint,
      configs,
      {
        http_client: upload_http_client,
        http_util,
        calc_util,
      },
      custom_context,
      axios_options,
    )
  }
}
