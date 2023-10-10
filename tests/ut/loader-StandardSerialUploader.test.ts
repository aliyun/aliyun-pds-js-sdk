import {describe, expect, it} from 'vitest'
import {StandardSerialUploader} from '../../lib/loaders/StandardSerialUploader'

describe('loader/StandardSerialUploader', function () {
  describe('handlePartError', () => {
    it('409', async () => {
      let loader = new StandardSerialUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let called = 0
      loader.fix409 = async () => {
        called++
        return
      }

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      let err = {
        response: {
          status: 409,
        },
      }
      await loader.handlePartError(err, partInfo)
      expect(called).toBe(1)
    })

    it('400 & PartNotSequential', async () => {
      let loader = new StandardSerialUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let called = 0
      loader.fix409 = async () => {
        called++
        return
      }

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      let err = {
        code: 'PartNotSequential',
        response: {
          status: 400,
        },
      }
      await loader.handlePartError(err, partInfo)
    })

    it('504', async () => {
      let loader = new StandardSerialUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let called = 0
      loader.fix409 = async () => {
        called++
        return
      }

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      let err = {
        code: 'timeout',
        response: {
          status: 504,
        },
      }
      await loader.handlePartError(err, partInfo)
    })
    it('else throw', async () => {
      let loader = new StandardSerialUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      let called = 0
      loader.fix409 = async () => {
        called++
        return
      }

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      let err = {
        code: 'NotAllow',
        response: {
          status: 405,
        },
      }
      try {
        await loader.handlePartError(err, partInfo)
        expect(1).toBe(2)
      } catch (e) {
        expect(e.code).toBe('NotAllow')
      }
    })
  })

  describe('fix409', () => {
    it('getUploadPart return', async () => {
      let loader = new StandardSerialUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      // mock
      loader.getUploadPart = async part_number => {
        return
      }

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      await loader.fix409(partInfo)
    })
    it('getUploadPart not return etag', async () => {
      let loader = new StandardSerialUploader(
        {drive_id: 'x', file_id: 'x1', file: {name: 'a.txt', size: 100, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      // mock
      loader.getUploadPart = async part_number => {
        return {}
      }

      let partInfo = {
        part_number: 1,
        done: false,
        running: true,
        loaded: 20,
        crc64: 'xx',
        crc64_st: 'xx',
      }
      await loader.fix409(partInfo)
    })
    it('getUploadPart fix 1', async () => {
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
        {
          part_number: 3,
          part_size: 1024,
          from: 2048,
          to: 3072,
          running: true,
          etag: '',
        },
        {
          part_number: 4,
          part_size: 1024,
          from: 3072,
          to: 4096,
          etag: '',
        },
      ]

      let loader = new StandardSerialUploader(
        {drive_id: 'x', part_info_list, file_id: 'x1', file: {name: 'a.txt', size: 4096, path: '/home/admin/a.txt'}},
        {},
        {},
      )

      // mock
      loader.getUploadPart = async part_number => {
        return {
          etag: 'abc',
          part_size: 512,
        }
      }

      let partInfo = part_info_list[2]
      await loader.fix409(partInfo)

      expect(partInfo.etag).toBe('abc')
      expect(partInfo.running).toBeUndefined()
      //  expect(partInfo.end_time).toBeGreaterThan(0)
      expect(partInfo.part_size).toBe(512)
      expect(partInfo.to).toBe(2048 + 512)

      // 不是最后一片, 剩下的放到下一片
      expect(loader.part_info_list.length).toBe(4)

      expect(loader.part_info_list[3].from).toBe(2048 + 512)
      expect(loader.part_info_list[3].part_size).toBe(1024 + 512)
    })
  })
})
