import {describe, expect, it} from 'vitest'

import {
  get_available_size,
  find_64x,
  init_chunks_sha1,
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
  })

  describe('init_chunks_sha1', () => {
    it('file', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)
      let str = t.join('\n')

      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})

      let [part_info_list, chunk_size] = init_chunks_sha1(str.length, [], 64)

      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)
    })

    it('empty file', () => {
      // const file = new File([], 'zero.txt', {type: 'plain/text'})
      let str = ''
      let [part_info_list, chunk_size] = init_chunks_sha1(str.length, [], 64)
      expect(part_info_list.length).toBe(1)
      expect(chunk_size).toBe(64)
    })

    it('has parts', () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)
      const etag = `"lasdfasofasdfk23"`
      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let str = t.join('\n')
      let [part_info_list, chunk_size] = init_chunks_sha1(str.length, [], 64)
      expect(part_info_list.length).toBe(7)
      expect(chunk_size).toBe(128)

      let parts = JSON.parse(JSON.stringify(part_info_list.slice(0, 2)))
      parts[0].loaded = 128
      parts[0].etag = etag

      let [part_info_list2, chunk_size2] = init_chunks_sha1(str.length, parts, 64)
      expect(part_info_list2.length).toBe(7)
      expect(chunk_size2).toBe(128)

      expect(part_info_list2[part_info_list2.length - 1]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
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
  })
})
