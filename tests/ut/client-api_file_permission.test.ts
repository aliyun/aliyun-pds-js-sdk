import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSFilePermissionAPIClient} from '../../lib/client/api_file_permission'

describe('PDSFilePermissionAPIClient', () => {
  let mockPostAPI: any
  let client: PDSFilePermissionAPIClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSFilePermissionAPIClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('listSharingFiles', () => {
    it('should list sharing files', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{file_id: 'f1'}, {file_id: 'f2'}],
        next_marker: '',
      })

      const result = await client.listSharingFiles({limit: 10})

      expect(mockPostAPI).toHaveBeenCalledWith('/file/list_sharing_file', {limit: 10}, undefined)
      expect(result.items).toHaveLength(2)
    })
  })

  describe('listReceivedFiles', () => {
    it('should list received files', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{file_id: 'f1'}],
        next_marker: '',
      })

      const result = await client.listReceivedFiles()

      expect(mockPostAPI).toHaveBeenCalledWith('/file/list_received_file', {}, undefined)
      expect(result.items).toHaveLength(1)
    })
  })

  describe('addFilePermission', () => {
    it('should add file permission', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.addFilePermission({
        drive_id: 'd1',
        file_id: 'f1',
        member_list: [
          {
            identity: {identity_id: 'user1', identity_type: 'user'},
            role_id: 'viewer',
            expire_time: Date.now() + 86400000,
          },
        ],
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/add_permission',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
    })
  })

  describe('listFilePermissions', () => {
    it('should list file permissions', async () => {
      mockPostAPI.mockResolvedValueOnce([
        {permission_id: 'perm1', role_id: 'viewer'},
        {permission_id: 'perm2', role_id: 'editor'},
      ])

      const result = await client.listFilePermissions({
        drive_id: 'd1',
        file_id: 'f1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/list_permission',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
      expect(result).toBeDefined()
    })
  })

  describe('removeFilePermission', () => {
    it('should remove file permission', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.removeFilePermission({
        drive_id: 'd1',
        file_id: 'f1',
        member_list: [
          {
            identity: {identity_id: 'user1', identity_type: 'user'},
            role_id: 'viewer',
          },
        ],
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/remove_permission',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
    })
  })

  describe('listFileInheritPermissions', () => {
    it('should list file inherit permissions', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{file_id: 'parent1'}],
        next_marker: '',
      })

      const result = await client.listFileInheritPermissions({
        drive_id: 'd1',
        file_id: 'f1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/list_inherit_permission',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
      expect(result.items).toHaveLength(1)
    })
  })

  describe('listUserPermissions', () => {
    it('should list user permissions', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{file_id: 'f1', role_id: 'viewer'}],
        next_marker: '',
      })

      const result = await client.listUserPermissions({
        user_id: 'user1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/list_user_permission',
        expect.objectContaining({user_id: 'user1'}),
        undefined,
      )
      expect(result.items).toHaveLength(1)
    })
  })

  describe('listManageSharingFiles', () => {
    it('should list manage sharing files', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{file_id: 'f1'}],
        next_marker: '',
      })

      const result = await client.listManageSharingFiles()

      expect(mockPostAPI).toHaveBeenCalledWith('/file/list_manage_sharing_file', {}, undefined)
      expect(result.items).toHaveLength(1)
    })
  })
})
