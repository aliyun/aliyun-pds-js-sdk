/** @format */

import * as Context from '../../src/context/NodeContext'
const {HttpClient} = require('../../src/http/HttpClient')
import {PDSError} from '../../src/utils/PDSError'
import {IClientParams, IContext, ITokenInfo} from '../../src/Types'
import assert = require('assert')

describe('HttpClient', function () {
  this.timeout(60 * 1000)
  describe('constructor', () => {
    it('params is required', async () => {
      try {
        new HttpClient()
        assert(false, 'should throw')
      } catch (e) {
        console.log(e)
        assert(e.code == 'InvalidParameter')
        assert(e.message == 'constructor params is required')
      }
    })
    it('context is required', async () => {
      try {
        new HttpClient({})
        assert(false, 'should throw')
      } catch (e) {
        console.log(e)
        assert(e.code == 'InvalidParameter')
        assert(e.message == 'constructor context is required')
      }
    })

    it('api_endpoint or auth_endpoint is required', async () => {
      try {
        new HttpClient({}, {})
        assert(false, 'should throw')
      } catch (e) {
        console.log(e)
        assert(e.code == 'InvalidParameter')
        assert(e.message == 'api_endpoint or auth_endpoint is required')
      }
    })
    it('auth_endpoint or auth_endpoint', async () => {
      new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )
      assert(true)
      new HttpClient(
        {
          auth_endpoint: 'https://auth_endpoint.test',
        },
        Context,
      )
      assert(true)
    })

    it('access_token is required', async () => {
      try {
        new HttpClient(
          {
            token_info: {},
            api_endpoint: 'https://api_endpoint.test',
            auth_endpoint: 'https://api_endpoint.test',
          },
          Context,
        )
        assert(false, 'should throw')
      } catch (e) {
        assert(e.code == 'InvalidParameter')
        assert(e.message == 'token_info.access_token is required')
      }
    })

    it('Token expired', async () => {
      new HttpClient(
        {
          token_info: {
            access_token: 'a',
            expire_time: new Date(Date.now() - 1000).toISOString(),
          },
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )
      assert(true)
    })

    it('Invalid refresh_token_fun', async () => {
      try {
        new HttpClient(
          {
            token_info: {
              access_token: 'a',
              expire_time: new Date(Date.now() + 1000).toISOString(),
            },
            api_endpoint: 'https://api_endpoint.test',
            auth_endpoint: 'https://api_endpoint.test',
            refresh_token_fun: 'xx',
          },
          Context,
        )
        assert(false, 'should throw')
      } catch (e) {
        assert(e.code == 'InvalidParameter')
        assert(e.message == 'Invalid refresh_token_fun')
      }
    })
  })

  describe('setToken', () => {
    it('setToken', () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )

      client.setToken({
        access_token: 'a',
        refresh_token: 'x',
        expire_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      })

      assert('ok')
    })

    it('token invalid', () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )

      try {
        client.setToken({})
        assert(false, 'should throw')
      } catch (e) {
        assert(e.code == 'InvalidParameter')
      }
    })
    it('token expired', () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )

      client.setToken({
        access_token: 'a',
        refresh_token: 'x',
        expire_time: new Date(Date.now() - 1000).toISOString(),
      })
      assert(true)
    })

    it('token without expire_time', () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )

      client.setToken({
        access_token: 'a',
        refresh_token: 'x',
        // expire_time: new Date(Date.now() - 1000).toISOString(),
      })
      assert(true)
    })

    it('token without invalid expire_time', () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )

      try {
        client.setToken({
          access_token: 'a',
          refresh_token: 'x',
          expire_time: 'abc',
        })
        assert(true, 'should throw')
      } catch (e) {
        assert(e.code == 'InvalidParameter')
      }
    })
  })

  describe('customRefreshTokenFun', () => {
    it('refresh token', async () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
          refresh_token_fun: async () => {
            return {
              access_token: 'x',
            }
          },
        },
        Context,
      )

      let a = await client.customRefreshTokenFun()

      assert(a.access_token == 'x')
    })
    it('throw', async () => {
      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
          refresh_token_fun: async () => {
            throw new Error('aaa')
          },
        },
        Context,
      )

      try {
        let a = await client.customRefreshTokenFun()
        assert(false, 'should throw')
      } catch (e) {
        assert(e.message == 'aaa')
      }
    })
  })

  describe('throwError', function () {
    it('throwError', async () => {
      // console.log(Config)

      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        Context,
      )
      // console.log('--------client', client)

      client.on('error', (e, opt) => {
        // console.log('on error', e, opt)
        assert(e.name == 'PDSError')
        assert(e.code == 'ClientError')
        assert(e.message == 'test')
        assert(opt.as == '123')
      })

      try {
        client.throwError(new PDSError('test'), {as: '123'})
        assert(false, 'should throw')
      } catch (e) {
        // console.log('error:', e)
        // console.log('-----------')
        assert(e.name == 'PDSError')
        assert(e.code == 'ClientError')
        assert(e.message == 'test')
      }
    })
  })

  describe('postAPI Error', function () {
    it('refresh_token_fun throw Network Error', async () => {
      // console.log(Config)

      let client = new HttpClient(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
          refresh_token_fun: () => {
            throw new PDSError('Network Error')
          },
        },
        Context,
      )
      // console.log('--------client', client)
      client.setToken({
        access_token: 'test-token',
        refresh_token: '0b0a4ef*****b67d',
        expire_time: new Date(Date.now() - 3600 * 1000).toISOString(),
      })

      try {
        await client.postAPI('/test')
        assert(false, 'should throw')
      } catch (e) {
        // console.log('error:', e)
        assert(e.message.includes('Network Error'))
      }
    })
  })

  describe('request', function () {
    it('request 401 && refresh_token_fun throw Network Error', async () => {
      // console.log(Config)

      class HttpClientTest extends HttpClient {
        constructor(params: IClientParams, context: IContext) {
          super(params, context)
        }
        test_request(...arg) {
          return this.request(...arg)
        }
      }

      let c = 0
      let client = new HttpClientTest(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
          refresh_token_fun: async () => {
            c++
            var e = {
              message: 'Network Error',
            }
            throw e
          },
        },
        {
          ...Context,
          Axios: () => {
            var e = {
              message: 'Test Error',
              status: 401,
              code: 'test',
            }

            throw e
            // throw new PDSError('Test Error', 'ServerError', 401)
          },
        },
      )
      // console.log('--------client', client)
      client.setToken({
        access_token: 'test-token',
        refresh_token: '0b0a4ef*****b67d',
        expire_time: new Date(Date.now() + 3600 * 1000).toISOString(),
      })

      try {
        await client.test_request('https://api_endpoint.test', 'POST', '/test')
        assert(false, 'should throw')
      } catch (e) {
        assert(c == 1)
        // console.log('error:', e)
        assert(e.message.includes('Network Error'))
      }
    })

    it('request 401 && no refresh_token_fun ', async () => {
      // console.log(Config)

      class HttpClientTest extends HttpClient {
        constructor(params: IClientParams, context: IContext) {
          super(params, context)
        }
        test_request(...arg) {
          return this.request(...arg)
        }
      }

      let client = new HttpClientTest(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
        },
        {
          ...Context,
          Axios: () => {
            throw mockAxiosError()
            // throw new PDSError('Test Error', 'ServerError', 401)
          },
        },
      )
      // console.log('--------client', client)
      client.setToken({
        access_token: 'test-token',
        refresh_token: '0b0a4ef*****b67d',
        expire_time: new Date(Date.now() + 3600 * 1000).toISOString(),
      })

      try {
        await client.test_request('https://api_endpoint.test', 'POST', '/test')
        assert(false, 'should throw')
      } catch (e) {
        assert(e.message.includes('Test Error'))
        assert(e.code == 'TokenExpired')
      }
    })

    it('request 401 && refresh_share_token_fun throw Network Error', async () => {
      // console.log(Config)

      class HttpClientTest extends HttpClient {
        constructor(params: IClientParams, context: IContext) {
          super(params, context)
        }
        test_request(...arg) {
          return this.request(...arg)
        }
      }

      let c = 0
      let client = new HttpClientTest(
        {
          api_endpoint: 'https://api_endpoint.test',
          auth_endpoint: 'https://api_endpoint.test',
          refresh_share_token_fun: async () => {
            c++
            throw mockAxiosError()
          },
        },
        {
          ...Context,
          Axios: () => {
            var e = {
              message: 'Test Error',
              status: 401,
              code: 'test',
            }

            throw e
            // throw new PDSError('Test Error', 'ServerError', 401)
          },
        },
      )
      // console.log('--------client', client)
      client.setShareToken('abc')

      try {
        await client.test_request('https://api_endpoint.test', 'POST', '/test')
        assert(false, 'should throw')
      } catch (e) {
        assert(c == 1)
        assert(e.message.includes('Test Error'))
      }
    })
  })
})

function mockAxiosError() {
  var e = new Error('Test Error')
  Object.assign(e, {
    isAxiosError: true,
    status: 401,
    response: {
      headers: {
        'X-Ca-Request-Id': 'x',
        'content-type': 'application/json',
      },
      status: 401,
      data: {
        message: 'Test Error',
        code: 'test',
      },
    },
  })
  return e
}
