/** @format */
import assert = require('assert')
import {PDSClient} from './index'

import {IGroupItem} from '../../src'
import {delay} from '../../src/utils/HttpUtil'
const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

let groupInfo: IGroupItem
let subGroupInfo: IGroupItem

describe('Group', function () {
  this.timeout(60 * 1000)

  let client: PDSClient

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
  })

  describe('CreateGroup', async () => {
    // 获取group名称 首次会加载所有并缓存
    // it('getGroupName', async () => {
    //   const result = await client.getGroupName('8d24c4d782d642bc8e7849476d3cde44', true)
    //   assert.ok(result)
    // })

    // 创建根团队
    it('createRootGroup', async () => {
      const result = await client.createGroup({
        description: '',
        group_name: `Test_Group_${Math.round(Math.random() * 1000)}`,
        is_root: true,
      })
      assert.ok(result.group_id, 'createRootGroup')
      groupInfo = result
    })

    // 创建子团队
    it('createGroup', async () => {
      const result = await client.createGroup({
        description: '',
        group_name: `Sub_Group_${Math.round(Math.random() * 1000)}`,
        parent_group_id: groupInfo.group_id,
      })
      assert.ok(result.group_id, 'createGroup')
      subGroupInfo = result
    })

    describe('MemberShip', async () => {
      it('createMembership', async () => {
        const result = await client.createMembership({
          user_id: client.token_info.user_id,
          member_type: 'user',
          member_role: 'member',
          group_id: groupInfo.group_id,
        })
        assert.ok(result.user_id)
      })

      it('getMembership', async () => {
        const result = await client.getMembership({
          user_id: client.token_info.user_id,
          member_type: 'user',
          member_role: 'member',
          group_id: groupInfo.group_id,
        })
        assert.ok(result.user_id)
      })

      it('hasMember', async () => {
        const result = await client.hasMember({
          user_id: client.token_info.user_id,
          member_type: 'user',
          group_id: groupInfo.group_id,
        })
        assert.ok(result)
      })

      it('updateMembership', async () => {
        const result = await client.updateMembership({
          user_id: client.token_info.user_id,
          member_type: 'user',
          group_id: groupInfo.group_id,
        })
        assert.ok(result.user_id)
      })

      it('deleteMembership', async () => {
        try {
          await client.deleteMembership({
            user_id: client.token_info.user_id,
            member_type: 'user',
            group_id: groupInfo.group_id,
          })
        } catch (error) {
          assert.fail('deleteMembership error')
        }
      })
      it('listDirectParentMemberships', async () => {
        const result = await client.listDirectParentMemberships({
          user_id: client.token_info.user_id,
          member_type: 'user',
          limit: 100,
        })
        assert.ok(result.items)
      })
    })
  })
  describe('get Groups', () => {
    // 团队列表
    it('listGroups without params', async () => {
      const result = await client.listGroups()
      assert.ok(result.items.length, 'listGroups')
    })
    it('listGroups', async () => {
      const result = await client.listGroups({
        limit: 30,
      })
      assert.ok(result.items.length, 'listGroups')
    })

    // 搜索团队
    it('searchGroups', async () => {
      const result = await client.searchGroups({
        limit: 30,
        group_name: 'Test_Group',
      })
      assert.ok(result.items.length >= 1, 'searchGroups')
    })

    // 列举所有团队
    it('listAllGroup', async () => {
      const result = await client.listAllGroups()
      assert.ok(result.items.length)
    })

    // 列举一个 group 下的所有子 group
    it('listMembers', async () => {
      await delay(1000)
      const result = await client.listMembers({
        limit: 100,
        group_id: groupInfo.group_id,
        member_type: 'group',
      })

      assert.ok(result.items)
    })

    // 获取团队信息
    it('getGroup', async () => {
      const result = await client.getGroup({
        group_id: groupInfo.group_id,
      })
      assert.ok(result.group_name === groupInfo.group_name, 'getGroup')
    })

    // 获取group名称
    // it('getGroupName', async () => {
    //   const result = await client.getGroupName(groupInfo.group_id)
    //   assert.ok(result)
    // })

    // // 获取group名称
    // it('getGroupName', async () => {
    //   const result = await client.getGroupName('8d24c4d782d642bc8e7849476d3cde44')
    //   assert.ok(result)
    // })

    // // 获取group名称
    // it('getGroupName', async () => {
    //   const result = await client.getGroupName('8d24c4d782d642bc8e7849476d3cde44', true)
    //   assert.ok(result)
    // })
  })

  describe('operationGroup', function () {
    // 更新团队
    it('updateGroup', async () => {
      const result = await client.updateGroup({
        group_id: groupInfo.group_id,
        group_name: 'new_name',
      })
      assert.ok(result.group_id, 'updateGroup')
    })

    // 更新团队
    it('updateEdmGroup', async () => {
      const result = await client.updateGroupName({
        group_id: groupInfo.group_id,
        name: 'edm_new_name',
      })
      assert.ok(result.group_id, 'updateEdmGroup')
    })

    // 删除团队 （有子团队  会删除失败）
    it('deleteGroup', async () => {
      try {
        const result = await client.deleteGroup({
          group_id: groupInfo.group_id,
        })
        assert.fail('should throw')
      } catch (error) {
        assert.ok(error)
      }
    })

    // 删除团队
    it('deleteGroup', async () => {
      try {
        await client.deleteGroup({
          group_id: subGroupInfo.group_id,
        })
        await client.deleteGroup({
          group_id: groupInfo.group_id,
        })
      } catch (error) {
        assert.fail(error)
      }
    })
  })
})
