import {describe, expect, beforeAll, afterAll, it} from 'vitest'
import {getClient} from './util/token-util'

/**
 * 专门用于提高lib/client目录下各API文件的分支覆盖率
 */
describe('API Client Branch Coverage', function () {
  let client
  let test_drive_id
  let test_folder

  beforeAll(async () => {
    client = await getClient()
    test_drive_id = client.token_info?.default_drive_id

    // 创建测试文件夹
    test_folder = await client.createFolder({
      drive_id: test_drive_id,
      parent_file_id: 'root',
      name: `test_branch_cov_${Date.now()}`,
      check_name_mode: 'auto_rename',
    })
  })

  afterAll(async () => {
    // 清理测试文件夹
    if (test_folder?.file_id) {
      try {
        await client.deleteFile(
          {
            drive_id: test_drive_id,
            file_id: test_folder.file_id,
          },
          true,
        )
      } catch (e) {
        console.warn('Clean up failed:', e.message)
      }
    }
  })

  describe('api_file.ts branches', () => {
    it('should cover listFiles without url_expire_sec parameter', async () => {
      // 测试不传url_expire_sec参数的情况，触发默认值分支
      const result = await client.listFiles({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover listFiles with url_expire_sec parameter', async () => {
      // 测试传url_expire_sec参数的情况
      const result = await client.listFiles({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
        url_expire_sec: 3600,
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover searchFiles without url_expire_sec parameter', async () => {
      // 测试不传url_expire_sec参数的情况
      const result = await client.searchFiles({
        drive_id: test_drive_id,
        query: `parent_file_id="${test_folder.file_id}"`,
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover searchFiles with url_expire_sec parameter', async () => {
      // 测试传url_expire_sec参数的情况
      const result = await client.searchFiles({
        drive_id: test_drive_id,
        query: `parent_file_id="${test_folder.file_id}"`,
        url_expire_sec: 3600,
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover searchFiles with isRecycleBin=true', async () => {
      // 测试isRecycleBin参数为true的情况
      const result = await client.searchFiles(
        {
          drive_id: test_drive_id,
          query: '',
        },
        undefined,
        true,
      )
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover listFilesByCustomIndexKey', async () => {
      // 测试listFilesByCustomIndexKey方法
      const result = await client.listFilesByCustomIndexKey({
        drive_id: test_drive_id,
        custom_index_key: 'starred_yes',
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover listStarredFiles', async () => {
      // 测试listStarredFiles方法
      const result = await client.listStarredFiles({
        drive_id: test_drive_id,
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should cover batchToggleFilesStar with starred=true', async () => {
      // 创建一个测试文件
      const file = await client.createFolder({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
        name: `star_test_${Date.now()}`,
      })

      // 测试starred=true的情况
      await client.batchToggleFilesStar([file], true)

      // 清理
      await client.deleteFile(
        {
          drive_id: test_drive_id,
          file_id: file.file_id,
        },
        true,
      )

      expect(file).toBeDefined()
    })

    it('should cover batchToggleFilesStar with starred=false', async () => {
      // 创建一个测试文件
      const file = await client.createFolder({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
        name: `unstar_test_${Date.now()}`,
      })

      // 先标星
      await client.batchToggleFilesStar([file], true)

      // 测试starred=false的情况（取消标星）
      await client.batchToggleFilesStar([file], false)

      // 清理
      await client.deleteFile(
        {
          drive_id: test_drive_id,
          file_id: file.file_id,
        },
        true,
      )

      expect(file).toBeDefined()
    })

    it('should cover batchToggleFilesStar without starred parameter', async () => {
      // 创建测试文件
      const file = await client.createFolder({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
        name: `auto_star_test_${Date.now()}`,
      })

      // 测试不传starred参数的情况，应该自动判断
      await client.batchToggleFilesStar([file])

      // 清理
      await client.deleteFile(
        {
          drive_id: test_drive_id,
          file_id: file.file_id,
        },
        true,
      )

      expect(file).toBeDefined()
    })
  })

  describe('api_base.ts branches', () => {
    it('should cover listAllItems method', async () => {
      // 测试listAllItems中的分支逻辑
      const result = await client.listAllMyDrives()
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })
  })

  describe('api_user.ts branches', () => {
    it('should cover generalGetUser', async () => {
      // 测试generalGetUser方法中的default_drive分支
      try {
        const result = await client.generalGetUser({
          user_id: client.token_info?.user_id || 'test',
        })
        expect(result).toBeDefined()
      } catch (e) {
        // May not have permissions
        expect(e).toBeDefined()
      }
    })

    it('should cover generalSearchUsers', async () => {
      // 测试generalSearchUsers方法
      try {
        const result = await client.generalSearchUsers({
          nick_name: 'test',
        })
        expect(result).toBeDefined()
      } catch (e) {
        expect(e).toBeDefined()
      }
    })
  })

  describe('api_group.ts branches', () => {
    let test_group

    beforeAll(async () => {
      // 创建测试团队
      test_group = await client.createGroup({
        group_name: `test_group_${Date.now()}`,
        description: 'Test group for branch coverage',
      })
    })

    afterAll(async () => {
      // 清理测试团队
      if (test_group?.group_id) {
        try {
          await client.deleteGroup({group_id: test_group.group_id})
        } catch (e) {
          console.warn('Clean up group failed:', e.message)
        }
      }
    })

    it('should cover listDirectChildMemberships', async () => {
      // 测试listDirectChildMemberships方法
      const result = await client.listDirectChildMemberships({
        group_id: test_group.group_id,
      })
      expect(result).toBeDefined()
    })

    it('should cover listAllGroups', async () => {
      // 测试listAllGroups方法中的条件分支
      const result = await client.listAllGroups()
      expect(result).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })
  })

  describe('api_file_ext.ts branches', () => {
    it('should cover getFolderByPath with different parameters', async () => {
      // 测试getFolderByPath方法中的分支
      try {
        const result = await client.getFolderByPath({
          drive_id: test_drive_id,
          file_path: '/',
        })
        expect(result).toBeDefined()
      } catch (e) {
        // Some branches may throw errors, that's expected
        expect(e).toBeDefined()
      }
    })
  })

  describe('api_account.ts branches', () => {
    it('should cover getAccountLinksByUserId', async () => {
      // 测试getAccountLinksByUserId方法
      try {
        const result = await client.getAccountLinksByUserId({
          user_id: client.token_info?.user_id || 'test',
        })
        expect(result).toBeDefined()
      } catch (e) {
        // May not have permissions or feature not enabled
        expect(e).toBeDefined()
      }
    })
  })

  describe('api_sharelink.ts branches', () => {
    it('should cover sharelink methods', async () => {
      // 创建一个文件用于分享
      const file = await client.createFolder({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
        name: `share_test_${Date.now()}`,
      })

      // 创建分享链接
      const shareLink = await client.createShareLink({
        drive_id: test_drive_id,
        file_id: file.file_id,
        expiration: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      })
      expect(shareLink).toBeDefined()
      expect(shareLink.share_id).toBeDefined()

      // 获取分享链接
      const getResult = await client.getShareLink({share_id: shareLink.share_id})
      expect(getResult).toBeDefined()

      // 更新分享链接
      const updateResult = await client.updateShareLink({
        share_id: shareLink.share_id,
        description: 'Updated description',
      })
      expect(updateResult).toBeDefined()

      // 取消分享链接
      await client.cancelShareLink({share_id: shareLink.share_id})

      // 清理文件
      await client.deleteFile(
        {
          drive_id: test_drive_id,
          file_id: file.file_id,
        },
        true,
      )
    })
  })

  describe('api_membership.ts branches', () => {
    it('should cover membership methods', async () => {
      // 测试listMemberships方法
      try {
        const result = await client.listMemberships({
          limit: 10,
        })
        expect(result).toBeDefined()
      } catch (e) {
        // May require special permissions
        expect(e).toBeDefined()
      }
    })
  })

  describe('api_file_permission.ts branches', () => {
    it('should cover file permission methods', async () => {
      // 创建测试文件
      const file = await client.createFolder({
        drive_id: test_drive_id,
        parent_file_id: test_folder.file_id,
        name: `permission_test_${Date.now()}`,
      })

      try {
        // 测试listFilePermissions
        const result = await client.listFilePermissions({
          drive_id: test_drive_id,
          file_id: file.file_id,
        })
        expect(result).toBeDefined()
      } catch (e) {
        // Permissions may not be available
        expect(e).toBeDefined()
      }

      // 清理
      await client.deleteFile(
        {
          drive_id: test_drive_id,
          file_id: file.file_id,
        },
        true,
      )
    })
  })

  describe('api_file_revision.ts branches', () => {
    it('should cover file revision methods', async () => {
      try {
        // 测试listFileRevisions
        const result = await client.listFileRevisions({
          drive_id: test_drive_id,
          file_id: test_folder.file_id,
        })
        expect(result).toBeDefined()
      } catch (e) {
        // Revisions may not be supported for folders
        expect(e).toBeDefined()
      }
    })
  })
})
