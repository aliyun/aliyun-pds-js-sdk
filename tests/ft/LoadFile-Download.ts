/** @format */

import assert = require('assert')
import {existsSync} from 'fs'

const Config = require('./conf.js')
const {join, basename} = require('path')
const {execSync} = require('child_process')
const {unlinkSync} = require('fs')

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('LoadFile-download', function () {
  this.timeout(600000)

  describe('Download', () => {
    it('stop test', async () => {
      const {domain_id, drive_id} = Config['domains'][PATH_TYPE]

      let from = join(__dirname, 'tmp', `tmp-${domain_id}-download-60MB.txt`)

      let local_name = `tmp-${domain_id}-download-60MB-2.txt`
      let to = join(__dirname, 'tmp', local_name)
      if (existsSync(to)) await unlinkSync(to)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=60000`)
      let task
      var client = await getClient(PATH_TYPE)

      console.log('---------------开始上传-----------------------')

      // 上传
      var cp = await client.uploadFile(
        from,
        {
          drive_id,
        },
        {
          ignore_rapid: false,
          parallel_upload: true,
          max_size_for_sha1: 5 * 1024 * 1024,
          process_calc_sha1_size: 1 * 1024 * 1024 * 1024, // 超过1GB 才用子进程 计算 sha1
          process_calc_crc64_size: 1 * 1024 * 1024 * 1024, // 超过1GB 才用子进程 计算 sha1
          verbose: true, //显示详细日志
          onReady(t) {
            task = t
          },
          onStateChange(cp, state, err) {
            // rapid_success
            console.log('---------state', state, err)
          },
          onProgress(state, progress) {
            console.log('onProgress:', state, progress, task.speed / 1024 / 1024 + 'M/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )
      assert(['success', 'rapid_success'].includes(cp.state))
      assert(cp.parent_file_id == 'root')
      assert(cp.drive_id == drive_id)
      assert(cp.loc_id == drive_id)
      assert(cp.loc_type == 'drive')

      console.log('--------------- 开始下载测试 -----------------------')

      let file_id = cp.file_key

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      let last_progress
      var cp2 = await client.downloadFile(fileInfo, to, {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        process_calc_crc64_size: 1 * 1024 * 1024 * 1024, // 超过1GB 才用子进程 计算 sha1
        onReady: t => (task = t),
        onProgress: async (state, progress) => {
          console.log(state, progress, task.speed / 1024 / 1024 + 'M/s')
          if (last_progress && progress - last_progress > 10) {
            last_progress = progress
            console.log('--stop---')
            task.stop()
            console.log('--sleep 2000ms---')
            await new Promise(a => setTimeout(a, 2000))
            console.log('--start---')
            task.start()
          }
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      })

      // console.log(JSON.stringify(cp2 ))

      assert(cp2.state == 'success')
      assert(cp2.file_key == cp.file_key)
      assert(cp2.file_id == cp.file_id)
      assert(cp2.drive_id == drive_id)
      assert(cp2.loc_id == drive_id)
      assert(cp2.loc_type == 'drive')

      assert(!cp2.part_info_list.some(n => n.running || n.done != true))
      assert(cp2.loaded === cp2.size)
      assert(cp2.progress === 100)

      // console.log(cp2)
      console.log('---------------删除-----------------------', file_id)

      await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
      // await unlinkSync(from)
      await unlinkSync(to)
    })
  })
})
