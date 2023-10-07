import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'
// import {IGroupItem} from '../../src'
import {delay} from '../../lib/utils/HttpUtil'
import {getClient} from './util/token-util'

describe('Group', function () {
  let client
  let groupInfo
  let subGroupInfo

  beforeAll(async () => {
    client = await getClient()

    // 创建根团队
    const result = await client.createGroup({
      description: '',
      group_name: `Test_Group_${Math.round(Math.random() * 1000)}`,
      is_root: true,
    })
    expect(!!result.group_id).toBe(true)
    groupInfo = result

    // 创建子团队
    const result2 = await client.createGroup({
      description: '',
      group_name: `Sub_Group_${Math.round(Math.random() * 1000)}`,
      parent_group_id: groupInfo.group_id,
    })
    expect(!!result2.group_id).toBe(true)
    subGroupInfo = result2
  })

  // 删除团队
  afterAll(async () => {
    try {
      await client.deleteGroup({
        group_id: subGroupInfo.group_id,
      })
      await client.deleteGroup({
        group_id: groupInfo.group_id,
      })
      expect('should throw').toBe(true)
    } catch (error) {
      expect(!!error).toBe(true)
    }
  })

  describe('groupMember', () => {
    it('groupMember', async () => {
      console.log('-------addGroupMember: group=', groupInfo.group_id, ', user=', client.token_info?.user_id)
      await client.addGroupMember({
        member_id: client.token_info?.user_id,
        member_type: 'user',
        group_id: groupInfo.group_id,
      })

      await delay(5000)

      console.log('-------listGroupMember')

      const result = await client.listGroupMember({
        member_type: 'user',
        group_id: groupInfo.group_id,
        limit: 100,
      })

      expect(result.user_items.length).toBeGreaterThan(0)

      console.log('-------removeGroupMember')

      await client.removeGroupMember({
        member_id: client.token_info?.user_id,
        member_type: 'user',
        group_id: groupInfo.group_id,
      })

      const result2 = await client.listGroupMember({
        member_type: 'user',
        group_id: groupInfo.group_id,
        limit: 100,
      })
      expect(result2.user_items.length).toBe(0)
    })
  })

  describe('get Groups', () => {
    // 团队列表
    it('listGroups without params', async () => {
      const result = await client.listGroups()
      expect(result.items.length).toBeGreaterThan(0)
    })
    it('listGroups', async () => {
      const result = await client.listGroups({
        limit: 30,
      })
      expect(result.items.length).toBeGreaterThan(0)
    })

    // 搜索团队
    it('searchGroups', async () => {
      const result = await client.searchGroups({
        limit: 30,
        group_name: 'Test_Group',
      })
      expect(result.items.length >= 1).toBe(true)
    })

    // 列举所有团队
    it('listAllGroup', async () => {
      const result = await client.listAllGroups()
      expect(result.items.length).toBeGreaterThan(0)
    })

    // 列举一个 group 下的所有子 group
    it('listMembers', async () => {
      await delay(1000)
      const result = await client.listMembers({
        limit: 100,
        group_id: groupInfo.group_id,
        member_type: 'group',
      })

      expect(result.items.length).toBeGreaterThan(0)
    })

    // 获取团队信息
    it('getGroup', async () => {
      const result = await client.getGroup({
        group_id: groupInfo.group_id,
      })
      expect(result.group_name).toBe(groupInfo.group_name)
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
      expect(result.group_id).toBe(groupInfo.group_id)
    })

    // 更新团队
    it('updateEdmGroup', async () => {
      const result = await client.updateGroupName({
        group_id: groupInfo.group_id,
        name: 'edm_new_name',
      })
      expect(result.group_id).toBe(groupInfo.group_id)
    })

    // 删除团队 （有子团队  会删除失败）
    it('deleteGroup', async () => {
      try {
        const result = await client.deleteGroup({
          group_id: groupInfo.group_id,
        })
        expect('should throw').toBe(true)
      } catch (error) {
        expect(!!error).toBe(true)
      }
    })
  })
})
