import Axios, {AxiosError} from 'axios'
import {
  callRetry,
  delay,
  isStoppableError,
  isNetworkError,
  isOssUrlExpired,
  delayRandom,
  exponentialBackoff,
} from '../../lib/utils/HttpUtil'
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
  describe('delayRandom', () => {
    it('delayRandom, 1,3', async () => {
      for (let i = 0; i < 10; i++) {
        let st = Date.now()
        await delayRandom()
        let et = Date.now()
        expect(et - st).toBeLessThan(4001)
      }
    })
    it('delayRandom, 0,1', async () => {
      for (let i = 0; i < 10; i++) {
        let st = Date.now()
        await delayRandom(0, 1000)
        let et = Date.now()
        expect(et - st).toBeLessThan(1000 + 100)
      }
    })
  })

  describe('exponentialBackoff', () => {
    it('should delay with exponential growth', async () => {
      const baseDelay = 1000
      const maxDelay = 30000
      const retryCount = 3

      const startTime = Date.now()
      await exponentialBackoff(retryCount, baseDelay, maxDelay)
      const elapsed = Date.now() - startTime

      // 计算预期的延迟时间: baseDelay * 2^retryCount
      const expectedDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)

      // 允许10ms误差范围
      expect(elapsed).toBeGreaterThanOrEqual(expectedDelay - expectedDelay * 0.1)
      expect(elapsed).toBeLessThanOrEqual(expectedDelay + expectedDelay * 0.1)
    })

    it('should not exceed max delay', async () => {
      const baseDelay = 1000
      const maxDelay = 3000
      const retryCount = 9 // 足够大的重试次数，确保会触发最大延迟限制

      const startTime = Date.now()
      await exponentialBackoff(retryCount, baseDelay, maxDelay, 10)
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThanOrEqual(maxDelay - maxDelay * 0.1)
      expect(elapsed).toBeLessThanOrEqual(maxDelay + maxDelay * 0.1)
    })

    it('should handle zero retry count', async () => {
      const baseDelay = 1000
      const retryCount = 0

      const startTime = Date.now()
      await exponentialBackoff(retryCount, baseDelay)
      const elapsed = Date.now() - startTime

      const expectedDelay = baseDelay * Math.pow(2, retryCount)
      expect(elapsed).toBeGreaterThanOrEqual(expectedDelay - expectedDelay * 0.1)
      expect(elapsed).toBeLessThanOrEqual(expectedDelay + expectedDelay * 0.1)
    })

    it('should work with custom base delay', async () => {
      const baseDelay = 500
      const retryCount = 2

      const startTime = Date.now()
      await exponentialBackoff(retryCount, baseDelay)
      const elapsed = Date.now() - startTime

      const expectedDelay = baseDelay * Math.pow(2, retryCount)
      expect(elapsed).toBeGreaterThanOrEqual(expectedDelay - expectedDelay * 0.1)
      expect(elapsed).toBeLessThanOrEqual(expectedDelay + expectedDelay * 0.1)
    })

    it('should work with very small base delay', async () => {
      const baseDelay = 10
      const retryCount = 3

      const startTime = Date.now()
      await exponentialBackoff(retryCount, baseDelay)
      const elapsed = Date.now() - startTime

      const expectedDelay = baseDelay * Math.pow(2, retryCount)
      expect(elapsed).toBeGreaterThanOrEqual(expectedDelay - expectedDelay * 0.1)
      expect(elapsed).toBeLessThanOrEqual(expectedDelay + expectedDelay * 0.1)
    })
  })
})
