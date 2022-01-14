/** @format */

import assert = require('assert')
import {PDSClient} from './index'
import {ICreateFileRes, ICreateShareRes} from '../../src'
const Config = require('./conf.js')
const {getClient} = require('./token-util')

const PATH_TYPE = 'HostingMode'

let shareInfo: ICreateShareRes
let folder: ICreateFileRes

describe('Hosting Share', function () {
  this.timeout(60 * 1000)

  let client: PDSClient
  let drive_id: string
  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = Config.domains[PATH_TYPE].drive_id
  })

  it('list Received Share', async () => {
    const result3 = await client.listReceivedShares({creator: 'superadmin', limit: 1})
    assert.ok(result3.items)
  })
  it('list all Received Share', async () => {
    const result3 = await client.listAllReceivedShares({creator: 'superadmin'})
    assert.ok(result3.items)
  })

  it('createShare', async () => {
    this.timeout(60 * 1000)
    // 个人空间下 创建个文件夹
    const folder1 = await client.createFolder({
      drive_id,
      parent_file_path: '/',
      parent_file_id: null,
      check_name_mode: 'auto_rename',
      name: '共享文件夹1',
    })

    folder = folder1

    assert.ok(folder1.file_path)

    // 共享这个文件夹
    const shareInfo1 = await client.createShare({
      share_name: '共享文件夹1',
      permissions: ['FILE.LIST', 'FILE.PREVIEW', 'FILE.VISIBLE'],
      expiration: new Date('2121-05-01T00:00:00.000Z'),
      status: 'enabled',
      description: '',
      drive_id,
      share_file_path: folder1.file_path,

      owner: 'b72289568c1e4407b40d5671734fc74e',
      // owner_type: 'user',
      // owner_nick_name: '王卫江---超级管理员',
    })

    assert.ok(shareInfo1.share_id)
    shareInfo = {...shareInfo1}

    const shareInfo2 = await client.getShare({
      share_id: shareInfo1.share_id,
    })
    // console.log(shareInfo2)
    assert(shareInfo2.permissions.sort().join(',') == 'FILE.LIST,FILE.PREVIEW,FILE.VISIBLE')
  })

  it('updateShare', async () => {
    const shareInfo2 = await client.updateShare({
      share_id: shareInfo.share_id,
      permissions: [
        'FILE.COPY',
        'FILE.CREATE',
        'FILE.DOWNLOAD',
        'FILE.LIST',
        'FILE.PREVIEW',
        'FILE.VISIBLE',
        'FILE.GET',
      ],
    })
    assert.ok(shareInfo2.share_id)

    const shareInfo3 = await client.getShare({
      share_id: shareInfo.share_id,
    })
    assert(
      shareInfo3.permissions.sort().join(',') ==
        'FILE.COPY,FILE.CREATE,FILE.DOWNLOAD,FILE.GET,FILE.LIST,FILE.PREVIEW,FILE.VISIBLE',
    )
    assert.ok(shareInfo3.share_id)
  })

  it('list Shares', async () => {
    const result2 = await client.listShares({creator: 'superadmin', limit: 1})
    assert.ok(result2.items.length)
  })
  it('list all Shares', async () => {
    const result2 = await client.listAllShares({creator: 'superadmin'})
    assert.ok(result2.items.length)
  })

  it('delete Shares', async () => {
    try {
      await client.deleteShare({
        share_id: shareInfo.share_id,
      })
    } catch (error) {
      assert.fail('delete Share error')
    }
    await client.batchDeleteFiles(
      [
        {
          drive_id,
          file_path: folder.file_path,
        },
      ],
      true,
    )
  })
})
