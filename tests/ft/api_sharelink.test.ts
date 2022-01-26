/** @format */

const assert = require('assert')
import {PDSClient} from './index'

const {getClient} = require('./token-util')
const Config = require('./conf.js')
const PATH_TYPE = 'StandardMode'

describe('ShareLink', function () {
  this.timeout(60000)

  let {api_endpoint, drive_id} = Config.domains[PATH_TYPE]

  let client: PDSClient

  let file_id

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)

    let fileInfo = await client.saveFileContent(
      {
        drive_id,
        parent_file_id: 'root',
        name: 'xxoxo',
      },
      'xxxx',
      {check_name_mode: 'ignore'},
    )

    file_id = fileInfo.file_id
  })

  // 创建分享
  it('createShareLink', async () => {
    const result = await client.createShareLink({
      description: '',
      drive_id,
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: [file_id],
      share_pwd: '',
    })
    let share_id = result.share_id
    assert.ok(share_id, 'createShareLink')

    let item = await client.getShareLinkByAnonymous({share_id})
    assert(item.share_name)

    let {share_token} = await client.getShareToken({share_id})
    assert(share_token)

    let newClient = new PDSClient({
      api_endpoint,
    })

    let {items = []} = await newClient.listFiles(
      {share_id, parent_file_id: 'root'},
      {headers: {'x-share-token': share_token}},
    )
    assert(items.length == 1)
    assert(items[0].file_id == file_id)
    assert(items[0].share_id == share_id)

    await client.cancelShareLink({
      share_id,
    })
  })

  // 加密分享
  it('createShareLink with pwd', async () => {
    let share_pwd = '123456'
    const result = await client.createShareLink({
      description: '',
      drive_id: drive_id,
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: [file_id],
      share_pwd,
    })
    let share_id = result.share_id
    assert.ok(result.share_id, 'createShareLink')

    let {share_token} = await client.getShareToken({share_id, share_pwd})
    assert(share_token)

    let newClient = new PDSClient({
      api_endpoint,
    })

    let {items = []} = await newClient.listFiles(
      {share_id, parent_file_id: 'root'},
      {headers: {'x-share-token': share_token}},
    )
    assert(items.length == 1)
    assert(items[0].file_id == file_id)
    assert(items[0].share_id == share_id)

    await client.cancelShareLink({
      share_id,
    })
  })

  // 列举分享
  it('listShareLinks', async () => {
    const info = await client.createShareLink({
      description: '',
      drive_id,
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: [file_id],
      share_pwd: '',
    })
    let share_id = info.share_id

    const result1 = await client.listShareLinks()
    assert.ok(result1.items.length, 'listShareLinks')

    const result2 = await client.listShareLinks({
      creator: client.token_info.user_id,
      marker: '',
    })
    assert.ok(result2.items.length, 'listShareLinks')

    await client.cancelShareLink({
      share_id,
    })
  })
})
