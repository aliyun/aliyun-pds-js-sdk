/** @format */

import {HostingUploader} from '../loaders/HostingUploader'
import * as file_util from '../utils/FileUtil'
import * as http_util from '../utils/HttpUtil'

export class HostingUploadTask extends HostingUploader {
  constructor(checkpoint, configs = {}, upload_http_client, customContext) {
    super(
      checkpoint,
      configs,
      {
        http_client: upload_http_client,
        http_util,
        file_util,
      },
      customContext,
    )
  }
}
