/** @format */

const assert = require('assert')
import {fs} from '../../src/context/NodeContext'
import {PDSClient} from './index'

const path = require('path')
const {getClient} = require('./token-util')
const Config = require('./conf.js')
const PATH_TYPE = 'StandardMode'

describe('ShareLink', function () {
  this.timeout(60000)

  let {api_endpoint, drive_id} = Config.domains[PATH_TYPE]

  let client: PDSClient

  let file_id
  let folder_id
  let breadArr = []

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)

    folder_id = await client.createFolders(['aa', 'bb', 'cc'], {drive_id, parent_file_id: 'root'})

    let fileInfo = await client.saveFileContent(
      {
        drive_id,
        parent_file_id: folder_id,
        name: 'xxoxo',
      },
      'xxxx',
      {check_name_mode: 'ignore'},
    )

    file_id = fileInfo.file_id

    breadArr = await client.getBreadcrumbFolderList({drive_id, file_id: folder_id})
    // [{file_id, name }]
  })
  this.afterAll(async () => {
    await client.deleteFile({drive_id, file_id: breadArr[0].file_id}, true)
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

    const result3 = await client.searchShareLinks({
      marker: '',
    })
    assert.ok(result3.items.length > 0, 'searchShareLinks')

    await client.cancelShareLink({
      share_id,
    })
  })

  // 查看分享
  it('list files of shareLink', async () => {
    let folder_id_2 = breadArr[1].file_id
    let folder_id_3 = breadArr[2].file_id
    const result = await client.createShareLink({
      description: '',
      drive_id,
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: [folder_id_2],
      share_pwd: '',
    })
    let share_id = result.share_id
    assert.ok(share_id, 'createShareLink')

    const getInfo = await client.getShareLink({
      share_id,
    })

    assert.ok(share_id == getInfo.share_id, 'getShareLink')
    assert.ok(getInfo.file_id_list[0] == folder_id_2, 'getShareLink')

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
    assert(items[0].file_id == folder_id_2)
    assert(items[0].share_id == share_id)

    // 面包屑
    let bread = await newClient.getBreadcrumbFolderList(
      {share_id, file_id: folder_id_3},
      {headers: {'x-share-token': share_token}},
    )
    assert(bread.length == 2)
    assert(bread[0].name == 'bb')
    assert(bread[1].name == 'cc')

    await client.cancelShareLink({
      share_id,
    })
  })

  // 上传
  it('createUploadShareLink', async () => {
    const result = await client.createShareLink({
      description: '',
      drive_id,
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: [folder_id],
      share_pwd: '',

      creatable: true,
      creatable_file_id_list: [folder_id],
    })
    let share_id = result.share_id
    assert.ok(share_id, 'createUploadShareLink')

    let item = await client.getShareLinkByAnonymous({share_id})
    assert(item.share_name)

    let {share_token} = await client.getShareToken({share_id})
    assert(share_token)

    let newClient = new PDSClient({
      api_endpoint,
      share_token,
    })

    let file_name = 'tmp-sharelink-upfile.txt'
    let up_file = path.join(__dirname, 'tmp', file_name)
    fs.writeFileSync(up_file, 'abc')

    let {file_id: up_file_id} = await newClient.uploadFile(up_file, {share_id, parent_file_id: folder_id})

    let {items = []} = await newClient.listFiles({share_id, parent_file_id: folder_id})
    assert(items.length == 2)
    assert(items[0].file_id == up_file_id)
    assert(items[0].share_id == share_id)
    assert(items[0].name == file_name)

    await client.cancelShareLink({
      share_id,
    })
  })
})
