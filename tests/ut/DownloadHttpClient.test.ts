/** @format */

import assert = require('assert')
import {DownloadHttpClient} from '../../src/http/DownloadHttpClient'

import * as Context from '../../src/context/NodeContext'
import {IHttpClient} from '../../src/http/HttpClient'

describe('DownloadHttpClient', function () {
  it('axiosDownloadPart throw error', async () => {
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
    let client = new DownloadHttpClient(httpClient)

    try {
      await client.axiosDownloadPart({})
      assert(false, 'should throw')
    } catch (e) {
      assert(e.message == '===')
    }
  })

  it('axiosDownloadPart stream body', async () => {
    let httpClient: IHttpClient = {
      context: Context,
      postAPI(): Promise<any> {
        return Promise.resolve('https://abc.abc.abc.123')
      },
    }

    let client = new DownloadHttpClient(httpClient)

    try {
      await client.axiosDownloadPart({
        method: 'GET',
        url: 'https://pds-daily21453-valueadd.oss-cn-hangzhou.aliyuncs.com/lt/43A8F0A8AA83EEAA4F7A926FD975AB3E492A7046_5253880__sha1_daily21453/264_480p/media.m3u8',
      })
      assert(false, 'should throw')
    } catch (e) {
      assert(e.response.data.startsWith('<?xml'))
      assert(e.message == 'Request failed with status code 403')
    }
  })
})
