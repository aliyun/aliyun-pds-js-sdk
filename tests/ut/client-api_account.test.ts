import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSAccountApiClient} from '../../lib/client/api_account'

describe('PDSAccountApiClient', () => {
  let mockPostAPI: any
  let client: PDSAccountApiClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSAccountApiClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAuth = mockPostAPI
  })

  describe('linkAccount', () => {
    it('should link account', async () => {
      mockPostAPI.mockResolvedValueOnce({
        user_id: 'u1',
        status: 'enabled',
      })

      const result = await client.linkAccount({
        type: 'mobile',
        identity: '1234567890',
        user_id: 'u1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/account/link', expect.objectContaining({user_id: 'u1'}), undefined)
      expect(result.user_id).toBe('u1')
    })
  })

  describe('unlinkAccount', () => {
    it('should unlink account', async () => {
      mockPostAPI.mockResolvedValueOnce(undefined)

      await client.unlinkAccount({
        user_id: 'u1',
        identity: '1234567890',
        type: 'mobile',
      })

      expect(mockPostAPI).toHaveBeenCalledWith('/account/unlink', expect.objectContaining({user_id: 'u1'}), undefined)
    })
  })

  describe('getAccountLink', () => {
    it('should get account link info', async () => {
      mockPostAPI.mockResolvedValueOnce({
        identity: 'user@example.com',
        type: 'email',
      })

      const result = await client.getAccountLink({
        identity: 'user@example.com',
        type: 'email',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/account/get_link_info',
        expect.objectContaining({identity: 'user@example.com'}),
        undefined,
      )
      expect(result.identity).toBe('user@example.com')
    })
  })

  describe('getAccountLinksByUserId', () => {
    it('should get account links by user id', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [
          {user_id: 'u1', identity: 'test@example.com', type: 'email'},
          {user_id: 'u1', identity: '123456789', type: 'mobile'},
        ],
      })

      const result = await client.getAccountLinksByUserId({user_id: 'u1'})

      expect(mockPostAPI).toHaveBeenCalledWith('/account/get_link_info_by_user_id', {user_id: 'u1'}, undefined)
      expect(result.items).toHaveLength(2)
    })
  })
})
