import {describe, expect, it, beforeEach, afterEach} from 'vitest'
import Config from './config/conf.js'
import {getClient} from './util/token-util'
import {generateFile, mockFile} from './util/file-util.js'
import {PDSError} from '../../lib/utils/PDSError.js'

describe('BaseUploader Error test', function () {
  let file_id
  const {domain_id, drive_id} = Config
  let client
  let task
  let cp

  describe('mockErrorBeforeCreate', () => {
    it('NotFound.UploadId', async () => {
      let name = `tmp-${domain_id}-std-web-base-up.txt`

      let file = await generateFile(name, 50 * 1024 * 1024, 'text/plain')

      client = await getClient()

      try {
        // 上传
        cp = await client.uploadFile(
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

              // mock error
              task.mockErrorBeforeCreate = () => {
                throw new PDSError('not found', 'NotFound.UploadId')
              }
            },
            onProgress(state, progress) {
              console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
            },
            onPartComplete(cp, partInfo) {
              console.log('onPartComplete:', partInfo.part_number, '---done-------')
            },
          },
        )

        // file_id = cp.file_key
        // await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
        expect(false).toBe('should throw')
      } catch (err) {
        expect(err.code).toBe('NotFound.UploadId')
      } finally {
        // restore
        task.mockErrorBeforeCreate = () => {}
      }

      // expect(['success', 'rapid_success']).toContain(cp.state)
      // expect(cp.parent_file_id).toBe('root')
      // expect(cp.drive_id).toBe(drive_id)
      // expect(cp.loc_id).toBe(drive_id)
      // expect(cp.loc_type).toBe('drive')
    })

    it('AlreadyExists', async () => {
      let name = `tmp-${domain_id}-std-web-base-up.txt`

      let file = await generateFile(name, 50 * 1024 * 1024, 'text/plain')

      client = await getClient()

      try {
        // 上传
        cp = await client.uploadFile(
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

              // mock error
              task.mockErrorBeforeCreate = () => {
                throw new Error('refuse')
              }
            },
            onProgress(state, progress) {
              console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
            },
            onPartComplete(cp, partInfo) {
              console.log('onPartComplete:', partInfo.part_number, '---done-------')
            },
          },
        )

        // file_id = cp.file_key
        // await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
        expect(false).toBe('should throw')
      } catch (err) {
        expect(err.code).toBe('AlreadyExists')
      } finally {
        // restore
        task.mockErrorBeforeCreate = () => {}
      }

      // expect(['success', 'rapid_success']).toContain(cp.state)
      // expect(cp.parent_file_id).toBe('root')
      // expect(cp.drive_id).toBe(drive_id)
      // expect(cp.loc_id).toBe(drive_id)
      // expect(cp.loc_type).toBe('drive')
    })

    it('AlreadyExists: skip', async () => {
      let name = `tmp-${domain_id}-std-web-base-up.txt`

      let file = await generateFile(name, 50 * 1024 * 1024, 'text/plain')

      client = await getClient()

      try {
        // 上传
        cp = await client.uploadFile(
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

              // mock error
              task.mockErrorBeforeCreate = () => {
                throw new Error('skip')
              }
            },
            onProgress(state, progress) {
              console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
            },
            onPartComplete(cp, partInfo) {
              console.log('onPartComplete:', partInfo.part_number, '---done-------')
            },
          },
        )

        // file_id = cp.file_key
        // await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
        expect(false).toBe('should throw')
      } catch (err) {
        expect(err.code).toBe('AlreadyExists')
      } finally {
        // restore
        task.mockErrorBeforeCreate = () => {}
      }

      // expect(['success', 'rapid_success']).toContain(cp.state)
      // expect(cp.parent_file_id).toBe('root')
      // expect(cp.drive_id).toBe(drive_id)
      // expect(cp.loc_id).toBe(drive_id)
      // expect(cp.loc_type).toBe('drive')
    })
  })
})
