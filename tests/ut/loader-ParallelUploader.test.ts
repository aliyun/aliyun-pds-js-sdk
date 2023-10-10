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
})
