import Axios, {AxiosError} from 'axios'
import {callRetry, delay, isStoppableError, isNetworkError, isOssUrlExpired} from '../../lib/utils/HttpUtil'
import {describe, expect, it} from 'vitest'

describe('HttpUtil', function () {
  it('delay', async () => {
    let st = Date.now()
    await delay(1000)
    expect(Date.now() - st >= 1000).toBe(true)
  })

  describe('retryCall', () => {
    it('http error', async () => {
      let url = `https://statics.aliyunpds.com/a`

      var Test = {
        async get(url: string) {
          return await Axios.get(url)
        },
      }
      let opt = {retryTimes: 1, dur: 1000, verbose: true}
      try {
        await callRetry(Test.get, Test, [url], opt)
        expect.not
      } catch (e2) {
        let e = e2 as Error
        expect(e.message).toBe('Request failed with status code 404')
      }
    })

    it('throw Network Error', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          throw new Error('Network Error')
        },
      }

      let opt = {retryTimes: 3, dur: 1000, verbose: true}
      let st = Date.now()
      try {
        await callRetry(Test.post, Test, ['http://sssss.xxx', {a: 1}], opt)
        expect.not
      } catch (e2) {
        let e = e2 as Error
        expect(e.message).toBe('Network Error')
      }
      expect(count).toBe(3)
      expect(Date.now() - st > (opt.retryTimes - 1) * opt.dur).toBe(true)
    })

    it('throw others', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          throw new Error('Others')
        },
      }

      let opt = {retryTimes: 3, dur: 1000, verbose: true}
      // let st = Date.now()
      try {
        await callRetry(Test.post, Test, ['http://sssss.xxx', {a: 1}], opt)
        expect.not
      } catch (e2) {
        let e = e2 as Error
        expect(e.message).toBe('Others')
      }
      expect(count).toBe(1)
      // assert(Date.now() - st > opt.retryTimes * opt.dur)
    })

    it('getStopFlag return true', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          throw new Error('Network Error')
        },
      }

      let opt = {
        retryTimes: 2,
        dur: 1000,
        verbose: true,
        getStopFlag: () => true,
      }

      try {
        await callRetry(Test.post, Test, ['http://sssss.xxx', {a: 1}], opt)
        expect.not
      } catch (e2) {
        let e = e2 as Error
        expect(e.message).toBe('Network Error')
      }
      expect(count).toBe(1)
    })
  })

  // describe('getStreamBody', () => {
  //   it('string', async () => {
  //     assert('abc' == (await HttpUtil.getStreamBody('abc')))
  //   })

  //   it('stream', done => {
  //     http.get('http://www.aliyun.com', async res => {
  //       let s = await HttpUtil.getStreamBody(res)

  //       assert(s.startsWith('<!DOCTYPE'))

  //       done()
  //     })
  //   })
  // })

  describe('isStoppableError', () => {
    it('isStoppableError', () => {
      let b1 = isStoppableError(new Error('Access denied by IP Control Policy'))
      expect(b1).toBe(true)

      let b2 = isStoppableError(new Error('Access denied by bucket policy'))
      expect(b2).toBe(true)

      let b3 = isStoppableError(new Error('x'))
      expect(b3).toBe(false)
    })
  })
  describe('isNetworkError', () => {
    it('isNetworkError', () => {
      expect(isNetworkError(new Error('Network Error'))).toBeTruthy
    })

    it('ClientError', () => {
      let g = {
        message: 'Network Error [code: ClientError]',
        name: 'PDSError',
        code: 'ClientError',
        type: 'ClientError',
      }
      expect(isNetworkError(g)).toBeTruthy
    })
  })
  describe('isOssUrlExpired', () => {
    it('isOssUrlExpired', async () => {
      let url =
        'https://pds-daily21453-valueadd.oss-cn-hangzhou.aliyuncs.com/lt/43A8F0A8AA83EEAA4F7A926FD975AB3E492A7046_5253880__sha1_daily21453/264_480p/media.m3u8'
      try {
        await Axios.get(url)
        expect.not
      } catch (e2) {
        let e = e2 as AxiosError
        expect(isOssUrlExpired(e)).toBeTruthy
      }
    })
  })
})
