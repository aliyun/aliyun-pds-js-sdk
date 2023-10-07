import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'
import {getClient} from './util/token-util'

describe('DriveAPI', function () {
  let client

  beforeAll(async () => {
    client = await getClient()
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
    expect(!!userInfo.user_id).toBe(true)
    const {user_id, default_drive_id} = userInfo

    if (!default_drive_id) throw new Error('Require default_drive_id')
    // 看下用户的云盘
    const res1 = await client.getDrive({
      drive_id: default_drive_id,
    })

    expect(res1.drive_id).toBe(default_drive_id)

    // 更新云盘大小
    const res2 = await client.updateDrive({
      drive_id: default_drive_id,
      total_size: 50000,
    })

    expect(res2.total_size).toBe(50000)

    // list  drive
    const {items = []} = await client.listDrives({
      limit: 100,
      marker: '',
      owner_type: 'user',
      owner: user_id,
    })
    expect(items.filter(n => n.drive_id == default_drive_id).length).toBe(1)

    // 删除云盘
    await client.deleteDrive({drive_id: default_drive_id})

    // 在创建个新的
    const newDrive = await client.createDrive({
      drive_name: '123456',
      owner: user_id,
      total_size: 1021 * 1024,
      default: true,
    })
    expect(!!newDrive.drive_id).toBe(true)

    // 再删了
    await client.deleteDrive({drive_id: newDrive.drive_id})
    expect(1).toBe(1)

    // 把用户删了 结束
    await client.deleteUser({user_id})
  })

  // 标准模式下不限制大小的 此接口用不到
  it('getQuota', async () => {
    const res = await client.getQuota()
    expect(res.size_quota).toBe(0)
  })

  it('searchDrive', async () => {
    const res = await client.searchDrives({
      limit: 100,
      marker: '',
      owner_type: 'group',
    })

    if (res.items.length > 0) {
      for (let n of res.items) {
        expect(n.owner_type).toBe('group')
      }
    }
  })

  it('listMyDrives', async () => {
    const res = await client.listMyDrives({
      limit: 100,
      marker: '',
    })
    // console.log(res)
    expect(res.items.length).toBeGreaterThan(0)
  })

  it('listMyGroupDrives', async () => {
    const res = await client.listMyGroupDrives({
      limit: 100,
      marker: '',
      owner_type: 'group',
    })
    expect(res.items.length).toBeGreaterThan(0)
  })

  it('listAllMyGroupDrives', async () => {
    const res = await client.listAllMyGroupDrives({
      owner_type: 'group',
    })
    expect(res.items.length).toBeGreaterThan(0)
  })

  it('listAllDrives', async () => {
    const {items = []} = await client.listAllDrives()
    expect(items.length).toBeGreaterThan(0)
  })
})
