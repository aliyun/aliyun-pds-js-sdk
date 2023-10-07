import {IDownloadAPIClient, IPDSRequestConfig} from '../Types'
import {IHttpClient} from './HttpClient'

/**
 * DownloadTask 专用的 HttpClient
 * 需要具备2个请求方法，如果要自定义实现，务必实现这2个方法。
 */

export class DownloadAPIClient implements IDownloadAPIClient {
  http_client: IHttpClient
  constructor(httpClient: IHttpClient) {
    this.http_client = httpClient
  }
  /* istanbul ignore next */
  getFile(opt, request_config: IPDSRequestConfig = {}): Promise<any> {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get', opt, request_config)
  }
  /* istanbul ignore next */
  getDownloadUrl(opt, request_config: IPDSRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get_download_url', opt, request_config)
  }
  /* istanbul ignore next */
  axiosDownloadPart(request_config: IPDSRequestConfig = {}) {
    return this.http_client.sendOSS(request_config)
  }
}
