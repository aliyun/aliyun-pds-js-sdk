/** @format */

import {Downloader} from '../loaders/Downloader'
import * as file_util from '../utils/FileUtil'
import * as http_util from '../utils/HttpUtil'

export class DownloadTask extends Downloader {
  constructor(checkpoint, configs = {}, download_http_client, customContext) {
    super(
      checkpoint,
      configs,
      {
        http_client: download_http_client,
        http_util,
        file_util,
      },
      customContext,
    )
  }
}
