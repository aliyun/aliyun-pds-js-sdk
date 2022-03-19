/** @format */

import {
  calc_uploaded,
  calc_downloaded,
  init_chunks_sha1,
  init_chunks_parallel,
  get_available_size,
} from '../../src/utils/ChunkUtil'
import assert = require('assert')

describe('ChunkUtil', () => {
  describe('init_chunks_sha1', () => {
    it('file_size 0', () => {
      let parts = []
      let [part_list, chunk_size] = init_chunks_sha1(0, parts, 5242944)
      //[ { part_number: 1, part_size: 0, from: 0, to: 0 } ] 5242944
      assert(part_list.length == 1)
      assert(part_list[0].part_number == 1)
      assert(part_list[0].part_size == 0)
      assert(part_list[0].from == 0)
      assert(part_list[0].to == 0)
      assert(chunk_size == 5242944)
    })

    it('reload part', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242000,
          done: true,
          running: false,
          from: 0,
          etag: '"xxxx"',
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          from: 5242944,
          to: 10240000,
        },
      ]
      let [part_list, chunk_size] = init_chunks_sha1(10240000, parts, 5242944)
      // console.log(part_list, chunk_size)
      assert(chunk_size == 5243008)

      assert(part_list[0].part_size == 5242000)
      assert(part_list[0].etag === '"xxxx"')
      assert(part_list[0].from == 0)
      assert(part_list[0].to == 5242000)

      assert(part_list[1].part_size == 4997056)
      assert(part_list[1].from == 5242000)
      assert(part_list[1].to == 10239056)

      assert(part_list[2].part_size == 944)
      assert(part_list[2].from == 10239056)
      assert(part_list[2].to == 10240000)
    })
  })

  describe('init_chunks_parallel', () => {
    it('reload part', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242000,
          done: true,
          running: false,
          from: 0,
          etag: '"xxxx"',
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          from: 5242944,
          to: 10240000,
        },
      ]
      let [part_list, chunk_size] = init_chunks_parallel(10240000, parts, 5242944)

      assert(chunk_size == 5243008)
      assert(part_list[0].part_size == 5243008)
      assert(!part_list[0].etag)
      assert(part_list[0].to == 5243008)
      assert(part_list[1].from == 5243008)
      assert(part_list[1].to == 10240000)
    })
  })
  describe('calc_uploaded', () => {
    it('loaded 0', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242944,
          from: 0,
          running: true,
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          from: 5242944,
          to: 10240000,
        },
      ]
      let num = calc_uploaded(parts)

      assert(num == 0)
    })

    it('loaded 5242944', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242944,
          etag: `"adasd234234"`,
          from: 0,
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          from: 5242944,
          to: 10240000,
        },
      ]
      let num = calc_uploaded(parts)

      assert(num == 5242944)
    })
  })

  describe('calc_downloaded', () => {
    it('loaded 0', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242944,
          from: 0,
          running: true,
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          from: 5242944,
          to: 10240000,
        },
      ]
      let num = calc_downloaded(parts)

      assert(num == 0)
    })
    it('loaded 5242944', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242944,
          done: true,
          running: false,
          from: 0,
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          from: 5242944,
          to: 10240000,
        },
      ]
      let num = calc_downloaded(parts)

      assert(num == 5242944)
    })

    it('init', () => {
      let parts = [
        {
          part_number: 1,
          part_size: 5242944,
          running: false,
          done: true,
          from: 0,
          to: 5242944,
        },
        {
          part_number: 2,
          part_size: 4997056,
          running: true,
          from: 5242944,
          to: 10240000,
        },
      ]
      let num = calc_downloaded(parts)

      assert(num == 5242944)
      assert(!parts[0].running)
      assert(!parts[1].running)
    })
  })

  describe('get_available_size', () => {
    it('ok', () => {
      const size_1MB = 1024 * 1024
      const size_4MB = 4 * 1024 * 1024
      const size_100MB = 100 * 1024 * 1024
      const size_1GB = 1024 * 1024 * 1024
      const size_7GB = 7 * 1024 * 1024 * 1024

      let [part_num, part_size] = get_available_size(size_100MB, size_4MB, 999)
      assert(part_num == 25)
      assert(part_size == 4194368)
    })
    it('ok2', () => {
      const size_1MB = 1024 * 1024
      const size_4MB = 4 * 1024 * 1024
      const size_100MB = 100 * 1024 * 1024
      const size_1GB = 1024 * 1024 * 1024
      const size_7GB = 7 * 1024 * 1024 * 1024

      let [part_num, part_size] = get_available_size(size_7GB, size_4MB, 999)
      assert(part_num == 999)
      assert(part_size == 7523776)
    })
  })
})
