import {UploadAPIClient} from '../http/UploadAPIClient'
import {StandardSerialUploader} from '../loaders/StandardSerialUploader'
import {IContextExt, IUpCheckpoint, IUpConfig, IPDSRequestConfig} from '../Types'
import * as http_util from '../utils/HttpUtil'

export class StandardSerialUploadTask extends StandardSerialUploader {
  constructor(
    checkpoint: IUpCheckpoint,
    configs: IUpConfig,
    upload_api_client: UploadAPIClient,
    custom_context_ext: IContextExt,
    request_config?: IPDSRequestConfig,
  ) {
    super(
      checkpoint,
      configs,
      {
        http_client: upload_api_client,
        http_util,
      },
      custom_context_ext,
      request_config,
    )
  }
}
