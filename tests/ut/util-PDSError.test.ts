import {PDSError, initFields, parseErrorXML, parseErrorData} from '../../lib/utils/PDSError'

import {describe, expect, it} from 'vitest'

import Axios from 'axios'

describe('PDSError', function () {
  describe('initFields', () => {
    const {domain_id} = {domain_id: 'daily100018'}

    it('initFields client error', async () => {
      try {
        await Axios.get('http://abc.cccc:10011')
        expect.not
      } catch (e) {
        let obj = initFields(e)
        expect(obj.code).toBe('ClientError')
        // 浏览器报错 Network Error
        // node.js 报错 getaddrinfo ENOTFOUND abc.cccc
        expect(['getaddrinfo ENOTFOUND abc.cccc [code: ClientError]', 'Network Error [code: ClientError]']).toContain(
          obj.message,
        )
      }
    })
    it('initFields api notfound', async () => {
      try {
        await Axios.get(`http://${domain_id}.api.pds.aliyunccp.com/v2/user/abc`, {timeout: 5000})
        expect(false)
      } catch (e) {
        let obj = initFields(e)
        expect(obj.status).toBe(404)
        expect(!!obj.reqId).toBe(true)
        expect(obj.code).toBe('I404NF')
        expect(obj.message).toContain('API not found with `GET /v2/user/abc` [status: 404] [code: I404NF] [reqId:')
      }
    })
    it('initFields server error', async () => {
      try {
        await Axios.post(`http://${domain_id}.api.pds.aliyunccp.com/v2/drive/get`)
        expect('should throw').toBeFalsy()
      } catch (e) {
        let obj = initFields(e)
        expect(obj.status).toBe(401)
        expect(!!obj.reqId).toBe(true)
        expect(obj.code == 'AccessTokenInvalid')
        expect(obj.message == 'AccessToken is invalid. ErrValidateTokenFailed')
      }
    })
    it('initFields oss server error', async () => {
      try {
        await Axios({
          method: 'GET',
          url: 'https://pds-daily21453-valueadd.oss-cn-hangzhou.aliyuncs.com/lt/43A8F0A8AA83EEAA4F7A926FD975AB3E492A7046_5253880__sha1_daily21453/264_480p/media.m3u8',
        })
        expect('should throw').toBeFalsy()
      } catch (e) {
        let obj = initFields(e)
        expect(obj.status).toBe(403)
        expect(e.response?.data.startsWith('<?xml')).toBe(true)
        expect(!!obj.reqId).toBe(true)
        expect(obj.code).toBe('AccessDenied')
        expect(obj.message).toContain(
          'You have no right to access this object because of bucket acl. [status: 403] [code: AccessDenied] [reqId:',
        )
      }
    })

    it('Error', async () => {
      let obj = initFields(new Error('test'), 'Notfound')
      expect(!obj.status).toBe(true)
      expect(!obj.reqId).toBe(true)
      expect(obj.code).toBe('Notfound')
      expect(obj.message).toBe('test [code: Notfound]')
    })
    it('PDSError', async () => {
      let obj = initFields(new PDSError('test'), 'Notfound', 404, 'req-id')

      expect(obj.status).toBe(404)
      expect(obj.reqId).toBe('req-id')
      expect(obj.code).toBe('Notfound')
      expect(obj.message).toBe('test [code: ClientError]')
    })
  })

  describe('PDSError constructor', () => {
    it('string', () => {
      try {
        throw new PDSError('test', 'Notfound', 404, 'req-id')
      } catch (e) {
        expect(e.status).toBe(404)
        expect(e.reqId).toBe('req-id')
        expect(e.code).toBe('Notfound')
        expect(e.message).toBe('test [status: 404] [code: Notfound] [reqId: req-id]')
        expect(e.stack).contain(' at ')
      }
    })
    it('Error in PDSError', () => {
      try {
        throw new PDSError(new Error('test'), 'Notfound', 404, 'req-id')
      } catch (e) {
        expect(e.status).toBe(404)
        expect(e.reqId).toBe('req-id')
        expect(e.code).toBe('Notfound')
        expect(e.message).toBe('test [status: 404] [code: Notfound] [reqId: req-id]')
        expect(e.stack).contain(' at ')
      }
    })
    it('PDSError in PDSError', () => {
      try {
        const ee = new PDSError('test', 'Notfound', 404, 'req-id')
        expect(ee.message).toBe('test [status: 404] [code: Notfound] [reqId: req-id]')
        const ee2 = new PDSError(ee)
        expect(ee2.message).toBe('test [status: 404] [code: Notfound] [reqId: req-id]')
        throw ee2
      } catch (e) {
        expect(e.status).toBe(404)
        expect(e.reqId).toBe('req-id')
        expect(e.code).toBe('Notfound')
        expect(e.message).toBe('test [status: 404] [code: Notfound] [reqId: req-id]')
        expect(e.stack).contain(' at ')
      }
    })
    it('PDSError in PDSError short', () => {
      try {
        let ee = new PDSError('test', 'Notfound')
        expect(ee.message).toBe('test [code: Notfound]')
        let ee2 = new PDSError(ee)
        expect(ee2.message).toBe('test [code: Notfound]')
        throw ee2
      } catch (e) {
        expect(!e.status).toBe(true)
        expect(!e.reqId).toBe(true)
        expect(e.code).toBe('Notfound')
        expect(e.message).toBe('test [code: Notfound]')
        expect(e.stack!).contain(' at ')
      }
    })
    it('json', () => {
      let e = {
        message: 'Test Error',
        status: 401,
        code: 'test',
      }

      let e2 = new PDSError(e)

      expect(e2.name).toBe('PDSError')
      expect(e2.type).toBe('ClientError')
      expect(e2.status).toBe(401)
      expect(e2.code).toBe('test')
    })
  })

  describe('parseErrorXML', () => {
    it('parseErrorXML', () => {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <Error>
      <Code>AccessDenied</Code>
      <Message>Access denied by bucket policy.</Message>
      <RequestId>62966EE063EA8B3735D6B6C7</RequestId>
      <HostId>test.oss-cn-hangzhou.aliyuncs.com</HostId>
      <Bucket>test-data-bucket</Bucket>
      <User>334*****11</User>
    </Error>`

      let obj = parseErrorXML(xml)

      expect(obj.code).toBe('AccessDenied')
      expect(obj.message).toBe('Access denied by bucket policy.')
      expect(obj.reqId).toBe('62966EE063EA8B3735D6B6C7')
    })
  })
  describe('parseErrorData', () => {
    it('parseErrorData', () => {
      expect(parseErrorData('abc')).toBe('abc')
      expect(parseErrorData({a: 1})).toBe(JSON.stringify({a: 1}))
      expect(parseErrorData(1)).toBe(1 + '')
    })
  })
})
