import {describe, expect, it} from 'vitest'
import {validateParams, HttpClient} from '../../lib/http/HttpClient'

describe('src/http/HttpClient', () => {
  describe('validateParams', () => {
    it('validateParams', () => {
      try {
        validateParams()
      } catch (e) {
        expect(e.message).contain('params is required')
      }

      try {
        validateParams({})
      } catch (e) {
        expect(e.message).contain('contextExt is required')
      }
      try {
        validateParams({}, {})
      } catch (e) {
        expect(e.message).contain('api_endpoint or auth_endpoint is required')
      }
      try {
        validateParams({api_endpoint: 'https://xx', token_info: {}}, {})
      } catch (e) {
        expect(e.message).contain('token_info.access_token is required')
      }

      try {
        validateParams({api_endpoint: 'https://xx', token_info: {access_token: 'xx', expire_time: 'x'}}, {})
      } catch (e) {
        expect(e.message).contain('Invalid token_info.expire_time')
      }

      try {
        validateParams(
          {api_endpoint: 'https://xx', token_info: {access_token: 'xx', expire_time: 0}, refresh_token_fun: 1},
          {},
        )
      } catch (e) {
        expect(e.message).contain('Invalid refresh_token_fun')
      }
    })
  })

  describe('request', () => {
    it('return data', async () => {
      var mockContext = {
        axiosSend: () => {
          return {data: {a: 1}}
        },
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      let data = await client.request('https://xxx', 'POST', '/v2/file/list', {})
      expect(data.a).toBe(1)
    })
    it('no token', async () => {
      var mockContext = {
        axiosSend: () => {
          
        },
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)
 
      let resolveOnError
      client.on('error',(err)=>{
        resolveOnError(err)
      })
      let prom = new Promise(a=>{
        resolveOnError = a
      })
      
      try {
        await client.request('https://xxx', 'POST', '/v2/file/list', {})
        expect(2).toBe(1)
      } catch (e) {
        console.log(e)
        expect(e.code == 'TokenExpired')
      }

      let err = await prom 
      expect(err.code).toBe('AccessTokenInvalid')
    })

    it('TokenExpired', async () => {
      var mockContext = {
        axiosSend: () => {
          throw {
            status: 401,
            response: {
              status: 401,
              data: {
                code: 'AccessTokenInvalid',
              },
            },
          }
        },
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      try {
        await client.request('https://xxx', 'POST', '/v2/file/list', {})
        expect(2).toBe(1)
      } catch (e) {
        expect(e.code == 'TokenExpired')
      }
    })
    it('TokenExpired refresh', async () => {
      let c = 0
      var mockContext = {
        axiosSend: () => {
          c++
          if (c == 1) {
            throw {
              isAxiosError: true,
              status: 401,
              response: {
                status: 401,
                data: {
                  code: 'AccessTokenInvalid',
                  message: 'xx',
                },
                headers: {
                  'x-ca-request-id': 'id-1',
                  'content-type': 'application/json',
                },
              },
            }
          } else {
            return {
              data: {
                ok: '123',
              },
            }
          }
        },
      }
      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          refresh_token_fun: () => {
            return {access_token: 'xx', expire_time: new Date(Date.now() + 1000000).toISOString()}
          },
        },
        mockContext,
      )

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      let data = await client.request('https://xxx', 'POST', '/v2/file/list', {})
      expect(data.ok).toBe('123')
    })

    it('ShareLinkTokenInvalid', async () => {
      var mockContext = {
        axiosSend: () => {
          throw {
            status: 401,
            response: {
              status: 401,
              data: {
                code: 'ShareLinkTokenInvalid',
              },
            },
          }
        },
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      try {
        await client.request('https://xxx', 'POST', '/v2/file/list', {})
        expect(2).toBe(1)
      } catch (e) {
        expect(e.code == 'ShareLinkTokenInvalid')
      }
    })

    it('ShareLinkTokenInvalid fun', async () => {
      let c = 0
      var mockContext = {
        axiosSend: () => {
          c++
          if (c == 1)
            throw {
              isAxiosError: true,
              status: 401,
              response: {
                status: 401,
                data: {
                  code: 'ShareLinkTokenInvalid',
                  message: 'xx',
                },
                headers: {
                  'x-ca-request-id': 'id-1',
                  'content-type': 'application/json',
                },
              },
            }
          else
            return {
              data: {
                ok: 1,
              },
            }
        },
      }
      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          refresh_share_token_fun: () => {
            return 'abc'
          },
        },
        mockContext,
      )

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      let data = await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 3)

      expect(data.ok).toBe(1)
      expect(client.share_token).toBe('abc')

      expect(c == 2)
    })
  })
})
