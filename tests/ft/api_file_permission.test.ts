import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'

import {getClient, delay, deleteUserForce} from './util/token-util'

describe('StandingShare', function () {
  let client

  beforeAll(async () => {
    client = await getClient()
  })

  it('listReceivedFiles', async () => {
    const result = await client.listReceivedFiles({marker: '', limit: 30})
    expect(result.items.length).toBeGreaterThanOrEqual(0)

    // 我管理的共享
    try {
      // 涉及用户隐私  这个接口应该都不能再用了
      await client.listManageSharingFiles({
        limit: 30,
        marker: '',
      })
      expect('should throw').toBe(false)
    } catch (error) {
      expect(error)
    }
  })

  it('createShare', async () => {
    const drive_id = client.token_info?.default_drive_id || ''
    // 个人空间下 创建个文件夹
    const folder1 = await client.createFolder({
      drive_id,
      parent_file_id: 'root',
      check_name_mode: 'auto_rename',
      name: '共享文件夹1',
    })
    let folder_id = folder1.file_id || ''
    expect(!!folder_id).toBe(true)

    const userInfo = await client.importUser({
      authentication_type: 'mobile',
      auto_create_drive: true,
      identity: `135${Math.round(Math.random() * 100000000)}`,
      drive_total_size: 1024 * 1024 * 1024,
      nick_name: 'WWJ-',
    })
    expect(!!userInfo.user_id).toBe(true)

    try {
      // 共享这个文件夹
      await client.addFilePermission({
        drive_id,
        file_id: folder_id,
        member_list: [
          {
            identity: {identity_type: 'IT_User', identity_id: userInfo.user_id},
            expire_time: 4775500800000,
            role_id: 'SystemFileEditor',
            disinherit_sub_group: true,
          },
          // {
          //   identity: {identity_type: 'IT_User', identity_id: '4b14efc7056a4d43b08176a006f63740'},
          //   expire_time: 4775500800000,
          //   role_id: 'SystemFileEditorWithoutDelete',
          //   disinherit_sub_group: true,
          // },
          // {
          //   identity: {identity_type: 'IT_User', identity_id: 'f181ff4066084880b95897b4456a7c66'},
          //   expire_time: 4775500800000,
          //   role_id: 'SystemFileEditorWithoutShareLink',
          //   disinherit_sub_group: true,
          // },
        ],
      })
    } catch (error) {
      expect('createShare error').toBe(true)
    }

    const permissionArr = await client.listFilePermissions({
      drive_id,
      file_id: folder_id,
    })
    expect(permissionArr.length).toBe(1)

    await delay(10000)
    const result = await client.listSharingFiles({limit: 30, marker: ''})
    // assert.ok(result.items.some(item => item.file_id === folder.file_id))

    // console.log('----------result', result)
    expect(result.items.length).toBeGreaterThan(0)

    // 在folder1 创建个文件夹
    const folder2 = await client.createFolder({
      drive_id,
      parent_file_id: folder1.file_id,
      check_name_mode: 'auto_rename',
      name: '文件夹2',
    })
    let folder_id2 = folder2.file_id || ''
    expect(!!folder_id2).toBe(true)
    const listInheritPermissionRes = await client.listFileInheritPermissions({
      drive_id,
      file_id: folder_id2,
    })
    expect(!!listInheritPermissionRes).toBe(true)

    const UserPermission = await client.listUserPermissions({
      type: 'self',
      user_id: userInfo.user_id,
    })
    // console.log(UserPermission, '<-------')

    expect(UserPermission.items.length).toBe(1)

    // 取消共享权限
    const res3 = await client.removeFilePermission({
      drive_id,
      file_id: folder_id,
      member_list: [
        {
          identity: {identity_type: 'IT_User', identity_id: userInfo.user_id},
          expire_time: 4775500800000,
          role_id: 'SystemFileEditorWithoutDelete',
          disinherit_sub_group: true,
        },
      ],
    })

    expect(res3).toBe('')

    await deleteUserForce(client, userInfo.user_id)
    // 删除
    await client.batchDeleteFiles([{drive_id, file_id: folder1.file_id}], true)
  })
})
