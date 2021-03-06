/** @format */

import assert = require('assert')
import {UploadHttpClient} from '../../src/http/UploadHttpClient'
import * as Context from '../../src/context/NodeContext'
import {IHttpClient} from '../../src/http/HttpClient'

describe('UploadHttpClient', function () {
  it('axiosUploadPart throw error', async () => {
    let httpClient: IHttpClient = {
      context: {
        isNode: true,
        https: {Agent: () => {}},
        Axios() {
          let e = {response: {data: ''}, message: '==='}
          throw e
        },
      },
      postAPI(): Promise<any> {
        return Promise.resolve('https://abc.abc.abc.123')
      },
    }

    let client = new UploadHttpClient(httpClient)

    try {
      await client.axiosUploadPart({})
      assert(false, 'should throw')
    } catch (e) {
      assert(e.message == '===')
    }
  })

  it('axiosUploadPart stream body', async () => {
    let httpClient: IHttpClient = {
      context: Context,
      postAPI(): Promise<any> {
        return Promise.resolve('https://abc.abc.abc.123')
      },
    }

    let client = new UploadHttpClient(httpClient)

    try {
      await client.axiosUploadPart({
        method: 'GET',
        url: 'https://pds-daily21453-valueadd.oss-cn-hangzhou.aliyuncs.com/lt/43A8F0A8AA83EEAA4F7A926FD975AB3E492A7046_5253880__sha1_daily21453/264_480p/media.m3u8',
      })
      assert(false, 'should throw')
    } catch (e) {
      assert(e.status == 403)
      assert(e.code == 'AccessDenied')
      assert(e.reqId)
      assert(e.response.data.startsWith('<?xml'))
      assert(e.message == 'You have no right to access this object because of bucket acl.')
    }
  })
})
