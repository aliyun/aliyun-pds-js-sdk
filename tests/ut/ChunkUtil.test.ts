/** @format */

import {
  calc_uploaded,
  calc_downloaded,
  init_chunks_sha1,
  init_chunks_parallel,
  init_chunks_download,
  get_available_size,
} from '../../src/utils/ChunkUtil'
import assert = require('assert')

describe('ChunkUtil', () => {
  describe('init_chunks_download', () => {
    it('file_size 0', () => {
      let parts = []
      let [part_list, chunk_size] = init_chunks_download(0, 5242944)
      //[ { part_number: 1, part_size: 0, from: 0, to: 0 } ] 5242944
      assert(part_list.length == 1)
      assert(part_list[0].part_number == 1)
      assert(part_list[0].part_size == 0)
      assert(part_list[0].from == 0)
      assert(part_list[0].to == 0)
      assert(chunk_size == 5242944)
    })
    it('file_size 20GB', () => {
      const file_20GB = 20 * 1024 * 1024 * 1024 // 20GB
      let [part_list, chunk_size] = init_chunks_download(file_20GB, 5242944)

      assert(part_list.length == 4096)
      assert(part_list[0].part_number == 1)
      assert(part_list[0].part_size == 5243008)
      assert(part_list[0].from == 0)
      assert(part_list[0].to == 5243008)
      assert(chunk_size == 5243008)

      let last_part = part_list[part_list.length - 1]

      assert(last_part.part_number == 4096)
      assert(last_part.part_size == 4718720)
      assert(last_part.from == 21470117760)
      assert(last_part.to == 21474836480)
      assert(last_part.to == file_20GB)
    })
  })
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

    it('reload part', () => {
      var list_uploaded_parts = {
        file_id: '62f9b1d8287f5a4f780747129e02676171bc09ab',
        upload_id: '4D987D9613D9463DAB1C43EC2BE84682',
        uploaded_parts: [
          {
            part_number: 1,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"7CA64492F36FB1C656D720B879A37093"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 2,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"58FC9EEB5F1B943A5B15AC5C8D8A0587"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 3,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"E52BC464E5358F23B439B11AB8233DC3"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 4,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"DEC5272CE56ABF60737589EC00ADC5C1"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 5,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"3B003EC0427B2F4B235FC431E54AA146"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 6,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"D894460A0C2332DE708F614A2D99D264"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 7,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"30DDC86493685D1FB6534F2897E6B386"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 8,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"0D4F95FA0A8D67D9AF250D22E062B310"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 9,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"2B1CE0EB70052361C6B72453E0F90B54"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 10,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"59F55361348681C3EF4D1F16985C1C1C"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 11,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"11A62633F53E554242E9597853F92619"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 12,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"3F6265BB1B8E254F248784C93CD1DC47"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 13,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"026ECBD4ADA8547F37C6F51BEF506975"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 14,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"B1F937E9E9F2BFDCDC0668CBA474CDD6"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 15,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"E9E33E24522C16642B16FF46706E1DDB"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 16,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"8C1A2F480224672CC423C80F05788D2F"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 17,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"1FFD4C8D751007DB2A14B8DCBD248466"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
          {
            part_number: 18,
            part_size: 10485888,
            upload_url: '',
            internal_upload_url: '',
            etag: '"6BDEE0197CDBF3E4EF946F4DE7C62491"',
            content_type: '',
            upload_form_info: null,
            internal_upload_form_info: null,
          },
        ],
        next_part_number_marker: '',
        parallel_upload: true,
      }

      let parts = list_uploaded_parts.uploaded_parts
      // console.log('-------parts:' , parts)

      let [part_list, chunk_size] = init_chunks_parallel(192770447, parts, 10485888)

      // console.log('-------',part_list, chunk_size)
      assert(part_list.length == 19)
      assert(chunk_size == 10485952)
      assert(part_list[18].part_size == 4023311)
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
