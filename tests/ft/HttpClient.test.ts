/** @format */

import assert = require('assert')

const Config = require('./conf.js')

const {getHttpClient} = require('./token-util')

const PATH_TYPE = 'HostingMode'

describe('HttpClient', function () {
  this.timeout(60 * 1000)
  const {drive_id, api_endpoint} = Config['domains'][PATH_TYPE]
  describe('request', () => {
    it('request', async () => {
      // console.log(Config)

      const client = await getHttpClient(PATH_TYPE)

      let result = await client.postAPI('/drive/get', {drive_id})
      // console.log(result)
      assert(result.drive_id == '1')
    })

    it('send', async () => {
      // console.log(Config)
      const client = await getHttpClient(PATH_TYPE)

      try {
        await client.send('GET', api_endpoint + '/v2/drive/get', {}, {}, 2)
      } catch (e) {
        assert(e.status == 404)
        assert(e.code == 'I404NF')
      }
    })
  })
})
