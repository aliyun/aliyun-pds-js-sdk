/** @format */

import assert = require('assert')
import {PDSClient} from './index'

import {delay} from '../../src/utils/HttpUtil'

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('StandingShare', function () {
  this.timeout(60 * 1000)

  let client: PDSClient

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
  })

  it('getReceivedShareInfo', async () => {
    const result = await client.listReceivedShareFiles({marker: '', limit: 30})
    assert.ok(result.items.length)

    // 我管理的共享
    try {
      // 涉及用户隐私  这个接口应该都不能再用了
      await client.listManageSharingFiles({
        limit: 30,
        marker: '',
      })
    } catch (error) {
      assert.ok(error)
    }
  })

  it('createShare', async () => {
    const drive_id = client.token_info.default_drive_id
    // 个人空间下 创建个文件夹
    const folder1 = await client.createFolder({
      drive_id,
      parent_file_id: 'root',
      check_name_mode: 'auto_rename',
      name: '共享文件夹1',
    })
    assert.ok(folder1.file_id)

    try {
      // 共享这个文件夹
      await client.addFilePermission({
        drive_id,
        file_id: folder1.file_id,
        member_list: [
          {
            identity: {identity_type: 'IT_User', identity_id: '152fa0a9cc974ae2b26a8981847d306c'},
            expire_time: 4775500800000,
            role_id: 'SystemFileEditor',
            disinherit_sub_group: true,
          },
          {
            identity: {identity_type: 'IT_User', identity_id: '4b14efc7056a4d43b08176a006f63740'},
            expire_time: 4775500800000,
            role_id: 'SystemFileEditorWithoutDelete',
            disinherit_sub_group: true,
          },
          {
            identity: {identity_type: 'IT_User', identity_id: 'f181ff4066084880b95897b4456a7c66'},
            expire_time: 4775500800000,
            role_id: 'SystemFileEditorWithoutShareLink',
            disinherit_sub_group: true,
          },
        ],
      })
    } catch (error) {
      assert.fail('createShare error')
    }

    const permissionArr = await client.listFilePermissions({
      drive_id,
      file_id: folder1.file_id,
    })
    assert.ok(permissionArr.length === 3)

    await delay(10000)
    const result = await client.listSharingFiles({limit: 30, marker: ''})
    // assert.ok(result.items.some(item => item.file_id === folder.file_id))
    assert.ok(result.items.length)

    // 在folder1 创建个文件夹
    const folder2 = await client.createFolder({
      drive_id,
      parent_file_id: folder1.file_id,
      check_name_mode: 'auto_rename',
      name: '文件夹2',
    })
    assert.ok(folder2.file_id)
    const listInheritPermissionRes = await client.listFileInheritPermissions({
      drive_id,
      file_id: folder2.file_id,
    })
    assert.ok(listInheritPermissionRes)

    const UserPermission = await client.listUserPermissions({
      type: 'self',
      user_id: 'superadmin',
    })

    assert.ok(UserPermission.items.length)

    try {
      // 取消共享权限
      await client.removeFilePermission({
        drive_id,
        file_id: folder1.file_id,
        member_list: [
          {
            identity: {identity_type: 'IT_User', identity_id: '4b14efc7056a4d43b08176a006f63740'},
            expire_time: 4775500800000,
            role_id: 'SystemFileEditorWithoutDelete',
            disinherit_sub_group: true,
          },
        ],
      })
    } catch (error) {
      assert.fail('remove Permission error')
    }
    client.batchDeleteFiles([{drive_id, file_id: folder1.file_id}], true)
  })
})
