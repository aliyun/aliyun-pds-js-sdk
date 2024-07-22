import {describe, expect, it} from 'vitest'
import Config from './config/conf'
import {getHttpClient} from './util/token-util'

describe('HttpClient', function () {
  const {drive_id, api_endpoint} = Config
  describe('request', () => {
    it('request', async () => {
      // console.log(Config)

      const client = await getHttpClient()

      let {items = []} = await client.postAPI('/drive/list', {})
      expect(items.length).toBeGreaterThanOrEqual(0)
    })

    it('send', async () => {
      // console.log(Config)
      const client = await getHttpClient()
      try {
        await client.send('GET', api_endpoint + '/v2/drive/list', {}, {}, 2)
      } catch (e) {
        console.log('----------eee', e)
        expect(e.status).toBe(404)
        expect(e.code).toBe('I404NF')
      }
    })
  })
})
