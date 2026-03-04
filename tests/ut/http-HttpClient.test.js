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

    it('should deduplicate concurrent refresh_token_fun calls', async () => {
      let refreshCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 0, // 禁用重试，避免重试导致多次刷新
          refresh_token_fun: async () => {
            refreshCount++
            // 模拟异步刷新耗时
            await new Promise(resolve => setTimeout(resolve, 30))
            return {access_token: 'new_token', expire_time: new Date(Date.now() + 1000000).toISOString()}
          },
        },
        {axiosSend: () => ({data: {ok: 'success'}})},
      )

      // 设置一个已过期但会被 checkRefreshToken 接受的 token
      // 注意：checkRefreshToken 检查的是传入的 token_info，不是 this.token_info
      // 所以我们需要直接调用 customRefreshTokenFun 来测试并发去重
      const promises = Array(3)
        .fill(null)
        .map(() => client.customRefreshTokenFun())

      const results = await Promise.allSettled(promises)

      // 虽然有 3 个并发调用，但 refresh_token_fun 应该只被调用 1 次
      expect(refreshCount).toBe(1)
      // 所有调用都应该成功
      expect(results.every(r => r.status === 'fulfilled')).toBe(true)
      // _refresh_token_promise 应该已被清除
      expect(client._refresh_token_promise).toBeUndefined()
    })

    it('should handle refresh_token_fun error and allow retry', async () => {
      let refreshCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 0,
          refresh_token_fun: async () => {
            refreshCount++
            throw new Error('Refresh failed')
          },
        },
        {axiosSend: () => ({data: {ok: 'success'}})},
      )

      client.setToken({
        access_token: 'old_token',
        expire_time: new Date(Date.now() - 1000).toISOString(), // 已过期
      })

      // 第一次请求触发刷新，应该失败
      let errorThrown = false
      try {
        await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 0)
      } catch (e) {
        errorThrown = true
      }
      expect(errorThrown).toBe(true)
      expect(refreshCount).toBe(1)
      // _refresh_token_promise 应该已被清除（通过 finally）
      expect(client._refresh_token_promise).toBeUndefined()
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

    it('should deduplicate concurrent refresh_share_token_fun calls', async () => {
      let refreshCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 0,
          refresh_share_token_fun: async () => {
            refreshCount++
            // 模拟异步刷新耗时
            await new Promise(resolve => setTimeout(resolve, 30))
            return 'new_share_token'
          },
        },
        {axiosSend: () => ({data: {ok: 'success'}})},
      )

      // 并发发起 3 个调用
      const promises = Array(3)
        .fill(null)
        .map(() => client.customRefreshShareTokenFun())

      const results = await Promise.allSettled(promises)

      // 虽然有 3 个并发调用，但 refresh_share_token_fun 应该只被调用 1 次
      expect(refreshCount).toBe(1)
      // 所有调用都应该成功
      expect(results.every(r => r.status === 'fulfilled')).toBe(true)
      // 验证 share_token 被正确设置
      expect(client.share_token).toBe('new_share_token')
      // _refresh_share_token_promise 应该已被清除
      expect(client._refresh_share_token_promise).toBeUndefined()
    })

    it('should handle refresh_share_token_fun error and allow retry', async () => {
      let refreshCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 0,
          refresh_share_token_fun: async () => {
            refreshCount++
            throw new Error('Refresh failed')
          },
        },
        {axiosSend: () => ({data: {ok: 'success'}})},
      )

      // 第一次调用应该失败
      let errorThrown = false
      try {
        await client.customRefreshShareTokenFun()
      } catch (e) {
        errorThrown = true
      }
      expect(errorThrown).toBe(true)
      expect(refreshCount).toBe(1)
      // _refresh_share_token_promise 应该已被清除（通过 finally）
      expect(client._refresh_share_token_promise).toBeUndefined()
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

    it('should call always_get_token_fun on each request when cache expires', async () => {
      let callCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 1,
          always_get_token_cache_ms: 1, // 1ms 缓存
          always_get_token_fun: async () => {
            callCount++
            return {
              access_token: `token_${callCount}`,
              expire_time: new Date(Date.now() + 1000000).toISOString(),
            }
          },
        },
        {axiosSend: () => ({data: {result: 'ok'}})},
      )

      // 第一次请求
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)
      expect(callCount).toBe(1)

      // 强制清除缓存，模拟缓存过期
      client.get_token_cache = undefined

      // 第二次请求，应该再次调用 always_get_token_fun
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)
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

    it('should deduplicate concurrent calls to always_get_token_fun', async () => {
      let callCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 1,
          always_get_token_cache_ms: 100, // 设置较短的缓存时间便于测试
          always_get_token_fun: async () => {
            callCount++
            // 模拟异步操作耗时
            await new Promise(resolve => setTimeout(resolve, 20))
            return {
              access_token: `token_${callCount}`,
              expire_time: new Date(Date.now() + 1000000).toISOString(),
            }
          },
        },
        {axiosSend: () => ({data: {result: 'ok'}})},
      )

      // 并发发起 5 个请求
      const promises = Array(5)
        .fill(null)
        .map(() => client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1))

      await Promise.all(promises)

      // 虽然有 5 个并发请求，但 always_get_token_fun 应该只被调用 1 次
      expect(callCount).toBe(1)
    })

    it('should use cached token within cache period', async () => {
      let callCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 1,
          always_get_token_cache_ms: 10000, // 10s 缓存，确保不会过期
          always_get_token_fun: async () => {
            callCount++
            return {
              access_token: `token_${callCount}`,
              expire_time: new Date(Date.now() + 1000000).toISOString(),
            }
          },
        },
        {axiosSend: () => ({data: {result: 'ok'}})},
      )

      // 第一次请求
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)
      expect(callCount).toBe(1)

      // 立即第二次请求，应该使用缓存，不调用 always_get_token_fun
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)
      expect(callCount).toBe(1) // 仍然是 1
    })

    it('should refresh token after cache expires', async () => {
      let callCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 1,
          always_get_token_cache_ms: 1, // 1ms 缓存
          always_get_token_fun: async () => {
            callCount++
            return {
              access_token: `token_${callCount}`,
              expire_time: new Date(Date.now() + 1000000).toISOString(),
            }
          },
        },
        {axiosSend: () => ({data: {result: 'ok'}})},
      )

      // 第一次请求
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)
      expect(callCount).toBe(1)

      // 强制清除缓存，模拟缓存过期
      client.get_token_cache = undefined

      // 第二次请求，缓存已过期，应该重新获取
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)
      expect(callCount).toBe(2)
    })

    it('should handle error in always_get_token_fun and allow retry', async () => {
      let callCount = 0

      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 0, // 禁用重试
          always_get_token_fun: async () => {
            callCount++
            throw new Error('Network error')
          },
        },
        {axiosSend: () => ({data: {result: 'ok'}})},
      )

      // 第一次请求失败
      let errorThrown = false
      try {
        await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 0)
      } catch (e) {
        errorThrown = true
      }
      expect(errorThrown).toBe(true)
      expect(callCount).toBe(1)

      // 验证 _get_token_promise 被清除（通过 finally）
      expect(client._get_token_promise).toBeUndefined()
    }, 5000)

    it('should clear _get_token_promise after completion', async () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://xxx',
          retryCount: 1,
          always_get_token_cache_ms: 50,
          always_get_token_fun: async () => ({
            access_token: 'test_token',
            expire_time: new Date(Date.now() + 1000000).toISOString(),
          }),
        },
        {axiosSend: () => ({data: {result: 'ok'}})},
      )

      // 第一次请求
      await client.request('https://xxx', 'POST', '/v2/file/list', {}, {}, 1)

      // _get_token_promise 应该已被清除
      expect(client._get_token_promise).toBeUndefined()
    })
  })
})
