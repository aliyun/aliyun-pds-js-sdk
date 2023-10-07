import {describe, expect, it} from 'vitest'
import Config from './config/conf.js'
import {join} from 'path'
import {execSync} from 'child_process'
import {existsSync, writeFileSync, statSync, unlinkSync} from 'fs'

import {getClient} from './util/token-util'

describe('LoadFile', function () {
  describe('StandardMode', () => {
    it('parallel_upload: true', async () => {
      const {domain_id, drive_id} = Config

      let from = join(__dirname, `tmp/tmp-${domain_id}-std-upload.txt`)

      // // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=50000`)

      let client = await getClient()
      let task
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
        from,
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

      let from = join(__dirname, 'tmp', `tmp-${domain_id}-upload-50MB.txt`)
      let local_name = `tmp-${domain_id}-50MB-2.txt`
      let to = join(__dirname, 'tmp', local_name)
      if (existsSync(to)) unlinkSync(to)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=50000`)

      var client = await getClient()

      console.log('---------------开始上传-----------------------')
      let task
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
        from,
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

      var cp2 = await client.downloadFile(fileInfo, to, {
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

      if (existsSync(to)) unlinkSync(to)
    })

    it('empty', async () => {
      const {domain_id, drive_id} = Config

      let from = join(__dirname, 'tmp', `tmp-${domain_id}-upload-0.txt`)
      let task
      // mock 文件
      writeFileSync(from, '')

      var client = await getClient()

      // 上传
      var cp = await client.uploadFile(
        from,
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

      let local_name = `tmp-${domain_id}-download-0.txt`
      var cp2 = await client.downloadFile(fileInfo, join(__dirname, 'tmp', local_name), {
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

      expect(statSync(join(__dirname, 'tmp', local_name)).size == 0).toBe(true)
    })
  })
})
