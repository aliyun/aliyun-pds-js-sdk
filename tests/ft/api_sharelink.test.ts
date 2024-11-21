import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'

import {IParentFolderNameId} from '../../lib/client/api_file'
import {getClient, PDSClient, getTestDrive} from './util/token-util'
import Config from './config/conf'
import {mockFile} from './util/file-util'

const isWeb = typeof window == 'object'

describe('ShareLink', function () {
  let {api_endpoint} = Config

  let client

  let drive_id
  let file_id
  let folder_id
  let breadArr: Omit<IParentFolderNameId, 'parent_file_id'>[] = []

  beforeAll(async () => {
    client = await getClient()
    // 创建个新的
    const newDrive = await getTestDrive(client)

    drive_id = newDrive.drive_id

    try {
      let legacyInfo = await client.getFileByPath({drive_id, file_path: '/aa'})
      // 删除 /aa
      await client.deleteFile({drive_id, file_id: legacyInfo.file_id})
    } catch (err) {
      // pass
    }

    // create folder /aa/bb/cc/
    folder_id = await client.createFolders(['aa', 'bb', 'cc'], {drive_id, parent_file_id: 'root'})

    // create file: /aa/bb/cc/xxoxo
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
    console.log('breadArr:', breadArr)
  })
  afterAll(async () => {
    // 删除 /aa
    await client.deleteFile({drive_id, file_id: breadArr[0].file_id || ''}, true)
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
    expect(!!share_id).toBe(true)

    let item = await client.getShareLinkByAnonymous({share_id})
    expect(!!item.share_name).toBe(true)

    let {share_token} = await client.getShareToken({share_id})
    expect(!!share_token).toBe(true)

    let newClient = new PDSClient({
      api_endpoint,
    })

    let {items = []} = await newClient.listFiles(
      {share_id, parent_file_id: 'root'},
      {headers: {'x-share-token': share_token}},
    )
    expect(items.length).toBe(1)
    expect(items[0].file_id).toBe(file_id)
    expect(items[0].share_id).toBe(share_id)

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
    expect(!!result.share_id).toBe(true)

    let {share_token} = await client.getShareToken({share_id, share_pwd})
    expect(!!share_token).toBe(true)

    let newClient = new PDSClient({
      api_endpoint,
    })

    let {items = []} = await newClient.listFiles(
      {share_id, parent_file_id: 'root'},
      {headers: {'x-share-token': share_token}},
    )
    expect(items.length).toBe(1)
    expect(items[0].file_id).toBe(file_id)
    expect(items[0].share_id).toBe(share_id)

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
    expect(result1.items.length).toBeGreaterThan(0)

    const result2 = await client.listShareLinks({
      creator: client.token_info?.user_id,
      marker: '',
    })
    expect(result2.items.length).toBeGreaterThan(0)

    const result3 = await client.searchShareLinks({
      marker: '',
    })
    expect(result3.items.length).toBeGreaterThan(0)

    await client.cancelShareLink({
      share_id,
    })
  })

  // 查看分享
  it('list files of shareLink', async () => {
    let folder_id_2 = breadArr[1].file_id || ''
    let folder_id_3 = breadArr[2].file_id || ''
    const result = await client.createShareLink({
      description: '',
      drive_id,
      expiration: new Date(Date.now() + 3600 * 1000),
      file_id_list: [folder_id_2], // bb
      share_pwd: '',
    })
    let share_id = result.share_id
    expect(!!share_id).toBe(true)

    const getInfo = await client.getShareLink({
      share_id,
    })

    expect(share_id).toBe(getInfo.share_id)
    expect(getInfo.file_id_list?.[0]).toBe(folder_id_2)

    let item = await client.getShareLinkByAnonymous({share_id})
    expect(!!item.share_name).toBe(true)

    let {share_token} = await client.getShareToken({share_id})
    expect(!!share_token).toBe(true)

    let newClient = new PDSClient({
      api_endpoint,
    })

    let {items = []} = await newClient.listFiles(
      {share_id, parent_file_id: 'root'},
      {headers: {'x-share-token': share_token}},
    )

    expect(items.length).toBe(1)
    expect(items[0].file_id).toBe(folder_id_2)
    expect(items[0].share_id).toBe(share_id)

    // 面包屑
    let bread = await newClient.getBreadcrumbFolderList(
      {share_id, file_id: folder_id_3},
      {headers: {'x-share-token': share_token}},
    )

    expect(bread.length).toBe(2)
    expect(bread[0].name).toBe('bb')

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
    expect(!!share_id).toBe(true)

    let item = await client.getShareLinkByAnonymous({share_id})
    expect(!!item.share_name).toBe(true)

    let {share_token} = await client.getShareToken({share_id})
    expect(!!share_token).toBe(true)

    let newClient = new PDSClient({
      api_endpoint,
      share_token,
    })
    let file_name = 'tmp-sharelink-upfile.txt'
    let up_file = await mockFile(file_name, 'abc', 'text/plain')

    let {file_id: up_file_id} = await newClient.uploadFile(up_file, {
      share_id,
      parent_file_id: folder_id,
    })

    let {items = []} = await newClient.listFiles({share_id, parent_file_id: folder_id})
    console.log(
      '------items',
      items.map(n => n.name),
    ) // [ 'tmp-sharelink-upfile.txt', 'xxoxo' ]
    expect(items.length).toBe(2)
    expect(items[0].file_id).toBe(up_file_id)
    expect(items[0].share_id).toBe(share_id)
    expect(items[0].name).toBe(file_name)

    await client.cancelShareLink({
      share_id,
    })
  })
})
