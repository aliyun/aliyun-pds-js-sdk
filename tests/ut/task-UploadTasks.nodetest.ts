import {describe, expect, it, vi} from 'vitest'
import {StandardParallelUploadTask} from '../../lib/tasks/StandardParallelUploadTask'
import {StandardSerialUploadTask} from '../../lib/tasks/StandardSerialUploadTask'

describe('Upload Tasks', () => {
  describe('StandardParallelUploadTask', () => {
    it('should create instance', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        drive_id: 'drive123',
        parent_file_id: 'parent123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {
        max_chunk_size: 1024 * 1024,
        verbose: true,
      }

      const mockUploadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      } as any

      const mockContextExt = {
        calcFileHash: vi.fn(),
      } as any

      const task = new StandardParallelUploadTask(checkpoint, configs, mockUploadClient, mockContextExt)

      expect(task).toBeInstanceOf(StandardParallelUploadTask)
    })

    it('should create instance with request config', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        drive_id: 'drive123',
        parent_file_id: 'parent123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {}
      const mockUploadClient = {} as any
      const mockContextExt = {} as any
      const requestConfig = {timeout: 30000}

      const task = new StandardParallelUploadTask(checkpoint, configs, mockUploadClient, mockContextExt, requestConfig)

      expect(task).toBeInstanceOf(StandardParallelUploadTask)
    })
  })

  describe('StandardSerialUploadTask', () => {
    it('should create instance', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        drive_id: 'drive123',
        parent_file_id: 'parent123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {
        max_chunk_size: 1024 * 1024,
        verbose: true,
      }

      const mockUploadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      } as any

      const mockContextExt = {
        calcFileHash: vi.fn(),
      } as any

      const task = new StandardSerialUploadTask(checkpoint, configs, mockUploadClient, mockContextExt)

      expect(task).toBeInstanceOf(StandardSerialUploadTask)
    })

    it('should create instance with request config', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        drive_id: 'drive123',
        parent_file_id: 'parent123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {}
      const mockUploadClient = {} as any
      const mockContextExt = {} as any
      const requestConfig = {timeout: 30000}

      const task = new StandardSerialUploadTask(checkpoint, configs, mockUploadClient, mockContextExt, requestConfig)

      expect(task).toBeInstanceOf(StandardSerialUploadTask)
    })

    it('should inherit from StandardSerialUploader', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        drive_id: 'drive123',
        parent_file_id: 'parent123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {}
      const mockUploadClient = {} as any
      const mockContextExt = {} as any

      const task = new StandardSerialUploadTask(checkpoint, configs, mockUploadClient, mockContextExt)

      expect(typeof task.start).toBe('function')
      expect(typeof task.stop).toBe('function')
      expect(typeof task.cancel).toBe('function')
    })
  })
})
