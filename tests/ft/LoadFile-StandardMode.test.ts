/** @format */

import assert = require('assert')

const Config = require('./conf.js')
const {join, basename} = require('path')
const {execSync} = require('child_process')
const {existsSync, writeFileSync, statSync, unlinkSync} = require('fs')

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('LoadFile', function () {
  this.timeout(60000)

  describe('StandardMode', () => {
    it('parallel_upload: true', async () => {
      const {domain_id, drive_id} = Config['domains'][PATH_TYPE]

      let from = join(__dirname, `tmp/tmp-${domain_id}-upload.txt`)

      // mock 文件
      writeFileSync(from, '')
      // if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let client = await getClient(PATH_TYPE)

      // 上传
      var cp = await client.uploadFile(
        from,
        {
          drive_id,
          parent_file_id: 'root',
        },
        {
          ignore_rapid: true,
          parallel_upload: true,
          verbose: true, //显示详细日志

          onReady(task) {
            console.log('-------onReady')
          },
          onProgress(state, progress) {
            console.log(state, progress)
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      assert(cp.state == 'success')
      assert(cp.parent_file_id == 'root')
      assert(cp.drive_id == drive_id)
      assert(cp.loc_id == drive_id)
      assert(cp.loc_type == 'drive')

      // 上传 again
      var cp2 = await client.uploadFile(
        from,
        {
          drive_id,
          // parent_file_id: 'root'
        },
        {
          ignore_rapid: false,
          parallel_upload: true,
          verbose: true, //显示详细日志

          onReady(task) {
            console.log('-------onReady')
          },
          onProgress(state, progress) {
            console.log(state, progress)
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      assert(cp2.state == 'rapid_success')

      // 删除
      await client.postAPI('/file/delete', {drive_id, file_id: cp.file_key, permanently: true})
      await client.postAPI('/file/delete', {drive_id, file_id: cp2.file_key, permanently: true})
      // console.log(cp2)
    })

    it('parallel_upload: false, rapid', async () => {
      const {domain_id, drive_id} = Config['domains'][PATH_TYPE]

      let from = join(__dirname, 'tmp', `tmp-${domain_id}-upload-2.txt`)

      // writeFileSync(from, Math.random().toString(36).substring(2))
      // mock 文件
      execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      var client = await getClient(PATH_TYPE)

      console.log('---------------开始上传-----------------------')

      // 上传
      var cp = await client.uploadFile(
        from,
        {
          drive_id,
        },
        {
          ignore_rapid: true,
          parallel_upload: false,
          max_size_for_sha1: 5 * 1024 * 1024,

          verbose: true, //显示详细日志
          onStateChange(cp, state, err) {
            // rapid_success
            console.log('---------state', state, err)
          },
          onProgress(state, progress) {
            console.log('onProgress:', state, progress)
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )
      assert(cp.state == 'success')
      assert(cp.parent_file_id == 'root')
      assert(cp.drive_id == drive_id)
      assert(cp.loc_id == drive_id)
      assert(cp.loc_type == 'drive')

      console.log('---------------再次上传 -----------------------')

      // 上传
      var cp_1 = await client.uploadFile(
        from,
        {
          drive_id,
        },
        {
          parallel_upload: false,
          verbose: true, //显示详细日志
          min_size_for_pre_sha1: 4 * 1024 * 1024,

          onProgress(state, progress) {
            console.log('onProgress:', state, progress)
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )
      assert(cp_1.state == 'rapid_success')
      assert(cp_1.parent_file_id == 'root')
      assert(cp_1.drive_id == drive_id)
      assert(cp_1.loc_id == drive_id)
      assert(cp_1.loc_type == 'drive')

      console.log('---------------开始下载 -----------------------')

      let file_id = cp.file_key

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)
      let local_name = `tmp-${domain_id}-download-2.txt`
      var cp2 = await client.downloadFile(fileInfo, join(__dirname, 'tmp', local_name), {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        onProgress(state, progress) {
          console.log(state, progress)
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      })

      assert(cp2.state == 'success')
      assert(cp2.file_key == cp.file_key)
      assert(cp2.file_id == cp.file_id)
      assert(cp2.drive_id == drive_id)
      assert(cp2.loc_id == drive_id)
      assert(cp2.loc_type == 'drive')

      // console.log(cp2)
      console.log('---------------删除-----------------------', file_id)

      await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
    })

    it('empty', async () => {
      const {domain_id, drive_id} = Config['domains'][PATH_TYPE]

      let from = join(__dirname, 'tmp', `tmp-${domain_id}-upload-123.txt`)

      // mock 文件
      writeFileSync(from, '')

      var client = await getClient(PATH_TYPE)

      // 上传
      var cp = await client.uploadFile(
        from,
        {
          drive_id,
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

      assert(cp.state == 'rapid_success')

      let file_id = cp.file_key

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      assert(fileInfo.size == 0)

      let local_name = `tmp-${domain_id}-download-empty.txt`
      var cp2 = await client.downloadFile(fileInfo, join(__dirname, 'tmp', local_name), {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        onProgress(state, progress) {
          console.log(state, progress)
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      })

      assert(cp2.state == 'success')

      assert(statSync(join(__dirname, 'tmp', local_name)).size == 0)
    })
  })
})
