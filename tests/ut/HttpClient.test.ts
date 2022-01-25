/** @format */

import * as Context from '../../src/context/NodeContext'
const {HttpClient} = require('../../src/http/HttpClient')
import {PDSError} from '../../src/utils/PDSError'
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
})
