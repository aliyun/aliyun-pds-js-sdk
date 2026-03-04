import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSRoleApiClient} from '../../lib/client/api_role'

describe('PDSRoleApiClient', () => {
  let mockPostAPI: any
  let client: PDSRoleApiClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSRoleApiClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('assignRole', () => {
    it('should assign role', async () => {
      mockPostAPI.mockResolvedValueOnce({
        success: true,
      })

      const result = await client.assignRole({
        identity: {identity_type: 'IT_User', identity_id: 'user1'},
        role_id: 'SystemGroupAdmin',
        manage_resource_type: 'RT_Group',
        manage_resource_id: 'group1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/role/assign',
        expect.objectContaining({role_id: 'SystemGroupAdmin'}),
        undefined,
      )
      expect(result).toBeDefined()
    })
  })

  describe('cancelAssignRole', () => {
    it('should cancel assign role', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.cancelAssignRole({
        identity: {identity_type: 'IT_User', identity_id: 'user1'},
        role_id: 'SystemGroupAdmin',
        manage_resource_type: 'RT_Group',
        manage_resource_id: 'group1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/role/cancel_assign',
        expect.objectContaining({role_id: 'SystemGroupAdmin'}),
        undefined,
      )
    })
  })

  describe('listAssignments', () => {
    it('should list assignments', async () => {
      mockPostAPI.mockResolvedValueOnce({
        assignment_list: [{identity: {identity_type: 'IT_User', identity_id: 'user1'}, role_id: 'SystemGroupAdmin'}],
        next_marker: '',
      })

      const result = await client.listAssignments({
        manage_resource_type: 'RT_Group',
        manage_resource_id: 'group1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/role/list_assignment',
        expect.objectContaining({manage_resource_type: 'RT_Group'}),
        undefined,
      )
      expect(result).toBeDefined()
    })

    it('should list assignments with limit', async () => {
      mockPostAPI.mockResolvedValueOnce({
        assignment_list: [],
        next_marker: '',
      })

      await client.listAssignments({
        limit: 10,
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/role/list_assignment', expect.objectContaining({limit: 10}), undefined)
    })
  })
})
