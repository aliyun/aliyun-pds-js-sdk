import {describe, expect, it} from 'vitest'
import {
  slice_file,
  calc_sha1,
  calc_crc64,
  calc_file_sha1,
  calc_file_crc64,
  calc_file_parts_sha1,
  does_file_exist,
} from '../../lib/context/BrowserFileUtil'
import {init_chunks_sha1} from '../../lib/utils/ChunkUtil'

describe('src/context/BrowserFileUtil', () => {
  describe('slice_file', () => {
    it('slice_file', async () => {
      let file = new File(['abc123456'], 'hello.png', {type: 'plain/text'})
      let result = await slice_file(file, 0, 3)
      expect(file.size).toBe(9)
      expect(result.size).toBe(3)
    })
  })
  describe('calc_crc64', () => {
    it('calc_crc64', () => {
      expect(calc_crc64('abc', '0')).toBe('3231342946509354535')
      expect(calc_crc64('中文')).toBe('8230427039312370437')
    })
  })
  describe('calc_sha1', () => {
    it('calc_sha1', () => {
      expect(calc_sha1('abc')).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
      expect(calc_sha1('中文')).toBe('7BE2D2D20C106EEE0836C9BC2B939890A78E8FB3')
    })
  })
  describe('calc_file_sha1', () => {
    it('calc_file_sha1', async () => {
      let file = new File(['abc'], 'hello.png', {type: 'plain/text'})
      let prog = 0
      let result = await calc_file_sha1(
        file,
        0,
        p => {
          prog = p
          console.log(p)
        },
        () => false,
      )
      expect(file.size).toBe(3)
      expect(result).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
      expect(prog).toBe(100)
    })
  })
  describe('calc_file_parts_sha1', () => {
    it('calc_file_parts_sha1', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})

      let [part_info_list, chunk_size] = init_chunks_sha1(file.size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(7)
      expect(part_info_list[6]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
      expect(chunk_size).toBe(128)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha1(
        file,
        part_info_list,
        pp => {
          prog = pp
          console.log(prog, '-----<<<')
        },
        () => false,
      )

      expect(content_hash).toBe('392AF61CCA9BC02502B0BB03B45ABD78601DD1DF')
      expect(content_hash_name).toBe('sha1')
      expect(arr[6].parallel_sha1_ctx).toEqual({
        h: [2781477636, 2167910136, 4107292220, 1153442652, 2872263382],
        part_offset: 768,
      })

      expect(prog).toBe(100)
    })
  })
  describe('calc_file_crc64', () => {
    it('file', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let prog = 0
      let last = await calc_file_crc64(
        file,
        p => {
          prog = p
        },
        () => false,
      )

      expect(prog).toBe(100)
      expect(last).toBe('4762498020522648846')
    })
    it('empty file', async () => {
      const file = new File([], 'hello.txt', {type: 'plain/text'})
      let prog = 0
      let last = await calc_file_crc64(
        file,
        p => {
          prog = p
        },
        () => false,
      )

      expect(last).toBe('0')
      expect(prog).toBe(100)
    })
  })

  describe('does_file_exist', () => {
    it('file', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})

      let err = await does_file_exist(file)
      expect(err).toBe(undefined)
    })
    it('empty file', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const file = new File([], 'hello.txt', {type: 'plain/text'})

      let err = await does_file_exist(file)
      expect(err).toBe(undefined)
    })
  })
})
