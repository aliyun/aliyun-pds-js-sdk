import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSMembershipApiClient} from '../../lib/client/api_membership'

describe('PDSMembershipApiClient', () => {
  let mockPostAPI: any
  let client: PDSMembershipApiClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSMembershipApiClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('createMembership', () => {
    it('should create membership', async () => {
      mockPostAPI.mockResolvedValueOnce({
        member_type: 'user',
        member_role: 'member',
      })

      const result = await client.createMembership({
        group_id: 'g1',
        member_type: 'user',
        user_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/membership/create',
        expect.objectContaining({group_id: 'g1'}),
        undefined,
      )
      expect(result.member_type).toBe('user')
    })
  })

  describe('getMembership', () => {
    it('should get membership', async () => {
      mockPostAPI.mockResolvedValueOnce({
        group_id: 'g1',
        user_id: 'u1',
        member_type: 'user',
      })

      const result = await client.getMembership({
        group_id: 'g1',
        member_type: 'user',
        user_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/membership/get', expect.objectContaining({group_id: 'g1'}), undefined)
      expect(result.group_id).toBe('g1')
    })
  })

  describe('updateMembership', () => {
    it('should update membership', async () => {
      mockPostAPI.mockResolvedValueOnce({
        group_id: 'g1',
        user_id: 'u1',
        member_role: 'admin',
      })

      const result = await client.updateMembership({
        group_id: 'g1',
        member_type: 'user',
        user_id: 'u1',
        member_role: 'admin',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/membership/update',
        expect.objectContaining({member_role: 'admin'}),
        undefined,
      )
      expect(result.member_role).toBe('admin')
    })
  })

  describe('deleteMembership', () => {
    it('should delete membership', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.deleteMembership({
        group_id: 'g1',
        member_type: 'user',
        user_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/membership/delete',
        expect.objectContaining({group_id: 'g1'}),
        undefined,
      )
    })
  })

  describe('hasMember', () => {
    it('should check if has member', async () => {
      mockPostAPI.mockResolvedValueOnce({result: true})

      const result = await client.hasMember({
        group_id: 'g1',
        member_type: 'user',
        user_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/membership/has_member',
        expect.objectContaining({group_id: 'g1'}),
        undefined,
      )
      expect(result.result).toBe(true)
    })
  })

  describe('listDirectChildMemberships', () => {
    it('should list direct child memberships', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [
          {member_id: 'u1', member_type: 'user'},
          {member_id: 'u2', member_type: 'user'},
        ],
        next_marker: '',
      })

      const result = await client.listDirectChildMemberships({
        group_id: 'g1',
        member_type: 'user',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/membership/list_direct_child_memberships',
        expect.objectContaining({group_id: 'g1'}),
        undefined,
      )
      expect(result.items).toHaveLength(2)
    })
  })

  describe('listDirectParentMemberships', () => {
    it('should list direct parent memberships', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{group_id: 'parent1'}, {group_id: 'parent2'}],
        next_marker: '',
      })

      const result = await client.listDirectParentMemberships({
        user_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/membership/list_direct_parent_memberships',
        expect.objectContaining({user_id: 'u1'}),
        undefined,
      )
      expect(result.items).toHaveLength(2)
    })
  })
})
