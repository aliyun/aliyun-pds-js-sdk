import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSBaseAPIClient, spArr} from '../../lib/client/api_base'

describe('PDSBaseAPIClient', () => {
  let mockPostAPI: any
  let client: PDSBaseAPIClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSBaseAPIClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('listAllItems', () => {
    it('should fetch all items with pagination', async () => {
      mockPostAPI
        .mockResolvedValueOnce({
          items: [{id: 1}, {id: 2}],
          next_marker: 'marker1',
        })
        .mockResolvedValueOnce({
          items: [{id: 3}],
          next_marker: '',
        })

      const result = await client.listAllItems('/test/list', {})

      expect(result.items).toHaveLength(3)
      expect(result.items).toEqual([{id: 1}, {id: 2}, {id: 3}])
      expect(mockPostAPI).toHaveBeenCalledTimes(2)
    })

    it('should handle empty result', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [],
        next_marker: '',
      })

      const result = await client.listAllItems('/test/list', {})

      expect(result.items).toHaveLength(0)
      expect(mockPostAPI).toHaveBeenCalledTimes(1)
    })

    it('should handle reserve parameter', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{id: 1}],
        next_marker: '',
        total_count: 10,
      })

      const result = await client.listAllItems('/test/list', {}, {}, 'total_count')

      expect(result.items).toHaveLength(1)
      expect(result.total_count).toBe(10)
    })

    it('should use custom limit and marker', async () => {
      mockPostAPI.mockResolvedValueOnce({
        items: [{id: 1}],
        next_marker: '',
      })

      await client.listAllItems('/test/list', {limit: 50, marker: 'start'})

      expect(mockPostAPI).toHaveBeenCalledWith('/test/list', expect.objectContaining({limit: 50}), undefined)
    })
  })

  describe('getQuota', () => {
    it('should get quota', async () => {
      mockPostAPI.mockResolvedValueOnce({
        used_size: 1000,
        total_size: 10000,
      })

      const result: any = await client.getQuota()

      expect(mockPostAPI).toHaveBeenCalledWith('/domain/get_quota', {}, undefined)
      expect(result.used_size).toBe(1000)
    })

    it('should pass options to getQuota', async () => {
      mockPostAPI.mockResolvedValueOnce({})

      await client.getQuota({headers: {'X-Custom': 'test'}})

      expect(mockPostAPI).toHaveBeenCalledWith('/domain/get_quota', {}, {headers: {'X-Custom': 'test'}})
    })
  })

  describe('getAsyncTask', () => {
    it('should get async task', async () => {
      mockPostAPI.mockResolvedValueOnce({
        async_task_id: 'task-123',
        state: 'Running',
      })

      const result = await client.getAsyncTask('task-123')

      expect(mockPostAPI).toHaveBeenCalledWith('/async_task/get', {async_task_id: 'task-123'}, {})
      expect(result.async_task_id).toBe('task-123')
      expect(result.state).toBe('Running')
    })
  })

  describe('pollingAsyncTask', () => {
    it('should poll until succeed', async () => {
      mockPostAPI
        .mockResolvedValueOnce({async_task_id: 'task-123', state: 'Running'})
        .mockResolvedValueOnce({async_task_id: 'task-123', state: 'Succeed'})

      const result = await client.pollingAsyncTask('task-123', 10)

      expect(result.state).toBe('Succeed')
      expect(mockPostAPI).toHaveBeenCalledTimes(2)
    })

    it('should poll until failed', async () => {
      mockPostAPI
        .mockResolvedValueOnce({async_task_id: 'task-123', state: 'Running'})
        .mockResolvedValueOnce({async_task_id: 'task-123', state: 'Failed'})

      const result = await client.pollingAsyncTask('task-123', 10)

      expect(result.state).toBe('Failed')
    })

    it('should handle case-insensitive state', async () => {
      mockPostAPI.mockResolvedValueOnce({async_task_id: 'task-123', state: 'SUCCEED'})

      const result = await client.pollingAsyncTask('task-123', 10)

      expect(result.state).toBe('SUCCEED')
    })
  })

  describe('batch', () => {
    it('should execute batch request', async () => {
      mockPostAPI.mockResolvedValueOnce({
        responses: [
          {id: 'req1', status: 200, body: {file_id: 'f1'}},
          {id: 'req2', status: 200, body: {file_id: 'f2'}},
        ],
      })

      const result = await client.batch({
        requests: [
          {id: 'req1', url: '/file/get', body: {}, headers: {}, method: 'POST'},
          {id: 'req2', url: '/file/get', body: {}, headers: {}, method: 'POST'},
        ],
        resource: 'file',
      } as any)

      expect(result.responses).toHaveLength(2)
    })
  })

  describe('batchApi', () => {
    it('should process batch with success items', async () => {
      mockPostAPI.mockResolvedValueOnce({
        responses: [
          {id: 'req1', status: 200, body: {file_id: 'f1'}},
          {id: 'req2', status: 200, body: {file_id: 'f2'}},
        ],
      })

      const result = await client.batchApi({
        batchArr: [
          {id: 'req1', url: '/file/get', body: {}, headers: {}, method: 'POST'},
          {id: 'req2', url: '/file/get', body: {}, headers: {}, method: 'POST'},
        ],
        num: 10,
      } as any)

      expect(result.successItems).toHaveLength(2)
      expect(result.errorItems).toHaveLength(0)
    })

    it('should separate success and error items', async () => {
      mockPostAPI.mockResolvedValueOnce({
        responses: [
          {id: 'req1', status: 200, body: {file_id: 'f1'}},
          {id: 'req2', status: 404, body: {error: 'Not found'}},
        ],
      })

      const result = await client.batchApi({
        batchArr: [
          {id: 'req1', url: '/file/get', body: {}, headers: {}, method: 'POST'},
          {id: 'req2', url: '/file/get', body: {}, headers: {}, method: 'POST'},
        ],
        num: 10,
      } as any)

      expect(result.successItems).toHaveLength(1)
      expect(result.errorItems).toHaveLength(1)
      expect(result.errorItems[0]).toEqual({error: 'Not found'})
    })

    it('should split large batches', async () => {
      const items = Array.from({length: 15}, (_, i) => ({
        id: `req${i}`,
        url: '/file/get',
        body: {},
        headers: {},
        method: 'POST',
      }))

      mockPostAPI
        .mockResolvedValueOnce({
          responses: Array.from({length: 10}, (_, i) => ({
            id: `req${i}`,
            status: 200,
            body: {file_id: `f${i}`},
          })),
        })
        .mockResolvedValueOnce({
          responses: Array.from({length: 5}, (_, i) => ({
            id: `req${i + 10}`,
            status: 200,
            body: {file_id: `f${i + 10}`},
          })),
        })

      const result = await client.batchApi({
        batchArr: items,
        num: 10,
      } as any)

      expect(result.successItems).toHaveLength(15)
      expect(mockPostAPI).toHaveBeenCalledTimes(2)
    })
  })
})

describe('spArr', () => {
  it('should split array into chunks', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7]
    const result = spArr(arr, 3)

    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('should handle exact division', () => {
    const arr = [1, 2, 3, 4, 5, 6]
    const result = spArr(arr, 2)

    expect(result).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
  })

  it('should handle empty array', () => {
    const result = spArr([], 3)

    expect(result).toEqual([])
  })

  it('should handle chunk size larger than array', () => {
    const arr = [1, 2, 3]
    const result = spArr(arr, 10)

    expect(result).toEqual([[1, 2, 3]])
  })
})
