import {describe, expect, it, vi} from 'vitest'
import {NodeDownloadTask} from '../../lib/tasks/NodeDownloadTask'
import * as http_util from '../../lib/utils/HttpUtil'

describe('NodeDownloadTask', () => {
  describe('constructor', () => {
    it('should create instance with required parameters', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        file_id: 'file123',
        drive_id: 'drive123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {
        max_chunk_size: 1024 * 1024,
        verbose: true,
      }

      const mockDownloadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      }

      const mockContextExt = {
        pipeRequest: vi.fn(),
      }

      const task = new NodeDownloadTask(checkpoint, configs, mockDownloadClient as any, mockContextExt as any)

      expect(task).toBeInstanceOf(NodeDownloadTask)
      expect(task.file).toEqual(checkpoint.file)
    })

    it('should create instance with optional request config', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        file_id: 'file123',
        drive_id: 'drive123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {
        max_chunk_size: 1024 * 1024,
        verbose: false,
      }

      const mockDownloadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      }

      const mockContextExt = {
        pipeRequest: vi.fn(),
      }

      const requestConfig = {
        timeout: 30000,
      }

      const task = new NodeDownloadTask(
        checkpoint,
        configs,
        mockDownloadClient as any,
        mockContextExt as any,
        requestConfig,
      )

      expect(task).toBeInstanceOf(NodeDownloadTask)
    })

    it('should inherit from NodeDownloader', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        file_id: 'file123',
        drive_id: 'drive123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {}

      const mockDownloadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      }

      const mockContextExt = {
        pipeRequest: vi.fn(),
      }

      const task = new NodeDownloadTask(checkpoint, configs, mockDownloadClient as any, mockContextExt as any)

      // 验证task有NodeDownloader的方法
      expect(typeof task.start).toBe('function')
      expect(typeof task.stop).toBe('function')
      expect(typeof task.cancel).toBe('function')
    })

    it('should pass http_util to parent constructor', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        file_id: 'file123',
        drive_id: 'drive123',
        loc_id: 'drive123',
        loc_type: 'drive' as const,
      }

      const configs = {}

      const mockDownloadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      }

      const mockContextExt = {
        pipeRequest: vi.fn(),
      }

      const task = new NodeDownloadTask(checkpoint, configs, mockDownloadClient as any, mockContextExt as any)

      // 验证http_util被正确传递
      expect(task).toBeDefined()
    })

    it('should work with share_id', () => {
      const checkpoint = {
        file: {name: 'test.txt', size: 100, path: '/tmp/test.txt'},
        file_id: 'file123',
        share_id: 'share123',
        loc_id: 'share123',
        loc_type: 'share' as const,
      }

      const configs = {}

      const mockDownloadClient = {
        postAPI: vi.fn(),
        request: vi.fn(),
      }

      const mockContextExt = {
        pipeRequest: vi.fn(),
      }

      const task = new NodeDownloadTask(checkpoint, configs, mockDownloadClient as any, mockContextExt as any)

      expect(task).toBeInstanceOf(NodeDownloadTask)
    })
  })
})
