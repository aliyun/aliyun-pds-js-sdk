/** @format */

const assert = require('assert')
import {PDSClient} from './index'

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('ShareLink', function () {
  let share_id = ''

  this.timeout(60000)

  let client: PDSClient

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
  })
  // 创建分享
  it('createShareLink', async () => {
    const result = await client.createShareLink({
      description: '',
      drive_id: '1060',
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: ['61a49e39d687d40967164cf98ef65ab5bb554f53'],
      share_pwd: '',
    })
    assert.ok(result.share_id, 'createShareLink')
  })

  // 加密分享
  it('createShareLink with pwd', async () => {
    const result = await client.createShareLink({
      description: '',
      drive_id: '1060',
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: ['61a49e39d687d40967164cf98ef65ab5bb554f53'],
      share_pwd: '123456',
    })
    share_id = result.share_id
    assert.ok(result.share_id, 'createShareLink')
  })

  // 列举分享
  it('listShareLinks without params', async () => {
    const result = await client.listShareLinks()
    assert.ok(result.items.length, 'listShareLinks')
  })
  it('listShareLinks', async () => {
    const result = await client.listShareLinks({
      creator: client.token_info.user_id,
      marker: '',
    })
    assert.ok(result.items.length, 'listShareLinks')
  })

  // 取消分享
  it('cancelShareLink', async () => {
    try {
      await client.cancelShareLink({
        share_id,
      })
    } catch (error) {
      assert.fail('should ok')
    }
  })
})
