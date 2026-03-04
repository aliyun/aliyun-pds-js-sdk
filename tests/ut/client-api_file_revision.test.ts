import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSFileRevisionAPIClient} from '../../lib/client/api_file_revision'

describe('PDSFileRevisionAPIClient', () => {
  let mockPostAPI: any
  let client: PDSFileRevisionAPIClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSFileRevisionAPIClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('listFileRevisions', () => {
    it('should list file revisions', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [
          {revision_id: 'r1', version: 1},
          {revision_id: 'r2', version: 2},
        ],
        next_marker: '',
      })

      const result = await client.listFileRevisions({
        drive_id: 'd1',
        file_id: 'f1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/revision/list',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
      expect(result.items).toHaveLength(2)
    })

    it('should list file revisions with limit', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{revision_id: 'r1'}],
        next_marker: '',
      })

      await client.listFileRevisions({
        drive_id: 'd1',
        file_id: 'f1',
        limit: 10,
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/file/revision/list', expect.objectContaining({limit: 10}), undefined)
    })
  })

  describe('getFileRevision', () => {
    it('should get file revision', async () => {
      mockPostAPI.mockResolvedValueOnce({
        revision_id: 'r1',
        version: 1,
        size: 1024,
      })

      const result = await client.getFileRevision({
        drive_id: 'd1',
        file_id: 'f1',
        revision_id: 'r1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/revision/get',
        expect.objectContaining({revision_id: 'r1'}),
        undefined,
      )
      expect(result.revision_id).toBe('r1')
    })
  })

  describe('deleteFileRevision', () => {
    it('should delete file revision', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.deleteFileRevision({
        drive_id: 'd1',
        file_id: 'f1',
        revision_id: 'r1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/revision/delete',
        expect.objectContaining({revision_id: 'r1'}),
        undefined,
      )
    })
  })

  describe('restoreFileRevision', () => {
    it('should restore file revision', async () => {
      mockPostAPI.mockResolvedValueOnce({
        file_id: 'f1',
        revision_id: 'r1',
      })

      const result = await client.restoreFileRevision({
        drive_id: 'd1',
        file_id: 'f1',
        revision_id: 'r1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/revision/restore',
        expect.objectContaining({revision_id: 'r1'}),
        undefined,
      )
      expect(result.file_id).toBe('f1')
    })
  })
})
