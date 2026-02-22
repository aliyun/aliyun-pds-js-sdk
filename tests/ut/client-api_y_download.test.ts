import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSDownloadApiClient} from '../../lib/client/api_y_download'
import {NodeDownloadTask} from '../../lib/tasks/NodeDownloadTask'
import {WebDownloadTask} from '../../lib/tasks/WebDownloadTask'

describe('PDSDownloadApiClient', () => {
  let client: PDSDownloadApiClient
  let mockContextExt: any

  beforeEach(() => {
    mockContextExt = {
      parseUploadIFile: vi.fn(file => {
        if (typeof file === 'string') {
          return {name: 'test.txt', size: 100, path: file}
        }
        return file
      }),
      parseDownloadTo: vi.fn((downloadTo, pdsFile) => {
        return {name: 'download.txt', size: pdsFile.size || 100, path: downloadTo}
      }),
    }

    client = new PDSDownloadApiClient(
      {
        api_endpoint: 'https://api.example.com',
      } as any,
      mockContextExt,
    )
  })

  describe('constructor', () => {
    it('should create instance with correct params', () => {
      expect(client).toBeDefined()
      expect(client.contextExt).toBe(mockContextExt)
    })
  })

  describe('createDownloadTask', () => {
    it('should create download task based on environment', () => {
      const checkpoint = {
        drive_id: 'd1',
        file_id: 'f1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createDownloadTask(checkpoint, {})

      expect(task).toBeDefined()
      // In browser: WebDownloadTask, in Node: NodeDownloadTask
      expect(task.constructor.name).toMatch(/DownloadTask$/)
    })

    it('should merge checkpoint with default path_type', () => {
      const checkpoint = {
        drive_id: 'd1',
        file_id: 'f1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      client.path_type = 'StandardMode'
      const task = client.createDownloadTask(checkpoint, {})

      expect(task).toBeDefined()
    })

    it('should pass custom configs to task', () => {
      const checkpoint = {
        drive_id: 'd1',
        file_id: 'f1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createDownloadTask(checkpoint, {
        max_chunk_size: 5 * 1024 * 1024,
        init_chunk_con: 10,
      })

      expect(task).toBeDefined()
    })

    it('should pass verbose option to task', () => {
      client.verbose = true
      const checkpoint = {
        drive_id: 'd1',
        file_id: 'f1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createDownloadTask(checkpoint, {})

      expect(task).toBeDefined()
    })

    it('should pass checking_crc option', () => {
      const checkpoint = {
        drive_id: 'd1',
        file_id: 'f1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createDownloadTask(checkpoint, {checking_crc: false})

      expect(task).toBeDefined()
    })

    it('should pass request_config to task', () => {
      const checkpoint = {
        drive_id: 'd1',
        file_id: 'f1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createDownloadTask(checkpoint, {}, {timeout: 10000})

      expect(task).toBeDefined()
    })
  })

  describe('downloadFile', () => {
    it('should reject when download_to is not a string', async () => {
      await expect(client.downloadFile({drive_id: 'd1', file_id: 'f1'}, null as any)).rejects.toThrow(
        'Invalid download_to',
      )
    })

    it('should reject when download_to is undefined', async () => {
      await expect(client.downloadFile({drive_id: 'd1', file_id: 'f1'}, undefined as any)).rejects.toThrow(
        'Invalid download_to',
      )
    })

    it('should reject when download_to is a number', async () => {
      await expect(client.downloadFile({drive_id: 'd1', file_id: 'f1'}, 123 as any)).rejects.toThrow(
        'Invalid download_to',
      )
    })

    it('should parse download_to and create checkpoint', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success', file: {name: 'download.txt'}}, 'success')

      await downloadPromise

      expect(mockContextExt.parseDownloadTo).toHaveBeenCalledWith(
        '/tmp/download.txt',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
      )
    })

    it('should resolve on success state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success', file: {name: 'download.txt'}}, 'success')

      const result = await downloadPromise
      expect(result.state).toBe('success')
    })

    it('should reject on error state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'error'}, 'error', 'Download failed')

      await expect(downloadPromise).rejects.toThrow()
    })

    it('should reject on stopped state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'stopped'}, 'stopped')

      await expect(downloadPromise).rejects.toThrow('stopped')
    })

    it('should reject on cancelled state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'cancelled'}, 'cancelled')

      await expect(downloadPromise).rejects.toThrow('cancelled')
    })

    it('should call onReady callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onReady = vi.fn()

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt', {
        onReady,
      })

      expect(onReady).toHaveBeenCalledWith(mockTask)

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise
    })

    it('should call onProgress callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onProgress = vi.fn()

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt', {
        onProgress,
      })

      const progressHandler = mockTask.on.mock.calls.find(call => call[0] === 'progress')[1]
      progressHandler('downloading', 75)

      expect(onProgress).toHaveBeenCalledWith('downloading', 75)

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise
    })

    it('should call onStateChange callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onStateChange = vi.fn()

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt', {
        onStateChange,
      })

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      expect(onStateChange).toHaveBeenCalledWith({state: 'success'}, 'success', undefined)

      await downloadPromise
    })

    it('should call onPartComplete callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onPartComplete = vi.fn()

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt', {
        onPartComplete,
      })

      const partCompleteHandler = mockTask.on.mock.calls.find(call => call[0] === 'partialcomplete')[1]
      partCompleteHandler({}, {part_number: 1, size: 1024})

      expect(onPartComplete).toHaveBeenCalledWith({}, {part_number: 1, size: 1024})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise
    })

    it('should start task after setup', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      expect(mockTask.start).toHaveBeenCalled()

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise
    })

    it('should pass pds_file config to checkpoint', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile(
        {
          drive_id: 'd1',
          file_id: 'f1',
          size: 100,
          name: 'original.txt',
        },
        '/tmp/download.txt',
        {},
      )

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise

      expect(client.createDownloadTask).toHaveBeenCalledWith(
        expect.objectContaining({
          drive_id: 'd1',
          file_id: 'f1',
          size: 100,
          name: 'original.txt',
        }),
        expect.any(Object),
        undefined,
      )
    })

    it('should pass download_options configs to createDownloadTask', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt', {
        checking_crc: false,
        max_chunk_size: 5 * 1024 * 1024,
      })

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise

      expect(client.createDownloadTask).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          checking_crc: false,
          max_chunk_size: 5 * 1024 * 1024,
        }),
        undefined,
      )
    })

    it('should pass request_config to createDownloadTask', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const requestConfig = {timeout: 10000}
      const downloadPromise = client.downloadFile(
        {drive_id: 'd1', file_id: 'f1', size: 100},
        '/tmp/download.txt',
        {},
        requestConfig,
      )

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise

      expect(client.createDownloadTask).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), requestConfig)
    })

    it('should use default callbacks when not provided', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt', {})

      // Should not throw when calling default callbacks
      const progressHandler = mockTask.on.mock.calls.find(call => call[0] === 'progress')[1]
      expect(() => progressHandler('downloading', 50)).not.toThrow()

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise
    })

    it('should merge path_type with pds_file', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createDownloadTask').mockReturnValue(mockTask as any)

      client.path_type = 'StandardMode'
      const downloadPromise = client.downloadFile({drive_id: 'd1', file_id: 'f1', size: 100}, '/tmp/download.txt')

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await downloadPromise

      expect(client.createDownloadTask).toHaveBeenCalledWith(
        expect.objectContaining({
          path_type: 'StandardMode',
        }),
        expect.any(Object),
        undefined,
      )
    })
  })
})
