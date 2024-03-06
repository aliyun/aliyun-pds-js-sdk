import {describe, expect, beforeAll, afterAll, it} from 'vitest'
import {getClient, delay} from './util/token-util'

describe('DriveAPI', function () {
  let client

  beforeAll(async () => {
    client = await getClient()
  })

  it('drive BDD', async () => {
    let user_id
    let default_drive_id
    // 创建用户
    const userInfo = await client.importUser({
      authentication_type: 'mobile',
      auto_create_drive: true,
      identity: `135${Math.round(Math.random() * 100000000)}`,
      drive_total_size: 1024 * 1024 * 1024,
      nick_name: 'WWJ-',
    })
    expect(!!userInfo.user_id).toBe(true)
    user_id = userInfo.user_id
    default_drive_id = userInfo.default_drive_id

    if (default_drive_id) {
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
    }

    // 在创建个新的
    const newDrive = await client.createDrive({
      drive_name: '123456',
      owner: user_id,
      total_size: 1021 * 1024,
      default: true,
    })
    expect(!!newDrive.drive_id).toBe(true)

    const res2 = await client.updateDrive({
      drive_id: newDrive.drive_id,
      drive_name: 'abcd',
    })

    expect(res2.drive_name).toBe('abcd')

    // 再删了
    await client.deleteDrive({drive_id: newDrive.drive_id})
    expect(1).toBe(1)

    // 把用户删了 结束
    await client.deleteUser({user_id})
  })

  it('group drive BDD', async () => {
    // 创建根团队
    const result = await client.createGroup({
      description: '',
      group_name: `Test_Group_${Math.round(Math.random() * 1000)}`,
      // is_root: true,
    })
    expect(!!result.group_id).toBe(true)
    let groupInfo = result

    const newDrive = await client.createDrive({
      drive_name: '123456',
      owner: groupInfo.group_id,
      total_size: 1021 * 1024,
      owner_type: 'group',
    })
    expect(!!newDrive.drive_id).toBe(true)

    let res = await client.searchDrives({
      limit: 100,
      marker: '',
      owner_type: 'group',
    })

    if (res.items.length > 0) {
      for (let n of res.items) {
        expect(n.owner_type).toBe('group')
      }
    }

    res = await client.listMyDrives({
      limit: 100,
      marker: '',
    })
    // console.log(res)
    expect(res.items.length).toBeGreaterThan(0)

    await delay(10000)
    res = await client.listMyGroupDrives({
      limit: 100,
      marker: '',
      owner_type: 'group',
    })
    expect(res.items.length).toBeGreaterThan(0)

    res = await client.listAllMyGroupDrives({
      owner_type: 'group',
    })
    expect(res.items.length).toBeGreaterThan(0)

    let {items = []} = await client.listAllDrives()
    expect(items.length).toBeGreaterThan(0)

    // 再删了
    await client.deleteDrive({drive_id: newDrive.drive_id})
    expect(1).toBe(1)

    // 删除 group
    await client.deleteGroup({group_id: groupInfo.group_id})
  })
})
