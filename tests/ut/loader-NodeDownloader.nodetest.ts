import {describe, expect, it} from 'vitest'
import {NodeDownloader} from '../../lib/loaders/NodeDownloader'
import {NodeContextExt} from '../../lib/context/NodeContextExt'
import {Context} from '../../lib/index'
import {PDSError} from '../../lib/utils/PDSError'

describe('loader/NodeDownloader', function () {
  describe('handlePartError', () => {
    it('stopped', async () => {
      let loader = new NodeDownloader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
        new NodeContextExt(Context),
      )

      let partInfo = {
        done: false,
        running: true,
        loaded: 20,
      }
      let err = new PDSError('stopped', 'stopped')

      try {
        await loader.handlePartError(err, partInfo)
        expect(1).toBe(2)
      } catch (e) {
        expect(e.code).toBe('stopped')
      }
    })

    it('404', async () => {
      let part_info_list = [
        {
          part_number: 1,
          done: false,
          running: true,
          loaded: 20,
          crc64: 'xx',
          crc64_st: 'xx',
        },
        {
          part_number: 2,
          done: false,
          running: true,
          loaded: 30,
          crc64: 'xx2',
          crc64_st: 'xx2',
        },
      ]

      let loader = new NodeDownloader(
        {drive_id: 'x', file_id: 'x1', part_info_list, file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
        new NodeContextExt(Context),
      )

      let partInfo = part_info_list[0]
      let err = {
        response: {
          status: 404,
          data: 'The specified download_url does not exist',
        },
      }

      try {
        await loader.handlePartError(err, partInfo)
        expect(1).toBe(2)
      } catch (e) {
        expect(e.response.data).toBe(err.response.data)

        for (let n of part_info_list) {
          expect(n.done).toBeUndefined()
          expect(n.running).toBeUndefined()

          expect(n.crc64).toBeUndefined()
        }
      }
    })
    it('504', async () => {
      let part_info_list = [
        {
          part_number: 1,
          done: false,
          running: true,
          loaded: 20,
          crc64: 'xx',
          crc64_st: 'xx',
        },
        {
          part_number: 2,
          done: false,
          running: true,
          loaded: 30,
          crc64: 'xx2',
          crc64_st: 'xx2',
        },
      ]

      let loader = new NodeDownloader(
        {drive_id: 'x', file_id: 'x1', part_info_list, file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
        new NodeContextExt(Context),
      )

      let partInfo = part_info_list[0]
      let err = {
        response: {
          status: 504,
          data: 'Timeout',
        },
      }

      await loader.handlePartError(err, partInfo)
      expect(1).toBe(1)

      expect(partInfo.crc64).toBe('xx')
    })
    it('LengthNotMatchError', async () => {
      let part_info_list = [
        {
          part_number: 1,
          done: false,
          running: true,
          loaded: 20,
          crc64: 'xx',
          crc64_st: 'xx',
        },
        {
          part_number: 2,
          done: false,
          running: true,
          loaded: 30,
          crc64: 'xx2',
          crc64_st: 'xx2',
        },
      ]

      let loader = new NodeDownloader(
        {drive_id: 'x', file_id: 'x1', part_info_list, file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
        new NodeContextExt(Context),
      )

      let partInfo = part_info_list[0]
      let err = new Error('LengthNotMatchError')

      await loader.handlePartError(err, partInfo)
      expect(1).toBe(1)

      expect(partInfo.crc64).toBe('xx')
    })
  })

  describe('Additional coverage', () => {
    it('should handle constructor with various options', () => {
      const loader = new NodeDownloader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
          verbose: true,
        },
        {
          max_chunk_size: 2048,
          max_size_for_sha1: 1024,
        },
        {},
        new NodeContextExt(Context),
      )
      expect(loader).toBeDefined()
      expect(loader.verbose).toBe(true)
    })

    it('should handle cancelled error', async () => {
      const loader = new NodeDownloader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'},
        },
        {},
        {},
        new NodeContextExt(Context),
      )

      const partInfo = {
        done: false,
        running: true,
        loaded: 20,
      }
      const err: any = new Error('cancelled')
      err.code = 'cancelled'

      try {
        await loader.handlePartError(err, partInfo)
        expect(1).toBe(2)
      } catch (e) {
        expect(e.code).toBe('cancelled')
      }
    })

    it('should handle other errors', async () => {
      const loader = new NodeDownloader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'},
        },
        {},
        {},
        new NodeContextExt(Context),
      )

      const partInfo = {
        done: false,
        running: true,
        loaded: 20,
      }
      const err = new Error('Unknown error')

      try {
        await loader.handlePartError(err, partInfo)
        expect(1).toBe(2)
      } catch (e) {
        expect(e.message).toBe('Unknown error')
      }
    })
  })

  describe('getNextPart', () => {
    it('should return allDone when part_info_list is empty', () => {
      const loader = new NodeDownloader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list: [],
          file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'},
        },
        {},
        {},
        new NodeContextExt(Context),
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(true)
      expect(result.hasNext).toBe(false)
    })

    it('should find next part without done and not running', () => {
      const part_info_list = [
        {part_number: 1, done: true, running: false},
        {part_number: 2, done: false, running: false},
        {part_number: 3, done: false, running: true},
      ]
      const loader = new NodeDownloader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list,
          file: {name: 'a.txt', size: 300, path: '/home/admin/a.txt'},
        },
        {},
        {},
        new NodeContextExt(Context),
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(false)
      expect(result.hasNext).toBe(true)
      expect(result.nextPart.part_number).toBe(2)
    })

    it('should return allDone true when all parts are done', () => {
      const part_info_list = [
        {part_number: 1, done: true, running: false},
        {part_number: 2, done: true, running: false},
      ]
      const loader = new NodeDownloader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list,
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
        new NodeContextExt(Context),
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(true)
    })

    it('should handle all parts running', () => {
      const part_info_list = [
        {part_number: 1, done: false, running: true},
        {part_number: 2, done: false, running: true},
      ]
      const loader = new NodeDownloader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list,
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
        new NodeContextExt(Context),
      )
      const result = loader['getNextPart']()
      expect(result.allDone).toBe(false)
      expect(result.hasNext).toBe(false)
    })
  })
})
