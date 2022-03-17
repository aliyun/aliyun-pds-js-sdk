/** @format */

import assert = require('assert')
import {existsSync, unlinkSync} from 'fs'

const Config = require('./conf.js')
const {join} = require('path')
const {execSync} = require('child_process')

const {getClient} = require('./token-util')

const PATH_TYPE = 'HostingMode'

describe('LoadFile', function () {
  this.timeout(600000)

  describe('HostingMode', () => {
    it('success', async () => {
      const path_type = PATH_TYPE
      const {domain_id, drive_id} = Config['domains'][path_type]

      let from = join(__dirname, `tmp/tmp-${domain_id}-hosting.txt`)

      let local_name = `tmp-${domain_id}-hosting-2.txt`
      let to = join(__dirname, 'tmp', local_name)
      if (existsSync(to)) unlinkSync(to)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      var client = await getClient(path_type)

      let task
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
          onReady(t) {
            task = t
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024 + 'M/s')
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

      // console.log(fileInfo)

      var cp2 = await client.downloadFile(fileInfo, to, {
        verbose: true, //显示详细日志
        onReady(t) {
          task = t
        },
        onProgress(state, progress) {
          console.log(state, progress, task.speed / 1024 / 1024, 'MB/s')
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

      if (existsSync(to)) unlinkSync(to)
    })
  })
})
