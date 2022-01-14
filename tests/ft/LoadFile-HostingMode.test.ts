/** @format */

import assert = require('assert')

const Config = require('./conf.js')
const {join} = require('path')
const {execSync} = require('child_process')

const {getClient} = require('./token-util')

const PATH_TYPE = 'HostingMode'

describe('LoadFile', function () {
  this.timeout(60000)

  describe('HostingMode', () => {
    it('success', async () => {
      const path_type = PATH_TYPE
      const {domain_id, drive_id} = Config['domains'][path_type]

      let from = join(__dirname, `tmp/tmp-${domain_id}.txt`)

      // mock 文件
      execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      var client = await getClient(path_type)

      // 上传
      var cp = await client.uploadFile(
        from,
        {
          drive_id,
          parent_file_path: '/',
        },
        {
          parallel_upload: false,
          verbose: true, //显示详细日志

          onProgress(state, progress) {
            console.log(state, progress)
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      assert(cp.state == 'success')
      assert(cp.file_path == cp.file_key)
      assert(cp.parent_file_path == '/')

      // console.log(cp)

      let file_path = cp.file_key

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_path})

      console.log(fileInfo)

      let local_name = `tmp-${domain_id}-2.txt`

      var cp2 = await client.downloadFile(fileInfo, join(__dirname, 'tmp', local_name), {
        verbose: true, //显示详细日志
        onProgress(state, progress) {
          console.log(state, progress)
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      })
      // console.log(cp2)
      assert(cp2.state == 'success')
      assert(cp2.file_path == file_path)
      assert(cp2.file_key == file_path)

      await client.postAPI('/file/delete', {drive_id, file_path})
    })
  })
})
