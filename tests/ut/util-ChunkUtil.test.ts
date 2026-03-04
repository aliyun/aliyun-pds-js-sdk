import {describe, expect, it} from 'vitest'

import {
  get_available_size,
  find_64x,
  init_chunks_sha,
  init_chunks_parallel,
  init_chunks_download,
  calc_uploaded,
  calc_downloaded,
} from '../../lib/utils/ChunkUtil'

describe('ChunkUtil', function () {
  describe('find_64x', () => {
    it('find_64x', () => {
      expect(find_64x(20)).toBe(64)
      expect(find_64x(64)).toBe(128)
      expect(find_64x(128)).toBe(192)
      expect(find_64x(192)).toBe(256)
    })

    it('should handle edge cases for find_64x', () => {
      expect(find_64x(1)).toBe(64)
      expect(find_64x(0)).toBe(64)
      expect(find_64x(63)).toBe(64)
      expect(find_64x(65)).toBe(128)
    })
  })
  describe('get_available_size', () => {
    it('get_available_size', () => {
      let arr = get_available_size(200, 60)
      expect(arr[0]).toBe(4)
      expect(arr[1]).toBe(64)

      let arr2 = get_available_size(200, 64)
      expect(arr2[0]).toBe(2)
      expect(arr2[1]).toBe(128)

      let arr3 = get_available_size(200, 65)
      expect(arr3[0]).toBe(2)
      expect(arr3[1]).toBe(128)

      let arr4 = get_available_size(2423, 65)
      expect(arr4[0]).toBe(19)
      expect(arr4[1]).toBe(128)
    })
    it('list part num > 10000', () => {
      let arr4 = get_available_size(1024 * 1024 * 1024, 65, 10000)
      expect(arr4[0]).toBe(9999)
      expect(arr4[1]).toBe(107392)
    })
  })

  describe('calc_uploaded', () => {
    it('file', () => {
      let part_info_list = [
        {
          part_number: 1,
          part_size: 128,
          from: 0,
          to: 128,
          etag: '"lasdfasofasdfk23"',
          running: false,
        },
        {
          part_number: 2,
          part_size: 128,
          from: 128,
          to: 256,
          running: true,
        },
        {
          part_number: 3,
          part_size: 128,
          from: 256,
          to: 384,
          running: false,
        },
      ]
      let loaded = calc_uploaded(part_info_list)
      expect(loaded).toBe(128)
    })

    it('should handle empty part_info_list', () => {
      expect(calc_uploaded([])).toBe(0)
    })

    it('should handle part without etag', () => {
      let part_info_list = [
        {
          part_number: 1,
          part_size: 128,
          from: 0,
          to: 128,
        },
        {
          part_number: 2,
          part_size: 128,
          from: 128,
          to: 256,
          etag: '"some-etag"',
        },
      ]
      let loaded = calc_uploaded(part_info_list)
      expect(loaded).toBe(128)
    })
  })
  describe('calc_downloaded', () => {
    it('file', () => {
      let part_info_list = [
        {
          part_number: 1,
          part_size: 128,
          from: 0,
          to: 128,
          done: true,
        },
        {
          part_number: 2,
          part_size: 128,
          from: 128,
          to: 256,
          running: true,
        },
        {
          part_number: 3,
          part_size: 128,
          from: 256,
          to: 384,
          running: true,
        },
      ]
      let loaded = calc_downloaded(part_info_list)
      expect(loaded).toBe(128)
    })

    it('should handle empty part_info_list', () => {
      expect(calc_downloaded([])).toBe(0)
    })

    it('should handle part without done property', () => {
      let part_info_list = [
        {
          part_number: 1,
          part_size: 128,
          from: 0,
          to: 128,
        },
        {
          part_number: 2,
          part_size: 128,
          from: 128,
          to: 256,
          done: true,
        },
      ]
      let loaded = calc_downloaded(part_info_list)
      expect(loaded).toBe(128)
    })
  })

  describe('init_chunks_sha', () => {
    it('file', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)
      let str = t.join('\n')

      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})

      let [part_info_list, chunk_size] = init_chunks_sha(str.length, [], 64)

      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)
    })

    it('empty file', () => {
      // const file = new File([], 'zero.txt', {type: 'plain/text'})
      let str = ''
      let [part_info_list, chunk_size] = init_chunks_sha(str.length, [], 64)
      expect(part_info_list.length).toBe(1)
      expect(chunk_size).toBe(64)
    })

    it('has parts', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)
      const etag = `"lasdfasofasdfk23"`
      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let str = t.join('\n')
      let [part_info_list, chunk_size] = init_chunks_sha(str.length, [], 64)
      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)

      let parts = JSON.parse(JSON.stringify(part_info_list.slice(0, 2)))
      parts[0].loaded = 128
      parts[0].etag = etag

      let [part_info_list2, chunk_size2] = init_chunks_sha(str.length, parts, 64)
      expect(part_info_list2.length).toBe(7)
      expect(chunk_size2).toBe(128)

      expect(part_info_list2[part_info_list2.length - 1]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
    })
    it('big size', () => {
      let [part_info_list, chunk_size] = init_chunks_parallel(15 * 1024 * 1024 * 1024, [], 200 * 1024 * 1024)
      expect(part_info_list.length).toBe(77)
      expect(chunk_size).toBe(209715264)
      expect(part_info_list[part_info_list.length - 1].part_size).toBe(167767296)
    })

    it('should handle very large files that exceed part limit', () => {
      // Test a file that would exceed the 9000 part limit
      let [part_info_list, chunk_size] = init_chunks_sha(1024 * 1024 * 1024 * 100, [], 1024) // 100GB file with 1KB chunks
      expect(part_info_list.length).toBeGreaterThan(0)
      expect(chunk_size).toBeGreaterThan(1024) // Should be adjusted to fit within part limit
    })
  })

  describe('init_chunks_parallel', () => {
    it('file', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let str = t.join('\n')

      let [part_info_list, chunk_size] = init_chunks_parallel(str.length, [], 64)
      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)
    })
    it('empty file', () => {
      // const file = new File([], 'zero.txt', {type: 'plain/text'})
      let str = ''
      let [part_info_list, chunk_size] = init_chunks_parallel(str.length, [], 64)
      expect(part_info_list.length).toBe(1)
      expect(chunk_size).toBe(64)
    })

    it('has parts', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const etag = `"lasdfasofasdfk23"`
      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let str = t.join('\n')

      let [part_info_list, chunk_size] = init_chunks_parallel(str.length, [], 64)
      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)

      let parts = JSON.parse(JSON.stringify(part_info_list.slice(0, 2)))
      parts[0].loaded = 128
      parts[0].etag = etag

      let [part_info_list2, chunk_size2] = init_chunks_parallel(str.length, parts, 64)

      expect(part_info_list2.length).toBe(7)
      expect(chunk_size2).toBe(128)

      expect(part_info_list2[0]).toEqual({part_number: 1, part_size: 128, from: 0, to: 128, etag})
      expect(part_info_list2[part_info_list2.length - 1]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
    })

    it('should handle parts with different sized chunks', () => {
      let parts = [
        {part_number: 1, part_size: 100, etag: 'etag1'},
        {part_number: 2, part_size: 200, etag: 'etag2'},
        {part_number: 3, part_size: 150}, // Missing etag
      ]

      let [part_info_list, chunk_size] = init_chunks_parallel(1000, parts, 200)
      expect(part_info_list.length).toBeGreaterThan(0)
      expect(chunk_size).toBeGreaterThan(0)
    })
  })

  describe('init_chunks_download', () => {
    it('file', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let str = t.join('\n')

      let [part_info_list, chunk_size] = init_chunks_download(str.length, 64)

      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)
    })
    it('empty file', () => {
      // const file = new File([], 'zero.txt', {type: 'plain/text'})
      let str = ''
      let [part_info_list, chunk_size] = init_chunks_download(str.length, 64)
      expect(part_info_list.length).toBe(1)
      expect(chunk_size).toBe(64)
    })

    it('should handle very large downloads', () => {
      let [part_info_list, chunk_size] = init_chunks_download(1024 * 1024 * 1024 * 50, 1024) // 50GB file
      expect(part_info_list.length).toBeGreaterThan(0)
      expect(chunk_size).toBeGreaterThan(0)
    })

    it('should handle file size that divides evenly into chunk size', () => {
      let [part_info_list, chunk_size] = init_chunks_download(1024, 1024) // Exactly 1 chunk
      expect(part_info_list.length).toBe(1)
      expect(part_info_list[0].part_size).toBe(1024)
      // The chunk_size may be adjusted to nearest 64x multiple
      expect(chunk_size).toBeGreaterThanOrEqual(1024)
    })
  })

  describe('Additional coverage', () => {
    it('should handle calc_uploaded with partial progress', () => {
      const part_info_list = [
        {part_number: 1, part_size: 100, etag: 'done', loaded: 100},
        {part_number: 2, part_size: 100, running: true, loaded: 50},
        {part_number: 3, part_size: 100, running: false, loaded: 0},
      ]
      const uploaded = calc_uploaded(part_info_list)
      expect(uploaded).toBeGreaterThanOrEqual(100)
    })

    it('should handle calc_downloaded with empty list', () => {
      const downloaded = calc_downloaded([])
      expect(downloaded).toBe(0)
    })

    it('should handle calc_downloaded with mixed states', () => {
      const part_info_list = [
        {part_number: 1, part_size: 200, done: true, loaded: 200},
        {part_number: 2, part_size: 200, running: true, loaded: 100},
        {part_number: 3, part_size: 200, done: false, loaded: 0},
      ]
      const downloaded = calc_downloaded(part_info_list)
      expect(downloaded).toBeGreaterThanOrEqual(200)
    })

    it('should handle init_chunks_sha with small chunk_size', () => {
      const [part_info_list, chunk_size] = init_chunks_sha(1024, [], 64)
      expect(part_info_list.length).toBeGreaterThan(0)
      expect(chunk_size).toBeGreaterThan(0)
    })

    it('should handle init_chunks_sha with existing parts', () => {
      const existingParts: any = [
        {part_number: 1, part_size: 1024, etag: 'existing1'},
        {part_number: 2, part_size: 1024, etag: 'existing2'},
      ]
      const [part_info_list, chunk_size] = init_chunks_sha(10240, existingParts, 1024)
      expect(part_info_list.length).toBeGreaterThan(0)
      expect(part_info_list[0].etag).toBe('existing1')
    })

    it('should handle init_chunks_parallel with zero parts', () => {
      const [part_info_list, chunk_size] = init_chunks_parallel(100, [], 1024)
      expect(part_info_list.length).toBe(1)
    })

    it('should handle init_chunks_parallel with large file', () => {
      const [part_info_list, chunk_size] = init_chunks_parallel(500 * 1024 * 1024, [], 10 * 1024 * 1024)
      expect(part_info_list.length).toBeGreaterThan(10)
      expect(chunk_size).toBeGreaterThan(0)
    })

    it('should handle init_chunks_download with different chunk sizes', () => {
      const [part_info_list, chunk_size] = init_chunks_download(100 * 1024 * 1024, 1024)
      expect(part_info_list.length).toBeGreaterThan(0)
    })

    it('should handle get_available_size edge cases', () => {
      // Very small file
      const [count1, size1] = get_available_size(10, 64)
      expect(count1).toBe(1)
      expect(size1).toBeGreaterThan(0)

      // Exactly at boundary
      const [count2, size2] = get_available_size(128, 64)
      expect(count2).toBeGreaterThan(0)
      expect(size2).toBe(128)
    })

    it('should handle find_64x with large numbers', () => {
      expect(find_64x(1000)).toBe(1024)
      expect(find_64x(10000)).toBe(10048)
      expect(find_64x(100000)).toBe(100032)
    })

    it('should handle calc_uploaded with all parts done', () => {
      const part_info_list = [
        {part_number: 1, part_size: 100, etag: 'done1'},
        {part_number: 2, part_size: 100, etag: 'done2'},
        {part_number: 3, part_size: 100, etag: 'done3'},
      ]
      const uploaded = calc_uploaded(part_info_list)
      expect(uploaded).toBe(300)
    })

    it('should handle calc_downloaded with all parts done', () => {
      const part_info_list = [
        {part_number: 1, part_size: 150, done: true},
        {part_number: 2, part_size: 150, done: true},
      ]
      const downloaded = calc_downloaded(part_info_list)
      expect(downloaded).toBe(300)
    })
  })
})
