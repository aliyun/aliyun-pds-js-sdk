/** @format */

import assert = require('assert')
const sinon = require('sinon')
import {init_chunks_sha1} from '../../src/utils/ChunkUtil'
import {StandardSerialUploader} from '../../src/loaders/StandardSerialUploader'

describe('StandardSerialUploader', function () {
  describe('fixUploadParts_StandardMode', function () {
    it('fixUploadParts_StandardMode', async () => {
      let [part_info_list] = init_chunks_sha1(10 * 1024 * 1024, [], 3 * 1024 * 1024)

      let partInfo = part_info_list[0]

      let client = new StandardSerialUploader(
        {
          file: {},
          part_info_list,
        },
        {},
        {
          http_util: {},
        },
      )

      sinon.stub(client, 'getUploadPart').callsFake(async () => {
        return {part_number: 1, part_size: 3000000, etag: '"xxxx"'}
      })
      sinon.stub(client, 'getUploadUrl').callsFake(async () => {})
      sinon.stub(client, 'notifyPartCompleted').callsFake(async part => {})

      await client.fixUploadParts_StandardMode(partInfo)

      assert(part_info_list[0].part_size == 3000000)
      assert(part_info_list[0].etag == '"xxxx"')
      assert(part_info_list[0].to == 3000000)

      assert(part_info_list[1].from == 3000000)
    })
  })
})
