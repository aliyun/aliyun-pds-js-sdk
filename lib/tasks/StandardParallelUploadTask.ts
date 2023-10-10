import {UploadAPIClient} from '../http/UploadAPIClient'
import {StandardParallelUploader} from '../loaders/StandardParallelUploader'
import {IContextExt, IPDSRequestConfig, IUpCheckpoint, IUpConfig} from '../Types'
import * as http_util from '../utils/HttpUtil'

export class StandardParallelUploadTask extends StandardParallelUploader {
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
