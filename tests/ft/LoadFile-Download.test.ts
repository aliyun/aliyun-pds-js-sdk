import {describe, expect, it} from 'vitest'

import Config from './config'

import {getClient} from './util/token-util'
import {generateFile, getDownloadLocalPath} from './util/file-util.js'

describe('LoadFile-upload-download', function () {
  describe('Download', () => {
    it('stop test', async () => {
      const {domain_id, drive_id} = Config

      let file_name = `tmp-${domain_id}-download-60MB.txt`
      let from = await generateFile(file_name, 1024 * 60000, 'text/plain')

      let local_name = `tmp-${domain_id}-download-60MB-2.txt`
      let to = await getDownloadLocalPath(local_name)

      let task
      var client = await getClient()

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
      expect(['success', 'rapid_success'].includes(cp.state || '')).toBe(true)
      expect(cp.parent_file_id).toBe('root')
      expect(cp.drive_id).toBe(drive_id)
      expect(cp.loc_id).toBe(drive_id)
      expect(cp.loc_type).toBe('drive')

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

      expect(cp2.state).toBe('success')
      expect(cp2.file_key).toBe(cp.file_key)
      expect(cp2.file_id).toBe(cp.file_id)
      expect(cp2.drive_id).toBe(drive_id)
      expect(cp2.loc_id).toBe(drive_id)
      expect(cp2.loc_type).toBe('drive')

      expect(!cp2.part_info_list?.some(n => n.running || n.done != true)).toBe(true)
      expect(cp2.loaded).toBe(cp2.size)
      expect(cp2.progress).toBe(100)

      // console.log(cp2)
      console.log('---------------删除-----------------------', file_id)

      await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
      // await unlinkSync(from)
      // await unlinkSync(to)
    })
  })
})
