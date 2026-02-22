import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSUserApiClient, formatGeneralUserItems} from '../../lib/client/api_user'

describe('PDSUserApiClient', () => {
  let mockPostAPI: any
  let client: PDSUserApiClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSUserApiClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('getUser', () => {
    it('should get user by id', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'u1',
        user_name: 'Test User',
      })

      const result = await client.getUser({user_id: 'u1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/user/get', {user_id: 'u1'}, undefined)
      expect(result.user_id).toBe('u1')
    })
  })

  describe('createUser', () => {
    it('should create user', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'new-user',
        user_name: 'New User',
      })

      const result = await client.createUser({
        user_id: 'new-user',
        user_name: 'New User',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/user/create',
        expect.objectContaining({user_id: 'new-user'}),
        undefined,
      )
      expect(result.user_id).toBe('new-user')
    })
  })

  describe('updateUser', () => {
    it('should update user', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'u1',
        nick_name: 'Updated User',
      })

      const result = await client.updateUser({
        user_id: 'u1',
        nick_name: 'Updated User',
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/user/update', expect.objectContaining({user_id: 'u1'}), undefined)
      expect(result.user_id).toBe('u1')
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.deleteUser({user_id: 'u1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/user/delete', {user_id: 'u1'}, undefined)
    })
  })

  describe('listUsers', () => {
    it('should list users', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{user_id: 'u1'}, {user_id: 'u2'}],
        next_marker: '',
      })

      const result = await client.listUsers({limit: 10})

      expect(mockPostAPI).toHaveBeenCalledWith('/user/list', {limit: 10}, undefined)
      expect(result.items).toHaveLength(2)
    })

    it('should list users without params', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [],
        next_marker: '',
      })

      await client.listUsers()

      expect(mockPostAPI).toHaveBeenCalledWith('/user/list', undefined, undefined)
    })
  })

  describe('searchUsers', () => {
    it('should search users', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{user_id: 'u1', email: 'test@example.com'}],
        next_marker: '',
      })

      const result = await client.searchUsers({email: 'test@example.com'})

      expect(mockPostAPI).toHaveBeenCalledWith('/user/search', {email: 'test@example.com'}, undefined)
      expect(result.items).toHaveLength(1)
    })
  })

  describe('listGroupUsers', () => {
    it('should list group users', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{user_id: 'u1'}],
        next_marker: '',
      })

      const result = await client.listGroupUsers({group_id: 'g1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/user/list_group_user', {group_id: 'g1'}, undefined)
      expect(result).toBeDefined()
    })
  })

  describe('generalSearchUsers', () => {
    it('should general search users with formatting', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [
          {
            user_id: 'u1',
            parent_group: [{group_name: 'Group1'}],
            default_drive: {total_size: 1000, used_size: 500},
          },
        ],
        next_marker: 'marker1',
      })

      const result = await client.generalSearchUsers({keyword: 'test'})

      expect(result.items).toHaveLength(1)
      expect(result.items[0].group_name).toBe('Group1')
      expect(result.items[0].total).toBeDefined()
      expect(result.next_marker).toBe('marker1')
    })
  })

  describe('generalGetUser', () => {
    it('should general get user with formatting', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'u1',
        parent_group: [{group_name: 'Group1'}, {group_name: 'Group2'}],
        default_drive: {total_size: 2000, used_size: 1000},
      })

      const result = await client.generalGetUser({user_id: 'u1'})

      expect(result.user_id).toBe('u1')
      expect(result.group_name).toBe('Group1,Group2')
      expect(result.total).toBeDefined()
      expect(result.used).toBeDefined()
    })

    it('should handle user without parent group', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'u1',
        parent_group: [],
      })

      const result = await client.generalGetUser({user_id: 'u1'})

      expect(result.group_name).toBe('-')
    })
  })

  describe('importUser', () => {
    it('should import user', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'imported-user',
        user_name: 'Imported User',
      })

      const result = await client.importUser({
        identity: 'imported-user',
        authentication_type: 'mobile',
      } as any)

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/user/import',
        expect.objectContaining({identity: 'imported-user'}),
        undefined,
      )
      expect(result.user_id).toBe('imported-user')
    })
  })
})

describe('formatGeneralUserItems', () => {
  it('should format user items with parent groups', () => {
    const items = [
      {
        user_id: 'u1',
        parent_group: [{group_name: 'G1'}, {group_name: 'G2'}],
        default_drive: {total_size: 1000, used_size: 500},
      },
    ] as any

    const result = formatGeneralUserItems(items)

    expect(result[0].group_name).toBe('G1,G2')
    expect(result[0].total_size).toBe(1000)
    expect(result[0].total).toBeDefined()
    expect(result[0].used).toBeDefined()
    expect(result[0].used_total).toBeDefined()
  })

  it('should handle empty parent groups', () => {
    const items = [
      {
        user_id: 'u1',
        parent_group: [],
      },
    ] as any

    const result = formatGeneralUserItems(items)

    expect(result[0].group_name).toBe('-')
  })

  it('should handle user without default drive', () => {
    const items = [
      {
        user_id: 'u1',
        parent_group: [{group_name: 'G1'}],
      },
    ] as any

    const result = formatGeneralUserItems(items)

    expect(result[0].group_name).toBe('G1')
    expect(result[0].total_size).toBeUndefined()
  })

  it('should handle multiple users', () => {
    const items = [
      {
        user_id: 'u1',
        parent_group: [{group_name: 'G1'}],
        default_drive: {total_size: 1000, used_size: 500},
      },
      {
        user_id: 'u2',
        parent_group: [{group_name: 'G2'}],
        default_drive: {total_size: 2000, used_size: 1000},
      },
    ] as any

    const result = formatGeneralUserItems(items)

    expect(result).toHaveLength(2)
    expect(result[0].group_name).toBe('G1')
    expect(result[1].group_name).toBe('G2')
  })

  it('should handle user with undefined parent_group', () => {
    const items = [
      {
        user_id: 'u1',
        parent_group: undefined,
      },
    ] as any

    const result = formatGeneralUserItems(items)

    expect(result[0].group_name).toBe('-')
  })
})
