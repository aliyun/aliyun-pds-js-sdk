/** @format */
const {Axios, http} = require('../../src/context/NodeContext')
import HttpUtil = require('../../src/utils/HttpUtil')
import assert = require('assert')

describe('HttpUtil', function () {
  this.timeout(60 * 1000)

  it('delay', async () => {
    let st = Date.now()
    await HttpUtil.delay(1000)
    assert(Date.now() - st >= 1000)
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
        await HttpUtil.callRetry(Test.get, Test, [url], opt)
        assert(false, 'should throw ')
      } catch (e) {
        assert(e.message == 'Request failed with status code 404')
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
        await HttpUtil.callRetry(Test.post, Test, ['http://sssss.xxx', {a: 1}], opt)
        assert(false, 'should throw ')
      } catch (e) {
        assert(e.message == 'Network Error')
      }
      assert(count == 3)
      assert(Date.now() - st > (opt.retryTimes - 1) * opt.dur)
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
        await HttpUtil.callRetry(Test.post, Test, ['http://sssss.xxx', {a: 1}], opt)
        assert(false, 'should throw ')
      } catch (e) {
        assert(e.message == 'Others')
      }
      assert(count == 1)
      // assert(Date.now() - st > opt.retryTimes * opt.dur)
    })

    it('getStopFlagFun return true', async () => {
      let count: number = 0
      var Test = {
        post(url: string, opt?: any) {
          count++
          throw new Error('Network Error')
        },
      }

      let opt = {retryTimes: 2, dur: 1000, verbose: true, getStopFlagFun: () => true}

      try {
        await HttpUtil.callRetry(Test.post, Test, ['http://sssss.xxx', {a: 1}], opt)
        assert(false, 'should throw ')
      } catch (e) {
        assert(e.message == 'Network Error')
      }
      assert(count == 1)
    })
  })

  describe('getStreamBody', () => {
    it('string', async () => {
      assert('abc' == (await HttpUtil.getStreamBody('abc')))
    })

    it('stream', done => {
      http.get('http://www.aliyun.com', async res => {
        let s = await HttpUtil.getStreamBody(res)

        assert(s.startsWith('<!DOCTYPE'))

        done()
      })
    })
  })
})
