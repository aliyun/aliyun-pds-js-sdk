import {describe, expect, it} from 'vitest'
import Config from './config/conf'
import {getClient} from './util/token-util'
import {generateFile, mockFile} from './util/file-util.js'

describe('Web LoadFile', function () {
  describe('StandardMode', () => {
    it('parallel_upload: true', async () => {
      const {domain_id, drive_id} = Config

      let name = `tmp-${domain_id}-std-upload.txt`

      let file = await generateFile(name, 50 * 1024 * 1024, 'text/plain')

      let client = await getClient()
      let task
      // 上传
      var cp = await client.uploadFile(
        file,
        {
          drive_id,
          parent_file_id: 'root',
        },
        {
          ignore_rapid: true,
          parallel_upload: true,
          verbose: true, //显示详细日志

          onReady(t) {
            console.log('-------onReady1')
            task = t
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      expect(cp.state).toBe('success')
      expect(cp.parent_file_id).toBe('root')
      expect(cp.drive_id).toBe(drive_id)
      expect(cp.loc_id).toBe(drive_id)
      expect(cp.loc_type).toBe('drive')

      // 上传 again
      var cp2 = await client.uploadFile(
        file,
        {
          drive_id,
          // parent_file_id: 'root'
        },
        {
          ignore_rapid: false,
          parallel_upload: true,
          verbose: true, //显示详细日志

          onReady(t) {
            task = t
            console.log('-------onReady2')
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024, 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      expect(cp2.state).toBe('rapid_success')

      // 删除
      await client.postAPI('/file/delete', {drive_id, file_id: cp.file_key, permanently: true})
      await client.postAPI('/file/delete', {drive_id, file_id: cp2.file_key, permanently: true})
      // console.log(cp2)
    })

    it('parallel_upload: false, rapid', async () => {
      const {domain_id, drive_id} = Config

      let name = `tmp-${domain_id}-upload-50MB.txt`

      let file = await generateFile(name, 50 * 1024 * 1024, 'text/plain')

      var client = await getClient()

      console.log('---------------开始上传-----------------------')
      let task
      // 上传
      var cp = await client.uploadFile(
        file,
        {
          drive_id,
        },
        {
          ignore_rapid: true,
          parallel_upload: false,
          max_size_for_sha1: 5 * 1024 * 1024,

          verbose: true, //显示详细日志
          onReady(t) {
            task = t
          },
          onStateChange(cp, state, err) {
            // rapid_success
            console.log('---------state', state, err)
          },
          onProgress(state, progress) {
            console.log('onProgress:', state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )
      expect(cp.state).toBe('success')
      expect(cp.parent_file_id).toBe('root')
      expect(cp.drive_id).toBe(drive_id)
      expect(cp.loc_id).toBe(drive_id)
      expect(cp.loc_type).toBe('drive')

      console.log('---------------再次上传 -----------------------')

      // 上传
      var cp_1 = await client.uploadFile(
        file,
        {
          drive_id,
        },
        {
          parallel_upload: false,
          verbose: true, //显示详细日志
          min_size_for_pre_sha1: 4 * 1024 * 1024,
          onReady(t) {
            task = t
          },
          onProgress(state, progress) {
            console.log('onProgress:', state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )
      expect(cp_1.state).toBe('rapid_success')
      expect(cp_1.parent_file_id).toBe('root')
      expect(cp_1.drive_id).toBe(drive_id)
      expect(cp_1.loc_id).toBe(drive_id)
      expect(cp_1.loc_type).toBe('drive')

      console.log('---------------开始下载 -----------------------')

      let file_id = cp.file_key

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      var cp2 = await client.downloadFile(fileInfo, '', {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        onReady(t) {
          task = t
        },
        onProgress(state, progress) {
          console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      })

      expect(cp2.state).toBe('success')
      expect(cp2.file_key).toBe(cp.file_key)
      expect(cp2.file_id).toBe(cp.file_id)
      expect(cp2.drive_id).toBe(drive_id)
      expect(cp2.loc_id).toBe(drive_id)
      expect(cp2.loc_type).toBe('drive')

      // console.log(cp2)
      console.log('---------------删除-----------------------', file_id)

      await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
    })

    it('empty', async () => {
      const {domain_id, drive_id} = Config

      let file = await mockFile(`tmp-${domain_id}-upload-0.txt`, '', 'text/plain')

      let task
      var client = await getClient()

      // 上传
      var cp = await client.uploadFile(
        file,
        {
          drive_id,
        },
        {
          parallel_upload: false,
          verbose: true, //显示详细日志
          onReady(t) {
            task = t
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      expect(cp.state).toBe('rapid_success')

      let file_id = cp.file_key

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      expect(fileInfo.size).toBe(0)

      var cp2 = await client.downloadFile(fileInfo, '', {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        onReady(t) {
          task = t
        },
        onProgress(state, progress) {
          console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      })

      expect(cp2.state).toBe('success')
    })
  })
})
