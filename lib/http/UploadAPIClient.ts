import {IUploadAPIClient, IPDSRequestConfig} from '../Types'
import {IHttpClient} from './HttpClient'

/**
 * UploadTask 专用的 HttpClient
 * 需要具备5个请求方法，如果要自定义实现，务必实现这5个方法。
 */

export class UploadAPIClient implements IUploadAPIClient {
  http_client: IHttpClient
  constructor(httpClient: IHttpClient) {
    this.http_client = httpClient
  }
  /* istanbul ignore next */
  getFile(opt, request_config: IPDSRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get', opt, request_config)
  }
  /* istanbul ignore next */
  createFile(opt, request_config: IPDSRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/create', opt, request_config)
  }
  /* istanbul ignore next */
  completeFile(opt, request_config: IPDSRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/complete', opt, request_config)
  }
  /* istanbul ignore next */
  getFileUploadUrl(opt, request_config: IPDSRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get_upload_url', opt, request_config)
  }
  /* istanbul ignore next */
  listFileUploadedParts(opt, request_config: IPDSRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/list_uploaded_parts', opt, request_config)
  }
  /* istanbul ignore next */
  axiosUploadPart(request_config: IPDSRequestConfig = {}) {
    return this.http_client.sendOSS(request_config)
  }
}
