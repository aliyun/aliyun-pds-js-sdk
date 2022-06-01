/** @format */

import {getStreamBody} from '../utils/HttpUtil'
import {IUploadHttpClient, AxiosRequestConfig} from '../Types'
import {IHttpClient} from './HttpClient'
import {PDSError} from '../utils/PDSError'

/**
 * UploadTask 专用的 HttpClient
 * 需要具备5个请求方法，如果要自定义实现，务必实现这5个方法。
 *
 * @format
 */

export class UploadHttpClient implements IUploadHttpClient {
  http_client: IHttpClient
  constructor(httpClient: IHttpClient) {
    this.http_client = httpClient
  }
  /* istanbul ignore next */
  getFile(opt, options: AxiosRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get', opt, options)
  }
  /* istanbul ignore next */
  createFile(opt, options: AxiosRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/create', opt, options)
  }
  /* istanbul ignore next */
  completeFile(opt, options: AxiosRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/complete', opt, options)
  }
  /* istanbul ignore next */
  getFileUploadUrl(opt, options: AxiosRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get_upload_url', opt, options)
  }
  /* istanbul ignore next */
  listFileUploadedParts(opt, options: AxiosRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/list_uploaded_parts', opt, options)
  }
  async axiosUploadPart(options: AxiosRequestConfig = {}) {
    let {isNode, Axios, https, AxiosNodeAdapter} = this.http_client.context
    try {
      if (isNode) {
        let result = await Axios({
          adapter: AxiosNodeAdapter,
          httpsAgent: new https.Agent({rejectUnauthorized: false}),
          ...options,
        })
        return result
      } else {
        return await Axios(options)
      }
    } catch (e) {
      if (isNode && e.response && e.response.data) {
        let data = await getStreamBody(e.response.data)
        e.response.data = data
      }
      //todo 日志
      throw new PDSError(e)
    }
  }
}
