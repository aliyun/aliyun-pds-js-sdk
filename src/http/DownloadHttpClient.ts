/** @format */

import {getStreamBody} from '../utils/HttpUtil'
import {IDownloadHttpClient, AxiosRequestConfig} from '../Types'
import {IHttpClient} from './HttpClient'
import {PDSError} from '../utils/PDSError'

/**
 * DownloadTask 专用的 HttpClient
 * 需要具备2个请求方法，如果要自定义实现，务必实现这2个方法。
 *
 * @format
 */

export class DownloadHttpClient implements IDownloadHttpClient {
  http_client: IHttpClient
  constructor(httpClient: IHttpClient) {
    this.http_client = httpClient
  }
  /* istanbul ignore next */
  getDownloadUrl(opt, options: AxiosRequestConfig = {}) {
    opt.donot_emit_error = true
    return this.http_client.postAPI('/file/get_download_url', opt, options)
  }
  async axiosDownloadPart(options: AxiosRequestConfig = {}) {
    let {isNode, Axios, https, AxiosNodeAdapter} = this.http_client.context
    try {
      let result = await Axios({
        adapter: AxiosNodeAdapter,
        httpsAgent: new https.Agent({rejectUnauthorized: false}),
        ...options,
      })
      return result
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
