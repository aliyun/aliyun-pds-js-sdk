import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSGroupApiClient} from '../../lib/client/api_group'

describe('PDSGroupApiClient', () => {
  let mockPostAPI: any
  let client: PDSGroupApiClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSGroupApiClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('getGroup', () => {
    it('should get group by id', async () => {
      mockPostAPI.mockResolvedValueOnce({
        group_id: 'g1',
        group_name: 'Test Group',
      })

      const result = await client.getGroup({group_id: 'g1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/group/get', {group_id: 'g1'}, undefined)
      expect(result.group_id).toBe('g1')
    })
  })

  describe('createGroup', () => {
    it('should create group', async () => {
      mockPostAPI.mockResolvedValueOnce({
        group_id: 'new-group',
        group_name: 'New Group',
      })

      const result = await client.createGroup({
        group_name: 'New Group',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/create',
        expect.objectContaining({group_name: 'New Group'}),
        undefined,
      )
      expect(result.group_id).toBe('new-group')
    })
  })

  describe('updateGroup', () => {
    it('should update group', async () => {
      mockPostAPI.mockResolvedValueOnce({
        group_id: 'g1',
        group_name: 'Updated Group',
      })

      const result = await client.updateGroup({
        group_id: 'g1',
        group_name: 'Updated Group',
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/group/update', expect.objectContaining({group_id: 'g1'}), undefined)
      expect(result.group_name).toBe('Updated Group')
    })
  })

  describe('deleteGroup', () => {
    it('should delete group', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.deleteGroup({group_id: 'g1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/group/delete', {group_id: 'g1'}, undefined)
    })
  })

  describe('listGroups', () => {
    it('should list groups', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{group_id: 'g1'}, {group_id: 'g2'}],
        next_marker: '',
      })

      const result = await client.listGroups({limit: 10})

      expect(mockPostAPI).toHaveBeenCalledWith('/group/list', {limit: 10}, undefined)
      expect(result.items).toHaveLength(2)
    })
  })

  describe('searchGroups', () => {
    it('should search groups', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{group_id: 'g1', group_name: 'Test'}],
        next_marker: '',
      })

      const result = await client.searchGroups({group_name: 'Test'})

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/search',
        expect.objectContaining({group_name: 'Test'}),
        undefined,
      )
      expect(result.items).toHaveLength(1)
    })
  })

  describe('updateGroupName', () => {
    it('should update group name (deprecated)', async () => {
      mockPostAPI.mockResolvedValueOnce({
        group_id: 'g1',
        group_name: 'New Name',
      })

      const result = await client.updateGroupName({
        group_id: 'g1',
        name: 'New Name',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/update_name',
        expect.objectContaining({name: 'New Name'}),
        undefined,
      )
      expect(result.group_name).toBe('New Name')
    })
  })

  describe('addGroupMember', () => {
    it('should add user to group', async () => {
      mockPostAPI.mockResolvedValueOnce({success: true})

      await client.addGroupMember({
        group_id: 'g1',
        member_type: 'user',
        member_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/add_member',
        expect.objectContaining({
          group_id: 'g1',
          member_type: 'user',
          member_id: 'u1',
        }),
        undefined,
      )
    })
  })

  describe('removeGroupMember', () => {
    it('should remove user from group', async () => {
      mockPostAPI.mockResolvedValueOnce({success: true})

      await client.removeGroupMember({
        group_id: 'g1',
        member_type: 'user',
        member_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/remove_member',
        expect.objectContaining({member_id: 'u1'}),
        undefined,
      )
    })
  })

  describe('listGroupMembers', () => {
    it('should list group members', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_items: [{user_id: 'u1'}, {user_id: 'u2'}],
        group_items: [{group_id: 'g2'}],
        next_marker: '',
      })

      const result = await client.listGroupMembers({group_id: 'g1'})

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/list_member',
        expect.objectContaining({group_id: 'g1'}),
        undefined,
      )
      expect(result.user_items).toHaveLength(2)
      expect(result.group_items).toHaveLength(1)
    })

    it('should list group members by type', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_items: [{user_id: 'u1'}],
        next_marker: '',
      })

      await client.listGroupMembers({
        group_id: 'g1',
        member_type: 'user',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/group/list_member',
        expect.objectContaining({member_type: 'user'}),
        undefined,
      )
    })
  })

  describe('listMembers (deprecated)', () => {
    it('should list members and fetch group details', async () => {
      client.listDirectChildMemberships = vi.fn().mockResolvedValueOnce({
        items: [{sub_group_id: 'g2'}, {sub_group_id: 'g3'}],
        next_marker: '',
      })

      client.listAllGroups = vi.fn().mockResolvedValueOnce({
        items: [
          {group_id: 'g2', group_name: 'Group 2'},
          {group_id: 'g3', group_name: 'Group 3'},
          {group_id: 'g4', group_name: 'Group 4'},
        ],
        next_marker: '',
      })

      const result = await client.listMembers({group_id: 'g1', member_type: 'group'})

      expect(result.items).toHaveLength(2)
      expect(result.items[0].group_id).toBe('g2')
      expect(result.items[1].group_id).toBe('g3')
    })

    it('should handle empty items from listDirectChildMemberships', async () => {
      client.listDirectChildMemberships = vi.fn().mockResolvedValueOnce({
        items: undefined,
        next_marker: '',
      })

      const result = await client.listMembers({group_id: 'g1', member_type: 'group'})

      expect(result.items).toEqual([])
      expect(result.next_marker).toBe('')
    })
  })

  describe('listAllGroups', () => {
    it('should list all groups', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: [
          {group_id: 'g1', group_name: 'Group 1'},
          {group_id: 'g2', group_name: 'Group 2'},
        ],
        next_marker: '',
      })

      const result = await client.listAllGroups()

      expect(client.listAllItems).toHaveBeenCalledWith('/group/list', {}, undefined)
      expect(result.items).toHaveLength(2)
    })

    it('should list all groups with params', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: [{group_id: 'g1'}],
        next_marker: '',
      })

      await client.listAllGroups({limit: 50})

      expect(client.listAllItems).toHaveBeenCalledWith('/group/list', {limit: 50}, undefined)
    })
  })
})
