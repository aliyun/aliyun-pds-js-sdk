/** @format */

import {Downloader} from '../loaders/Downloader'
import * as calc_util from '../utils/CalcUtil'
import * as http_util from '../utils/HttpUtil'

export class DownloadTask extends Downloader {
  constructor(checkpoint, configs = {}, download_http_client, custom_context, axios_options) {
    super(
      checkpoint,
      configs,
      {
        http_client: download_http_client,
        http_util,
        calc_util,
      },
      custom_context,
      axios_options,
    )
  }
}
