import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSShareLinkApiClient} from '../../lib/client/api_sharelink'

describe('PDSShareLinkApiClient', () => {
  let mockPostAPI: any
  let mockPostAPIAnonymous: any
  let client: PDSShareLinkApiClient

  beforeEach(() => {
    mockPostAPI = vi.fn()
    mockPostAPIAnonymous = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSShareLinkApiClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
    client.postAPIAnonymous = mockPostAPIAnonymous
  })

  describe('createShareLink', () => {
    it('should create share link', async () => {
      mockPostAPI.mockResolvedValueOnce({
        share_id: 'share1',
        share_url: 'https://example.com/s/share1',
      })

      const result = await client.createShareLink({
        drive_id: 'd1',
        file_id_list: ['f1', 'f2'],
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/share_link/create',
        expect.objectContaining({drive_id: 'd1'}),
        undefined,
      )
      expect(result.share_id).toBe('share1')
    })
  })

  describe('cancelShareLink', () => {
    it('should cancel share link', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.cancelShareLink({share_id: 'share1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/share_link/cancel', {share_id: 'share1'}, undefined)
    })
  })

  describe('getShareLink', () => {
    it('should get share link', async () => {
      mockPostAPI.mockResolvedValueOnce({
        share_id: 'share1',
        share_url: 'https://example.com/s/share1',
      })

      const result = await client.getShareLink({share_id: 'share1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/share_link/get', {share_id: 'share1'}, undefined)
      expect(result.share_id).toBe('share1')
    })
  })

  describe('updateShareLink', () => {
    it('should update share link', async () => {
      mockPostAPI.mockResolvedValueOnce({
        share_id: 'share1',
        expiration: '2024-12-31',
      })

      const result = await client.updateShareLink({
        share_id: 'share1',
        expiration: '2024-12-31',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/share_link/update',
        expect.objectContaining({share_id: 'share1'}),
        undefined,
      )
      expect(result.expiration).toBe('2024-12-31')
    })
  })

  describe('listShareLinks', () => {
    it('should list share links', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{share_id: 's1'}, {share_id: 's2'}],
        next_marker: '',
      })

      const result = await client.listShareLinks({creator: 'user1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/share_link/list', {creator: 'user1'}, undefined)
      expect(result.items).toHaveLength(2)
    })
  })

  describe('searchShareLinks', () => {
    it('should search share links', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{share_id: 's1'}],
        next_marker: '',
      })

      const result = await client.searchShareLinks({query: 'test'})

      expect(mockPostAPI).toHaveBeenCalledWith('/share_link/search', {query: 'test'}, undefined)
      expect(result.items).toHaveLength(1)
    })
  })

  describe('getShareLinkByAnonymous', () => {
    it('should get share link anonymously', async () => {
      mockPostAPIAnonymous.mockResolvedValueOnce({
        share_name: 'Public Share',
        creator_name: 'User***',
      })

      const result = await client.getShareLinkByAnonymous({share_id: 's1'})

      expect(mockPostAPIAnonymous).toHaveBeenCalledWith('/share_link/get_by_anonymous', {share_id: 's1'}, undefined)
      expect(result.share_name).toBe('Public Share')
    })
  })

  describe('getShareToken', () => {
    it('should get share token', async () => {
      mockPostAPIAnonymous.mockResolvedValueOnce({
        share_token: 'token123',
        expires_in: 7200,
      })

      const result = await client.getShareToken({share_id: 's1'})

      expect(mockPostAPIAnonymous).toHaveBeenCalledWith('/share_link/get_share_token', {share_id: 's1'}, undefined)
      expect(result.share_token).toBe('token123')
    })

    it('should get share token with password', async () => {
      mockPostAPIAnonymous.mockResolvedValueOnce({
        share_token: 'token456',
      })

      await client.getShareToken({
        share_id: 's1',
        share_pwd: 'abc123',
        expire_sec: 3600,
      })

      expect(mockPostAPIAnonymous).toHaveBeenCalledWith(
        '/share_link/get_share_token',
        expect.objectContaining({
          share_id: 's1',
          share_pwd: 'abc123',
          expire_sec: 3600,
        }),
        undefined,
      )
    })
  })
})
