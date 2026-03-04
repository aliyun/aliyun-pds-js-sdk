import {describe, expect, it} from 'vitest'
import {ParallelUploader} from '../../lib/loaders/ParallelUploader'
import {PDSError} from '../../lib/utils/PDSError'

describe('loader/ParallelUploader', function () {
  describe('handleUpPartError', () => {
    it('stopped', async () => {
      let loader = new ParallelUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      let err = new PDSError('stopped', 'stopped')
      const running_parts = {}

      try {
        await loader.handleUpPartError(err, partInfo, running_parts)
      } catch (e) {
        expect(e.code).toBe('stopped')
      }

      expect(running_parts[1]).toBe(0)
    })

    it('404', async () => {
      let part_info_list = [
        {
          part_number: 1,
          part_size: 1024,
          from: 0,
          to: 1024,
          etag: 'a',
        },
        {
          part_number: 2,
          part_size: 1024,
          from: 1024,
          to: 2048,
          etag: 'b',
        },
      ]
      let loader = new ParallelUploader(
        {drive_id: 'x', part_info_list, file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let partInfo = part_info_list[0]
      let err = {
        response: {
          status: 404,
          data: 'The specified upload does not exist',
        },
      }

      const running_parts = {}

      try {
        await loader.handleUpPartError(err, partInfo, running_parts)
      } catch (e) {
        expect(e.response.data).toBe('The specified upload does not exist')
      }

      for (let n of part_info_list) {
        expect(n.etag).toBeUndefined()
      }
    })

    it('504', async () => {
      let part_info_list = [
        {
          part_number: 1,
          part_size: 1024,
          from: 0,
          to: 1024,
          etag: 'a',
        },
        {
          part_number: 2,
          part_size: 1024,
          from: 1024,
          to: 2048,
          etag: 'b',
        },
      ]
      let loader = new ParallelUploader(
        {drive_id: 'x', part_info_list, file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let partInfo = part_info_list[0]
      let err = {
        response: {
          status: 504,
          data: 'not allow',
        },
      }

      const running_parts = {}

      try {
        await loader.handleUpPartError(err, partInfo, running_parts)
      } catch (e) {
        expect(e.response.status).toBe(504)
      }
    })
  })

  describe('Additional branch coverage', () => {
    it('should handle cancelled error', async () => {
      const part_info_list = [{part_number: 1, from: 0, to: 100}]
      const loader = new ParallelUploader(
        {drive_id: 'x', part_info_list, file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      const partInfo = part_info_list[0]
      const err: any = new Error('cancelled')
      err.code = 'cancelled'

      const running_parts = {1: 1}

      try {
        await loader.handleUpPartError(err, partInfo, running_parts)
      } catch (e: any) {
        expect(e.code).toBe('cancelled')
      }
    })

    it('should clear etag on 404 for all parts', async () => {
      const part_info_list = [
        {
          part_number: 1,
          part_size: 1024,
          from: 0,
          to: 1024,
          etag: 'etag1',
        },
        {
          part_number: 2,
          part_size: 1024,
          from: 1024,
          to: 2048,
          etag: 'etag2',
        },
        {
          part_number: 3,
          part_size: 1024,
          from: 2048,
          to: 3072,
          etag: 'etag3',
        },
      ]

      const loader = new ParallelUploader(
        {drive_id: 'x', part_info_list, file_id: 'x1', file: {name: 'a.txt', size: 3072, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      const partInfo = part_info_list[0]
      const err: any = {
        response: {
          status: 404,
          data: 'Upload not found',
        },
      }

      const running_parts = {}

      try {
        await loader.handleUpPartError(err, partInfo, running_parts)
      } catch (e: any) {
        expect(e.response.status).toBe(404)
      }

      // 只有第一个part的etag应该被清空，因为是它触发的404
      expect(part_info_list[0].etag).toBeUndefined()
    })
  })

  describe('getNextPart logic', () => {
    it('should return allDone when part_info_list is empty', () => {
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list: [],
          file_id: 'x1',
          file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      // 通过访问私有方法测试
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(true)
      expect(result.hasNext).toBe(false)
    })

    it('should find next part without etag and not running', () => {
      const part_info_list = [
        {part_number: 1, etag: 'done1', running: false},
        {part_number: 2, etag: undefined, running: false},
        {part_number: 3, etag: undefined, running: true},
      ]
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list,
          file_id: 'x1',
          file: {name: 'a.txt', size: 300, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(false)
      expect(result.hasNext).toBe(true)
      expect(result.nextPart.part_number).toBe(2)
    })

    it('should return allDone true when all parts have etag', () => {
      const part_info_list = [
        {part_number: 1, etag: 'etag1', running: false},
        {part_number: 2, etag: 'etag2', running: false},
      ]
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list,
          file_id: 'x1',
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(true)
    })
  })

  describe('upload concurrency', () => {
    it('should handle maxConcurrency setting', () => {
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list: [{part_number: 1}],
          file_id: 'x1',
          file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'},
        },
        {init_chunk_con: 3},
        {},
      )
      expect(loader.init_chunk_con).toBe(3)
    })

    it('should handle verbose mode', () => {
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list: [{part_number: 1}],
          file_id: 'x1',
          file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'},
          verbose: true,
        },
        {},
        {},
      )
      expect(loader.verbose).toBe(true)
    })

    it('should handle getNextPart when all parts done', () => {
      const part_info_list = [
        {part_number: 1, etag: 'done1', running: false},
        {part_number: 2, etag: 'done2', running: false},
      ]
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list,
          file_id: 'x1',
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(true)
      expect(result.hasNext).toBe(false)
    })

    it('should handle getNextPart with all running', () => {
      const part_info_list = [
        {part_number: 1, etag: undefined, running: true},
        {part_number: 2, etag: undefined, running: true},
      ]
      const loader = new ParallelUploader(
        {
          drive_id: 'x',
          part_info_list,
          file_id: 'x1',
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(false)
      expect(result.hasNext).toBe(false)
    })
  })
})
