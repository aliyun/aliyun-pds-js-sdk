/** @format */

const assert = require('assert')
import {PDSClient} from './index'
const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('DriveAPI', function () {
  this.timeout(60000)

  let client: PDSClient

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
  })

  it('drive BDD', async () => {
    // 创建用户
    const userInfo = await client.importUser({
      authentication_type: 'mobile',
      auto_create_drive: true,
      identity: `135${Math.round(Math.random() * 100000000)}`,
      drive_total_size: 1024 * 1024 * 1024,
      nick_name: 'WWJ-',
    })
    assert.ok(userInfo.user_id)
    const {user_id, default_drive_id} = userInfo

    // 看下用户的云盘
    const res1 = await client.getDrive({
      drive_id: default_drive_id,
    })

    assert.ok(res1.drive_id == userInfo.default_drive_id)

    // 更新云盘大小
    const res2 = await client.updateDrive({
      drive_id: userInfo.default_drive_id,
      total_size: 50000,
    })

    assert.strictEqual(res2.total_size, 50000)

    // list  drive
    const {items = []} = await client.listDrives({
      limit: 100,
      marker: '',
      owner_type: 'user',
      owner: user_id,
    })
    assert(items.filter(n => n.drive_id == default_drive_id).length == 1)

    // 删除云盘
    await client.deleteDrive({drive_id: default_drive_id})
    assert(true)

    // 在创建个新的
    const newDrive = await client.createDrive({
      drive_name: '123456',
      owner: user_id,
      total_size: 1021 * 1024,
      default: true,
    })
    assert.ok(newDrive.drive_id)

    // 再删了
    await client.deleteDrive({drive_id: newDrive.drive_id})
    assert(true)

    // 把用户删了 结束
    await client.deleteUser({user_id})
  })

  // 标准模式下不限制大小的 此接口用不到
  it('getQuota', async () => {
    const res = await client.getQuota()
    assert.ok(res.size_quota == 0)
  })

  it('searchDrive', async () => {
    const res = await client.searchDrives({
      limit: 100,
      marker: '',
      owner_type: 'group',
    })
    // assert.ok(res.items.length)
    if (res.items.length > 0) {
      for (let n of res.items) {
        assert(n.owner_type == 'group')
      }
    }
  })

  it('listMyDrives', async () => {
    const res = await client.listMyDrives({
      limit: 100,
      marker: '',
    })
    // console.log(res)
    assert.ok(res.items.length)
  })

  it('listMyGroupDrives', async () => {
    const res = await client.listMyGroupDrives({
      limit: 100,
      marker: '',
      owner_type: 'group',
    })
    assert.ok(res.items.length)
  })

  it('listAllMyGroupDrives', async () => {
    const res = await client.listAllMyGroupDrives({
      owner_type: 'group',
    })
    assert.ok(res.items.length)
  })

  it('listAllDrives', async () => {
    const {items = []} = await client.listAllDrives()
    assert.ok(items.length)
  })
})
