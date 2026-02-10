import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSUploadAPIClient} from '../../lib/client/api_x_upload'
import {StandardSerialUploadTask} from '../../lib/tasks/StandardSerialUploadTask'
import {StandardParallelUploadTask} from '../../lib/tasks/StandardParallelUploadTask'

describe('PDSUploadAPIClient', () => {
  let client: PDSUploadAPIClient
  let mockContextExt: any

  beforeEach(() => {
    mockContextExt = {
      parseUploadIFile: vi.fn(file => {
        if (typeof file === 'string') {
          return {name: 'test.txt', size: 100, path: file}
        }
        return file
      }),
    }

    client = new PDSUploadAPIClient(
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

  describe('createUploadTask', () => {
    it('should create StandardSerialUploadTask by default', () => {
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createUploadTask(checkpoint)

      expect(task).toBeInstanceOf(StandardSerialUploadTask)
    })

    it('should create StandardParallelUploadTask when parallel_upload is true', () => {
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createUploadTask(checkpoint, {parallel_upload: true})

      expect(task).toBeInstanceOf(StandardParallelUploadTask)
    })

    it('should create StandardSerialUploadTask when parallel_upload is false', () => {
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createUploadTask(checkpoint, {parallel_upload: false})

      expect(task).toBeInstanceOf(StandardSerialUploadTask)
    })

    it('should merge checkpoint with default path_type and parent_file_id', () => {
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      client.path_type = 'StandardMode'
      const task = client.createUploadTask(checkpoint)

      // Task should have merged checkpoint values
      expect(task).toBeDefined()
    })

    it('should pass custom configs to task', () => {
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createUploadTask(checkpoint, {
        max_chunk_size: 5 * 1024 * 1024,
        init_chunk_con: 10,
      })

      expect(task).toBeDefined()
    })

    it('should pass verbose option to task', () => {
      client.verbose = true
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createUploadTask(checkpoint)

      expect(task).toBeDefined()
    })

    it('should pass request_config to task', () => {
      const checkpoint = {
        drive_id: 'd1',
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
      } as any

      const task = client.createUploadTask(checkpoint, {}, {timeout: 10000})

      expect(task).toBeDefined()
    })
  })

  describe('uploadFile', () => {
    it('should parse file and create checkpoint', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      // Don't wait for completion
      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      // Trigger immediate success to resolve promise
      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success', file: {name: 'test.txt'}}, 'success')

      await uploadPromise

      expect(mockContextExt.parseUploadIFile).toHaveBeenCalledWith('/tmp/test.txt')
      expect(mockContextExt.parseUploadIFile).toHaveBeenCalledTimes(2) // Called twice in uploadFile
    })

    it('should resolve on success state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success', file: {name: 'test.txt'}}, 'success')

      const result = await uploadPromise
      expect(result.state).toBe('success')
    })

    it('should resolve on rapid_success state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'rapid_success', file: {name: 'test.txt'}}, 'rapid_success')

      const result = await uploadPromise
      expect(result.state).toBe('rapid_success')
    })

    it('should reject on error state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'error'}, 'error', 'Upload failed')

      await expect(uploadPromise).rejects.toThrow()
    })

    it('should reject on stopped state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'stopped'}, 'stopped')

      await expect(uploadPromise).rejects.toThrow('stopped')
    })

    it('should reject on cancelled state', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'cancelled'}, 'cancelled')

      await expect(uploadPromise).rejects.toThrow('cancelled')
    })

    it('should call onReady callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onReady = vi.fn()

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'}, {onReady})

      expect(onReady).toHaveBeenCalledWith(mockTask)

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise
    })

    it('should call onProgress callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onProgress = vi.fn()

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'}, {onProgress})

      const progressHandler = mockTask.on.mock.calls.find(call => call[0] === 'progress')[1]
      progressHandler('uploading', 50)

      expect(onProgress).toHaveBeenCalledWith('uploading', 50)

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise
    })

    it('should call onStateChange callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onStateChange = vi.fn()

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'}, {onStateChange})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      expect(onStateChange).toHaveBeenCalledWith({state: 'success'}, 'success', undefined)

      await uploadPromise
    })

    it('should call onPartComplete callback', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const onPartComplete = vi.fn()

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'}, {onPartComplete})

      const partCompleteHandler = mockTask.on.mock.calls.find(call => call[0] === 'partialcomplete')[1]
      partCompleteHandler({}, {part_number: 1, size: 1024})

      expect(onPartComplete).toHaveBeenCalledWith({}, {part_number: 1, size: 1024})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise
    })

    it('should start task after setup', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'})

      expect(mockTask.start).toHaveBeenCalled()

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise
    })

    it('should pass upload_to config to checkpoint', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile(
        '/tmp/test.txt',
        {
          drive_id: 'd1',
          parent_file_id: 'custom-parent',
        } as any,
        {},
      )

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise

      expect(client.createUploadTask).toHaveBeenCalledWith(
        expect.objectContaining({
          drive_id: 'd1',
          parent_file_id: 'custom-parent',
          file: expect.any(Object),
        }),
        expect.any(Object),
        undefined,
      )
    })

    it('should pass upload_options configs to createUploadTask', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile(
        '/tmp/test.txt',
        {drive_id: 'd1'},
        {
          parallel_upload: true,
          max_chunk_size: 5 * 1024 * 1024,
        },
      )

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise

      expect(client.createUploadTask).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          parallel_upload: true,
          max_chunk_size: 5 * 1024 * 1024,
        }),
        undefined,
      )
    })

    it('should pass request_config to createUploadTask', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const requestConfig = {timeout: 10000}
      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'}, {}, requestConfig)

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise

      expect(client.createUploadTask).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), requestConfig)
    })

    it('should handle IFile object as input', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      const file = {name: 'test.txt', size: 100, path: '/tmp/test.txt'}
      mockContextExt.parseUploadIFile.mockReturnValue(file)

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile(file, {drive_id: 'd1'})

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise

      expect(mockContextExt.parseUploadIFile).toHaveBeenCalledWith(file)
    })

    it('should use default callbacks when not provided', async () => {
      const mockTask = {
        on: vi.fn(),
        start: vi.fn(),
      }

      vi.spyOn(client, 'createUploadTask').mockReturnValue(mockTask as any)

      const uploadPromise = client.uploadFile('/tmp/test.txt', {drive_id: 'd1'}, {})

      // Should not throw when calling default callbacks
      const progressHandler = mockTask.on.mock.calls.find(call => call[0] === 'progress')[1]
      expect(() => progressHandler('uploading', 50)).not.toThrow()

      const stateChangeHandler = mockTask.on.mock.calls.find(call => call[0] === 'statechange')[1]
      stateChangeHandler({state: 'success'}, 'success')

      await uploadPromise
    })
  })
})
