import {WebDownloader} from '../loaders/WebDownloader'
import * as http_util from '../utils/HttpUtil'
import {IContextExt, IDownCheckpoint, IDownConfig, IDownloadAPIClient, IPDSRequestConfig} from '../Types'

export class WebDownloadTask extends WebDownloader {
  constructor(
    checkpoint: IDownCheckpoint,
    configs: IDownConfig,
    download_api_client: IDownloadAPIClient,
    custom_context_ext: IContextExt,
    request_config?: IPDSRequestConfig,
  ) {
    super(
      checkpoint,
      configs,
      {
        http_client: download_api_client,
        http_util,
      },
      custom_context_ext,
      request_config,
    )
  }
}
