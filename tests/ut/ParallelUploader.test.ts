/** @format */

import assert = require('assert')
import AxiosError from 'axios'
const sinon = require('sinon')
import {init_chunks_sha1} from '../../src/utils/ChunkUtil'
import {ParallelUploader} from '../../src/loaders/ParallelUploader'

describe('ParallelUploader test', function () {
  describe('handleUpPartError', function () {
    it('stopped', async () => {
      let [part_info_list] = init_chunks_sha1(10 * 1024 * 1024, [], 3 * 1024 * 1024)

      let partInfo = part_info_list[0]

      let client = new ParallelUploader(
        {
          file: {},
          part_info_list,
        },
        {},
        {
          http_util: {},
        },
      )

      var e = new Error('stopped')
      var running_parts = {}

      try {
        await client.handleUpPartError(e, partInfo, running_parts)
      } catch (e) {
        assert(e.message == 'stopped')
      }
    })
    it('handleUpPartError', async () => {
      let [part_info_list] = init_chunks_sha1(10 * 1024 * 1024, [], 3 * 1024 * 1024)

      let partInfo = part_info_list[0]

      let client = new ParallelUploader(
        {
          file: {},
          part_info_list,
        },
        {
          verbose: true,
        },
        {
          http_util: {},
        },
      )

      var e = {
        message: 'test',
        response: {
          status: 404,
          data: 'The specified upload does not exist',
        },
      }
      var running_parts = {}

      try {
        await client.handleUpPartError(e, partInfo, running_parts)
      } catch (e) {
        assert(e.message == 'test')
      }
    })
  })
})
