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

  describe('send', () => {
    it('Network Error retry', async () => {
      let count = 0
      var mockContext = {
        axiosSend: () => {
          count++
          if (count < 3) {
            throw new Error('Network Error [test]')
          } else
            throw {
              status: 401,
              response: {
                status: 401,
                data: {
                  code: 'Invalid',
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
        await client.send('POST', 'https://xxx/v2/file/list', {}, 5)
        expect(2).toBe(1)
      } catch (e) {
        expect(e.code == 'Invalid')
        expect(count).toBe(3)
      }
    })
    it('429 retry', async () => {
      let count = 0
      var mockContext = {
        axiosSend: () => {
          count++
          if (count < 3) {
            throw {
              status: 429,
              message: 'xxx',
              response: {
                status: 429,
                data: {
                  code: 'ShouldRetry',
                },
              },
            }
          } else {
            return {
              data: {
                key: 'abc',
              },
            }
          }
        },
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      let res = await client.send('POST', 'https://xxx/v2/file/list', {}, {returnResponse: true}, 5)
      expect(res.data.key).toBe('abc')
      expect(count).toBe(3)
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
        axiosSend: () => {},
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)

      let resolveOnError
      client.on('error', err => {
        resolveOnError(err)
      })
      let prom = new Promise(a => {
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

    it('Network Error retry', async () => {
      let count = 0
      var mockContext = {
        axiosSend: () => {
          count++
          if (count < 3) {
            throw new Error('Network Error [test]')
          } else
            throw {
              status: 401,
              response: {
                status: 401,
                data: {
                  code: 'Invalid',
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
        expect(e.code == 'Invalid')
        expect(count).toBe(3)
      }
    })
    it('429 retry', async () => {
      let count = 0
      var mockContext = {
        axiosSend: () => {
          count++
          if (count < 3) {
            throw {
              status: 429,
              message: 'xxx',
              response: {
                status: 429,
                data: {
                  code: 'ShouldRetry',
                },
              },
            }
          } else {
            return {
              data: {
                key: 'abc',
              },
            }
          }
        },
      }
      let client = new HttpClient({api_endpoint: 'https://xxx'}, mockContext)

      client.setToken({
        access_token: 'xx',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      })

      let obj = await client.request('https://xxx', 'POST', '/v2/file/list', {})
      expect(obj.key).toBe('abc')

      expect(count).toBe(3)
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

    it('remove token', () => {
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

      expect(client.token_info.access_token).toBe('xx')
      client.removeToken()
      expect(client.token_info).toBeUndefined()

      client.setShareToken('str')

      expect(client.share_token).toBe('str')
      client.removeShareToken()
      expect(client.share_token).toBeUndefined()
    })
  })

  describe('Additional coverage', () => {
    it('should handle validateParams with auth_endpoint', () => {
      try {
        validateParams({auth_endpoint: 'https://xxx'}, {})
        expect(true).toBe(true)
      } catch (e) {
        expect(false).toBe(true)
      }
    })

    it('should handle refresh_token_fun as function', () => {
      // Valid function should not throw
      let didNotThrow = false
      try {
        validateParams(
          {
            api_endpoint: 'https://xxx',
            token_info: {access_token: 'xx', expire_time: new Date(Date.now() + 1000000).toISOString()},
            refresh_token_fun: async () => ({}),
          },
          {},
        )
        didNotThrow = true
      } catch (e) {
        didNotThrow = false
      }
      expect(didNotThrow).toBe(true)
    })
  })

  describe('always_get_token_fun', () => {
    it('should skip token_info validation when always_get_token_fun is provided', () => {
      // 当提供 always_get_token_fun 时，不需要提供 token_info
      let didNotThrow = false
      try {
        validateParams(
          {
            api_endpoint: 'https://xxx',
            always_get_token_fun: async () => ({access_token: 'xx'}),
          },
          {},
        )
        didNotThrow = true
      } catch (e) {
        didNotThrow = false
      }
      expect(didNotThrow).toBe(true)
    })

    it('should use always_get_token_fun to get token in request', async () => {
      let callCount = 0
      const mockTokenInfo = {
        access_token: 'dynamic_token',
        expire_time: new Date(Date.now() + 1000000).toISOString(),
      }

      var mockContext = {
        axiosSend: req => {
          // 验证请求中使用了 always_get_token_fun 返回的 token
          expect(req.headers['Authorization']).toBe('Bearer dynamic_token')
          return {data: {success: true}}
        },
      }

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          always_get_token_fun: async () => {
            callCount++
            return mockTokenInfo
          },
        },
        mockContext,
      )

      // 不设置 token_info，应该通过 always_get_token_fun 获取
      let data = await client.request('https://xxx', 'POST', '/v2/file/list', {})
      expect(data.success).toBe(true)
      expect(callCount).toBe(1)
    })

    it('should call always_get_token_fun on each request', async () => {
      let callCount = 0

      var mockContext = {
        axiosSend: () => {
          return {data: {result: 'ok'}}
        },
      }

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          always_get_token_fun: async () => {
            callCount++
            return {
              access_token: `token_${callCount}`,
              expire_time: new Date(Date.now() + 1000000).toISOString(),
            }
          },
        },
        mockContext,
      )

      // 第一次请求
      await client.request('https://xxx', 'POST', '/v2/file/list', {})
      expect(callCount).toBe(1)

      // 第二次请求，应该再次调用 always_get_token_fun
      await client.request('https://xxx', 'POST', '/v2/file/list', {})
      expect(callCount).toBe(2)
    })

    it('should prefer always_get_token_fun over token_info', async () => {
      let capturedToken = null

      var mockContext = {
        axiosSend: req => {
          capturedToken = req.headers['Authorization']
          return {data: {result: 'ok'}}
        },
      }

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          token_info: {
            access_token: 'static_token',
            expire_time: new Date(Date.now() + 1000000).toISOString(),
          },
          always_get_token_fun: async () => ({
            access_token: 'dynamic_token',
            expire_time: new Date(Date.now() + 1000000).toISOString(),
          }),
        },
        mockContext,
      )

      await client.request('https://xxx', 'POST', '/v2/file/list', {})
      // 应该使用 always_get_token_fun 返回的 token，而不是 token_info
      expect(capturedToken).toBe('Bearer dynamic_token')
    })

    it('should handle always_get_token_fun returning undefined', async () => {
      var mockContext = {
        axiosSend: () => {
          return {data: {result: 'ok'}}
        },
      }

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          always_get_token_fun: async () => undefined,
        },
        mockContext,
      )

      let resolveOnError
      client.on('error', err => {
        resolveOnError(err)
      })
      let prom = new Promise(a => {
        resolveOnError = a
      })

      try {
        await client.request('https://xxx', 'POST', '/v2/file/list', {})
        expect(2).toBe(1)
      } catch (e) {
        // 当 always_get_token_fun 返回 undefined 时，checkRefreshToken 抛出 AccessTokenInvalid
        // 然后在 catch 块中由于没有 refresh_token_fun，会被转换为 TokenExpired
        expect(e.code).toBe('TokenExpired')
      }

      let err = await prom
      expect(err.code).toBe('AccessTokenInvalid')
    })

    it('should work with postAPI when using always_get_token_fun', async () => {
      let callCount = 0

      var mockContext = {
        axiosSend: req => {
          expect(req.headers['Authorization']).toBe('Bearer api_token')
          return {data: {items: []}}
        },
      }

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          always_get_token_fun: async () => {
            callCount++
            return {
              access_token: 'api_token',
              expire_time: new Date(Date.now() + 1000000).toISOString(),
            }
          },
        },
        mockContext,
      )

      let data = await client.postAPI('/file/list', {drive_id: '123'})
      expect(data.items).toEqual([])
      expect(callCount).toBe(1)
    })

    it('should store always_get_token_fun in client instance', () => {
      const tokenFn = async () => ({access_token: 'test'})

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          always_get_token_fun: tokenFn,
        },
        {axiosSend: () => {}},
      )

      expect(client.always_get_token_fun).toBe(tokenFn)
    })
  })
})
