import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSDriveAPIClient} from '../../lib/client/api_drive'

describe('PDSDriveAPIClient', () => {
  let mockPostAPI: any
  let client: PDSDriveAPIClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSDriveAPIClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('searchDrives', () => {
    it('should search drives', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{drive_id: 'd1', drive_name: 'Drive 1'}],
        next_marker: '',
      })

      const result = await client.searchDrives({drive_name: 'test'})

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/search', {drive_name: 'test'}, undefined)
      expect(result.items).toHaveLength(1)
    })

    it('should search drives with empty data', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [],
        next_marker: '',
      })

      const result = await client.searchDrives()

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/search', {}, undefined)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('getDrive', () => {
    it('should get drive by id', async () => {
      mockPostAPI.mockResolvedValueOnce({
        drive_id: 'd1',
        drive_name: 'Test Drive',
      })

      const result = await client.getDrive({drive_id: 'd1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/get', {drive_id: 'd1'}, undefined)
      expect(result.drive_id).toBe('d1')
    })
  })

  describe('createDrive', () => {
    it('should create drive', async () => {
      mockPostAPI.mockResolvedValueOnce({
        drive_id: 'new-drive',
        domain_id: 'domain1',
      })

      const result = await client.createDrive({
        drive_name: 'New Drive',
        drive_type: 'normal',
        owner: 'user1',
        owner_type: 'user',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/drive/create',
        expect.objectContaining({drive_name: 'New Drive'}),
        undefined,
      )
      expect(result.drive_id).toBe('new-drive')
    })
  })

  describe('updateDrive', () => {
    it('should update drive', async () => {
      mockPostAPI.mockResolvedValueOnce({
        drive_id: 'd1',
        drive_name: 'Updated Drive',
      })

      const result = await client.updateDrive({
        drive_id: 'd1',
        drive_name: 'Updated Drive',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/drive/update',
        {drive_id: 'd1', drive_name: 'Updated Drive'},
        undefined,
      )
      expect(result.drive_name).toBe('Updated Drive')
    })
  })

  describe('deleteDrive', () => {
    it('should delete drive', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.deleteDrive({drive_id: 'd1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/delete', {drive_id: 'd1'}, undefined)
    })
  })

  describe('getDefaultDrive', () => {
    it('should get default drive for user', async () => {
      mockPostAPI.mockResolvedValueOnce({
        drive_id: 'default-drive',
        user_id: 'user1',
      })

      const result = await client.getDefaultDrive({user_id: 'user1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/get_default_drive', {user_id: 'user1'}, undefined)
      expect(result.drive_id).toBe('default-drive')
    })
  })

  describe('listMyDrives', () => {
    it('should list my drives', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{drive_id: 'd1'}, {drive_id: 'd2'}],
        next_marker: '',
      })

      const result = await client.listMyDrives({limit: 10})

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/list_my_drives', {limit: 10}, undefined)
      expect(result.items).toHaveLength(2)
    })

    it('should list my drives with default params', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [],
        next_marker: '',
      })

      await client.listMyDrives()

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/list_my_drives', {}, undefined)
    })
  })

  describe('listDrives', () => {
    it('should list drives', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{drive_id: 'd1'}],
        next_marker: '',
      })

      const result = await client.listDrives({owner: 'user1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/list', {owner: 'user1'}, undefined)
      expect(result.items).toHaveLength(1)
    })
  })

  describe('listAllMyDrives', () => {
    it('should list all my drives', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: [{drive_id: 'd1'}, {drive_id: 'd2'}],
      })

      const result = await client.listAllMyDrives()

      expect(result.items).toHaveLength(2)
    })
  })

  describe('listAllDrives', () => {
    it('should list all drives', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: [
          {drive_id: 'd1', owner_type: 'user', total_size: 1000, used_size: 500},
          {drive_id: 'd2', owner_type: 'group', total_size: 2000, used_size: 1000},
        ],
      })

      const result = await client.listAllDrives({})

      expect(result.items).toHaveLength(2)
      expect(result.items[0].total).toBeDefined()
      expect(result.items[0].used).toBeDefined()
    })

    it('should filter drives by owner_type', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: [
          {drive_id: 'd1', owner_type: 'user', total_size: 1000, used_size: 500},
          {drive_id: 'd2', owner_type: 'group', total_size: 2000, used_size: 1000},
        ],
      })

      const result = await client.listAllDrives({}, undefined, 'user')

      expect(result.items).toHaveLength(1)
      expect(result.items[0].drive_id).toBe('d1')
    })

    it('should handle empty items', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: undefined,
      })

      const result = await client.listAllDrives({})

      expect(result.items).toHaveLength(0)
    })
  })

  describe('listMyGroupDrives', () => {
    it('should list my group drives', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{drive_id: 'g1'}],
        next_marker: '',
      })

      const result = await client.listMyGroupDrives()

      expect(mockPostAPI).toHaveBeenCalledWith('/drive/list_my_group_drive', {}, undefined)
      expect(result.items).toHaveLength(1)
    })
  })

  describe('listAllMyGroupDrives', () => {
    it('should list all my group drives with root', async () => {
      client.listAllItems = vi.fn().mockResolvedValueOnce({
        items: [{drive_id: 'g1'}, {drive_id: 'g2'}],
        root_group_drive: {drive_id: 'root'},
      })

      const result = await client.listAllMyGroupDrives()

      expect(result.items).toHaveLength(2)
      expect(result.root_group_drive).toEqual({drive_id: 'root'})
    })
  })
})
