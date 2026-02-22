import {describe, expect, it, vi} from 'vitest'
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

  describe('initChunks', () => {
    it('should initialize chunks with default chunk size', () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 10240, path: '/home/admin/a.txt'},
        },
        {max_chunk_size: 1024},
        {},
      )

      loader.initChunks([])

      expect(loader.part_info_list).toBeDefined()
      expect(loader.chunk_size).toBeDefined()
    })

    it('should initialize chunks with existing parts', () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 10240, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )

      const existingParts = [{part_number: 1, etag: 'abc'}]
      loader.initChunks(existingParts)

      expect(loader.part_info_list).toBeDefined()
    })

    it('should use custom chunk_size if provided', () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 10240, path: '/home/admin/a.txt'},
          chunk_size: 2048,
        },
        {},
        {},
      )

      loader.initChunks([])

      // chunk_size可能会被调整，只需要验证它是基于我们传入的值
      expect(loader.chunk_size).toBeGreaterThanOrEqual(2048)
      expect(loader.chunk_size).toBeLessThanOrEqual(2112)
    })
  })

  describe('checkRapidUpload', () => {
    it('should handle 409 status during pre-hash', async () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'large.txt', size: 200 * 1024 * 1024, path: '/home/admin/large.txt'},
        },
        {min_size_for_pre_hash: 100 * 1024 * 1024, verbose: true},
        {},
      )

      loader.changeState = async () => {}
      loader.calcFileHash = async () => 'hash789'
      let createCallCount = 0
      loader.create = async () => {
        createCallCount++
        if (createCallCount === 1) {
          const err: any = new Error('Conflict')
          err.status = 409
          throw err
        }
        loader.rapid_upload = true
      }

      const result = await loader.checkRapidUpload()

      expect(createCallCount).toBe(2)
      expect(result).toBe(true)
    })
  })

  describe('prepareAndCreate', () => {
    it('should throw stopped error when stopFlag is true', async () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'test.txt', size: 1024, path: '/home/admin/test.txt'},
        },
        {},
        {},
      )

      loader.stopFlag = true

      try {
        await loader.prepareAndCreate()
        expect(true).toBe(false) // 不应该执行到这里
      } catch (e: any) {
        expect(e.code).toBe('stopped')
      }
    })
  })

  describe('Additional coverage', () => {
    it('should handle verbose logging', () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 10240, path: '/home/admin/a.txt'},
          verbose: true,
        },
        {},
        {},
      )
      expect(loader.verbose).toBe(true)
    })

    it('should handle different chunk sizes', () => {
      const chunkSizes = [1024, 5120, 10240]
      chunkSizes.forEach(chunk_size => {
        const loader = new StandardSerialUploader(
          {
            drive_id: 'x',
            file_id: 'x1',
            file: {name: 'test.txt', size: 50000, path: '/home/admin/test.txt'},
            chunk_size,
          },
          {},
          {},
        )
        loader.initChunks([])
        expect(loader.chunk_size).toBeGreaterThanOrEqual(chunk_size)
      })
    })

    it('should handle empty parts list', () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'a.txt', size: 5000, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      loader.initChunks([])
      expect(loader.part_info_list).toBeDefined()
      expect(Array.isArray(loader.part_info_list)).toBe(true)
    })

    it('should handle large file chunking', () => {
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          file: {name: 'large.dat', size: 100 * 1024 * 1024, path: '/tmp/large.dat'},
        },
        {max_chunk_size: 10 * 1024 * 1024},
        {},
      )
      loader.initChunks([])
      expect(loader.part_info_list.length).toBeGreaterThan(1)
    })
  })

  describe('getNextPart', () => {
    it('should return next part without etag and not running', () => {
      const part_info_list = [
        {part_number: 1, etag: 'abc', running: false},
        {part_number: 2, etag: undefined, running: false},
        {part_number: 3, etag: undefined, running: true},
      ]
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list,
          file: {name: 'a.txt', size: 300, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result.part_number).toBe(2)
    })

    it('should return null when all parts have etag', () => {
      const part_info_list = [
        {part_number: 1, etag: 'abc', running: false},
        {part_number: 2, etag: 'def', running: false},
      ]
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list,
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result).toBeNull()
    })

    it('should skip running parts', () => {
      const part_info_list = [
        {part_number: 1, etag: undefined, running: true},
        {part_number: 2, etag: undefined, running: false},
      ]
      const loader = new StandardSerialUploader(
        {
          drive_id: 'x',
          file_id: 'x1',
          part_info_list,
          file: {name: 'a.txt', size: 200, path: '/home/admin/a.txt'},
        },
        {},
        {},
      )
      const result = loader['getNextPart']()
      expect(result.part_number).toBe(2)
    })
  })
})
