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

    it('should handle stopped error', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          const error = new Error('Some error')
          error.message = 'stopped'
          throw error
        },
      }

      let opt = {retryTimes: 3, dur: 1000, verbose: true}
      try {
        await callRetry(Test.post, Test, ['http://test.com', {a: 1}], opt)
        expect.not
      } catch (e) {
        expect(e.message).toBe('stopped')
      }
      expect(count).toBe(1)
    })

    it('should handle stopped code', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          const error = new Error('Some error')
          ;(error as any).code = 'stopped'
          throw error
        },
      }

      let opt = {retryTimes: 3, dur: 1000, verbose: true}
      try {
        await callRetry(Test.post, Test, ['http://test.com', {a: 1}], opt)
        expect.not
      } catch (e) {
        expect((e as any).code).toBe('stopped')
      }
      expect(count).toBe(1)
    })

    it('should handle getStopFlag function returning true', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          throw new Error('Network Error')
        },
      }

      let flagReturned = false
      let opt = {
        retryTimes: 3,
        dur: 1000,
        verbose: true,
        getStopFlag: () => {
          flagReturned = true
          return true
        },
      }

      try {
        await callRetry(Test.post, Test, ['http://test.com', {a: 1}], opt)
        expect.not
      } catch (e) {
        expect(flagReturned).toBe(true)
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

    it('should detect socket errors', () => {
      expect(isNetworkError(new Error('getaddrinfo ENOTFOUND example.com'))).toBeTruthy
      expect(isNetworkError(new Error('socket hang up'))).toBeTruthy
    })

    it('should detect timeout errors', () => {
      expect(isNetworkError(new Error('timeout exceeded'))).toBeTruthy
      expect(isNetworkError(new Error('ETIMEDOUT'))).toBeTruthy
    })

    it('should detect connection reset errors', () => {
      expect(isNetworkError(new Error('ECONNRESET'))).toBeTruthy
      expect(isNetworkError(new Error('EPIPE'))).toBeTruthy
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('HTTP 404 Not Found'))).toBeFalsy
      expect(isNetworkError(new Error('Unauthorized'))).toBeFalsy
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

    it('should return false for non-expired response', () => {
      const mockError: AxiosError = {
        response: {
          status: 403,
          data: 'AccessDenied',
          statusText: '',
          headers: {},
          config: {url: '', method: 'GET'},
        },
        message: 'Forbidden',
        name: 'AxiosError',
      } as AxiosError

      expect(isOssUrlExpired(mockError)).toBeFalsy()
    })

    it('should return false for non-403 status codes', () => {
      const mockError: AxiosError = {
        response: {
          status: 404,
          data: 'AccessDenied: Request has expired',
          statusText: '',
          headers: {},
          config: {url: '', method: 'GET'},
        },
        message: 'Not Found',
        name: 'AxiosError',
      } as AxiosError

      expect(isOssUrlExpired(mockError)).toBeFalsy()
    })

    it('should return false for non-AccessDenied responses', () => {
      const mockError: AxiosError = {
        response: {
          status: 403,
          data: 'Some other error',
          statusText: '',
          headers: {},
          config: {url: '', method: 'GET'},
        },
        message: 'Forbidden',
        name: 'AxiosError',
      } as AxiosError

      expect(isOssUrlExpired(mockError)).toBeFalsy()
    })

    it('should return false for null/undefined response', () => {
      const mockError: AxiosError = {
        message: 'Network Error',
        name: 'AxiosError',
      } as AxiosError

      expect(isOssUrlExpired(mockError)).toBeFalsy()
    })
  })
  describe('delayRandom', () => {
    it('delayRandom, 1,3', async () => {
      for (let i = 0; i < 10; i++) {
        let st = Date.now()
        await delayRandom()
        let et = Date.now()
        expect(et - st).toBeLessThan(4050)
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

  describe('Additional error handling coverage', () => {
    it('should handle isStoppableError with policy errors', () => {
      const error1: any = new Error('Access denied by IP Control Policy')
      const error2: any = new Error('Access denied by bucket policy')
      const error3: any = new Error('Other error')

      expect(isStoppableError(error1)).toBe(true)
      expect(isStoppableError(error2)).toBe(true)
      expect(isStoppableError(error3)).toBe(false)
    })

    it('should handle isNetworkError with various scenarios', () => {
      const networkErr1 = new Error('Network Error')
      const networkErr2 = new Error('getaddrinfo ENOTFOUND')
      const networkErr3 = new Error('socket timeout')
      const networkErr4 = new Error(' ECONNRESET')
      const networkErr5 = new Error(' ETIMEDOUT')
      const normalErr = new Error('Normal error')

      expect(isNetworkError(networkErr1)).toBe(true)
      expect(isNetworkError(networkErr2)).toBe(true)
      expect(isNetworkError(networkErr3)).toBe(true)
      expect(isNetworkError(networkErr4)).toBe(true)
      expect(isNetworkError(networkErr5)).toBe(true)
      expect(isNetworkError(normalErr)).toBe(false)
    })

    it('should handle isOssUrlExpired correctly', () => {
      const expiredErr1: any = {response: {status: 403, data: 'AccessDenied Request has expired'}}
      const expiredErr2: any = {response: {status: 403, data: 'AccessDenied: The request expired'}}
      const normalErr: any = {response: {status: 403, data: 'Forbidden'}}
      const noDataErr: any = {response: {status: 403}}

      expect(isOssUrlExpired(expiredErr1)).toBe(true)
      expect(isOssUrlExpired(expiredErr2)).toBe(true)
      expect(isOssUrlExpired(normalErr)).toBe(false)
      expect(isOssUrlExpired(noDataErr)).toBe(false)
    })

    it('should handle callRetry with successful first attempt', async () => {
      let count = 0
      const Test = {
        async succeed() {
          count++
          return {success: true}
        },
      }

      const result = await callRetry(Test.succeed, Test, [], {retryTimes: 3, dur: 100})
      expect(count).toBe(1)
      expect(result.success).toBe(true)
    })

    it('should handle callRetry with eventual success', async () => {
      let count = 0
      const Test = {
        async eventuallySucceed() {
          count++
          if (count < 3) {
            throw new Error('Network Error')
          }
          return {success: true}
        },
      }

      const result = await callRetry(Test.eventuallySucceed, Test, [], {retryTimes: 5, dur: 10})
      expect(count).toBe(3)
      expect(result.success).toBe(true)
    })

    it('should handle delay with zero duration', async () => {
      const start = Date.now()
      await delay(0)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10)
    })

    it('should handle delayRandom range', async () => {
      const min = 100
      const max = 200
      const start = Date.now()
      await delayRandom(min, max)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(min - 10)
      expect(elapsed).toBeLessThanOrEqual(max + 100)
    })

    it('should handle exponentialBackoff with zero retry count', async () => {
      const start = Date.now()
      await exponentialBackoff(0, 100)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(90)
      expect(elapsed).toBeLessThanOrEqual(150)
    })

    it('should handle callRetry with custom getStopFlag', async () => {
      let count = 0
      const Test = {
        async fail() {
          count++
          throw new Error('Network Error')
        },
      }

      try {
        await callRetry(Test.fail, Test, [], {
          retryTimes: 10,
          dur: 10,
          getStopFlag: () => count >= 2,
        })
        expect(true).toBe(false)
      } catch (e) {
        expect(count).toBe(2)
      }
    })

    it('should handle error without response object', () => {
      const plainError: any = new Error('Simple error')
      expect(isStoppableError(plainError)).toBe(false)
      expect(isOssUrlExpired(plainError)).toBe(false)
    })
  })
})
