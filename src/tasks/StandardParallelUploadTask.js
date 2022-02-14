/** @format */

import {StandardParallelUploader} from '../loaders/StandardParallelUploader'
import * as calc_util from '../utils/CalcUtil'
import * as http_util from '../utils/HttpUtil'

export class StandardParallelUploadTask extends StandardParallelUploader {
  constructor(checkpoint, configs = {}, upload_http_client, customContext) {
    super(
      checkpoint,
      configs,
      {
        http_client: upload_http_client,
        http_util,
        calc_util,
      },
      customContext,
    )
  }
}
