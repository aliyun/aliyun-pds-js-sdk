/** @format */

import {PDSError, initFields} from '../../src/utils/PDSError'
import assert = require('assert')
import Axios from 'axios'
import * as Config from '../ft/conf'

describe('PDSError', function () {
  this.timeout(5000)
  describe('initFields', () => {
    const {domain_id} = Config['domains']['StandardMode']
    it('initAxiosError client error', async () => {
      try {
        await Axios.get('http://abc.cccc:10011')
        assert(false)
      } catch (e) {
        let obj = initFields(e)
        assert(obj.code == 'ClientError')
        assert(obj.message == 'getaddrinfo ENOTFOUND abc.cccc')
        assert(obj.stack.includes(' at '))
      }
    })
    it('initAxiosError api notfound', async () => {
      try {
        await Axios.get(`http://${domain_id}.api.pds.aliyunccp.com/v2/user/abc`, {timeout: 2000})
        assert(false)
      } catch (e) {
        let obj = initFields(e)
        assert(obj.status == 404)
        assert(obj.reqId)
        assert(obj.code == 'ServerError')
        assert(obj.message == 'API not found with `GET /v2/user/abc`')
        assert(obj.stack.includes(' at '))
      }
    })
    it('initAxiosError server error', async () => {
      try {
        await Axios.post(`http://${domain_id}.api.pds.aliyunccp.com/v2/drive/get`)
        assert(false)
      } catch (e) {
        let obj = initFields(e)
        assert(obj.status == 401)
        assert(obj.reqId)
        assert(obj.code == 'AccessTokenInvalid')
        assert(obj.message == 'AccessToken is invalid. ErrValidateTokenFailed')
        assert(obj.stack.includes(' at '))
      }
    })

    it('Error', async () => {
      let obj = initFields(new Error('test'), 'Notfound')
      assert(!obj.status)
      assert(!obj.reqId)
      assert(obj.code == 'Notfound')
      assert(obj.message == 'test')
      assert(obj.stack.includes(' at '))
    })
    it('PDSError', async () => {
      let obj = initFields(new PDSError('test'), 'Notfound', 404, 'req-id')
      assert(obj.status == 404)
      assert(obj.reqId == 'req-id')
      assert(obj.code == 'Notfound')
      assert(obj.message == 'test')
      assert(obj.stack.includes(' at '))
    })
  })

  describe('PDSError', () => {
    it('string', () => {
      try {
        throw new PDSError('test', 'Notfound', 404, 'req-id')
      } catch (e) {
        assert(e.status == 404)
        assert(e.reqId == 'req-id')
        assert(e.code == 'Notfound')
        assert(e.message == 'test')
        assert(e.stack.includes(' at '))
      }
    })
    it('Error in PDSError', () => {
      try {
        throw new PDSError(new Error('test'), 'Notfound', 404, 'req-id')
      } catch (e) {
        assert(e.status == 404)
        assert(e.reqId == 'req-id')
        assert(e.code == 'Notfound')
        assert(e.message == 'test')
        assert(e.stack.includes(' at '))
      }
    })
    it('PDSError in PDSError', () => {
      try {
        let ee = new PDSError('test', 'Notfound', 404, 'req-id')
        throw new PDSError(ee)
      } catch (e) {
        assert(e.status == 404)
        assert(e.reqId == 'req-id')
        assert(e.code == 'Notfound')
        assert(e.message == 'test')
        // assert(e.message == '[404] Notfound:test [requestId]:req-id')
        assert(e.stack.includes(' at '))
      }
    })
    it('PDSError in PDSError2', () => {
      try {
        let ee = new PDSError('test', 'Notfound')
        throw new PDSError(ee)
      } catch (e) {
        console.log(e)
        assert(!e.status)
        assert(!e.reqId)
        assert(e.code == 'Notfound')
        assert(e.message == 'test')
        // assert(e.message == 'Notfound:test')
        assert(e.stack.includes(' at '))
      }
    })
  })
})
