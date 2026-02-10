import {describe, expect, it, vi} from 'vitest'
import {StandardParallelUploader} from '../../lib/loaders/StandardParallelUploader'

describe('StandardParallelUploader', () => {
  describe('constructor', () => {
    it('should create instance with basic config', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 10240, path: '/tmp/test.txt'},
        },
        {},
        {},
      )
      expect(loader).toBeDefined()
    })

    it('should create instance with custom options', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 10240, path: '/tmp/test.txt'},
          verbose: true,
        },
        {
          max_chunk_size: 2048,
          parallel_upload_limit: 5,
        },
        {},
      )
      expect(loader).toBeDefined()
      expect(loader.verbose).toBe(true)
    })
  })

  describe('initChunks', () => {
    it('should initialize chunks with empty parts', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 10240, path: '/tmp/test.txt'},
        },
        {max_chunk_size: 1024},
        {},
      )
      loader.initChunks([])

      expect(loader.part_info_list).toBeDefined()
      expect(loader.chunk_size).toBeDefined()
      expect(Array.isArray(loader.part_info_list)).toBe(true)
    })

    it('should initialize chunks with existing parts', () => {
      const parts = [
        {part_number: 1, etag: 'etag1'},
        {part_number: 2, etag: 'etag2'},
      ]
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 10240, path: '/tmp/test.txt'},
        },
        {max_chunk_size: 1024},
        {},
      )
      loader.initChunks(parts)

      expect(loader.part_info_list).toBeDefined()
      expect(loader.part_info_list.length).toBeGreaterThan(0)
    })

    it('should use custom chunk_size if provided', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 10240, path: '/tmp/test.txt'},
          chunk_size: 2048,
        },
        {},
        {},
      )
      loader.initChunks([])

      expect(loader.chunk_size).toBeGreaterThanOrEqual(2048)
    })

    it('should handle large file size', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'large.dat', size: 100 * 1024 * 1024, path: '/tmp/large.dat'},
        },
        {max_chunk_size: 10 * 1024 * 1024},
        {},
      )
      loader.initChunks([])

      expect(loader.part_info_list.length).toBeGreaterThan(1)
    })
  })

  describe('prepareAndCreate', () => {
    it('should handle rapid upload success', async () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {},
        {},
      )

      // Mock checkRapidUpload to return true
      loader.checkRapidUpload = vi.fn().mockResolvedValue(true)

      const result = await loader.prepareAndCreate()
      expect(result).toBe(true)
      expect(loader.checkRapidUpload).toHaveBeenCalled()
    })

    it('should handle rapid upload failure', async () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {},
        {},
      )

      // Mock checkRapidUpload to return false
      loader.checkRapidUpload = vi.fn().mockResolvedValue(false)

      const result = await loader.prepareAndCreate()
      expect(result).toBeUndefined()
      expect(loader.checkRapidUpload).toHaveBeenCalled()
    })
  })

  describe('checkRapidUpload', () => {
    it('should throw stopped error when stopFlag is true', async () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {},
        {},
      )
      loader.stopFlag = true

      try {
        await loader.checkRapidUpload()
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e.code).toBe('stopped')
      }
    })
  })

  describe('Additional coverage', () => {
    it('should handle verbose mode', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
          verbose: true,
        },
        {},
        {},
      )
      expect(loader.verbose).toBe(true)
    })

    it('should handle different file sizes for chunking', () => {
      const testCases = [
        {size: 100, expectedChunks: 1},
        {size: 10 * 1024, expectedChunks: 1},
        {size: 50 * 1024 * 1024, expectedChunks: 10}, // Minimum expected
      ]

      testCases.forEach(({size}) => {
        const loader = new StandardParallelUploader(
          {
            drive_id: 'test-drive',
            file_id: 'test-file',
            file: {name: 'test.txt', size, path: '/tmp/test.txt'},
          },
          {max_chunk_size: 10 * 1024 * 1024},
          {},
        )
        loader.initChunks([])
        expect(loader.part_info_list).toBeDefined()
      })
    })

    it('should handle initChunks with undefined parts', () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 10240, path: '/tmp/test.txt'},
        },
        {},
        {},
      )
      loader.initChunks(undefined)

      expect(loader.part_info_list).toBeDefined()
    })

    it('should handle prepareAndCreate with rapid success', async () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {},
        {},
      )

      loader.checkRapidUpload = vi.fn().mockResolvedValue(true)
      const result = await loader.prepareAndCreate()
      expect(result).toBe(true)
    })

    it('should handle prepareAndCreate with rapid failure', async () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {},
        {},
      )

      loader.checkRapidUpload = vi.fn().mockResolvedValue(false)
      const result = await loader.prepareAndCreate()
      expect(result).toBeUndefined()
    })

    it('should handle ignore_rapid flag', async () => {
      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {ignore_rapid: true},
        {},
      )

      loader.changeState = vi.fn().mockResolvedValue(undefined)
      loader.calcFileHash = vi.fn().mockResolvedValue('hash123')
      loader.create = vi.fn().mockResolvedValue(undefined)

      await loader.checkRapidUpload()
      expect(loader.hash).toBeUndefined()
    })

    it('should handle custom parts hash function', async () => {
      const customHashFn = vi.fn().mockResolvedValue({
        part_info_list: [],
        content_hash: 'custom_hash',
      })

      const loader = new StandardParallelUploader(
        {
          drive_id: 'test-drive',
          file_id: 'test-file',
          file: {name: 'test.txt', size: 1024, path: '/tmp/test.txt'},
        },
        {custom_parts_hash_fun: customHashFn},
        {},
      )

      loader.context_ext = {
        calcFilePartsHash: vi.fn(),
      }

      const result = await loader.calcFileHash({name: 'test.txt', size: 1024})
      expect(result).toBe('custom_hash')
      expect(customHashFn).toHaveBeenCalled()
    })
  })
})
