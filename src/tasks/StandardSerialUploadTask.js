/** @format */

import {StandardSerialUploader} from '../loaders/StandardSerialUploader'
import * as file_util from '../utils/FileUtil'
import * as http_util from '../utils/HttpUtil'

export class StandardSerialUploadTask extends StandardSerialUploader {
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
