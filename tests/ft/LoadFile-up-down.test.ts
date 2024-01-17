import {beforeAll, describe, expect, it} from 'vitest'
import Config from './config/conf'

import {getClient} from './util/token-util'
import {generateFile, getDownloadLocalPath} from './util/file-util'

describe('uploadFile & downloadFile', function () {
  const {domain_id, drive_id} = Config
  let client
  beforeAll(async () => {
    client = await getClient()
  })

  describe('uploadFile', () => {
    it('stop uploadFile', async () => {
      let fileName = `tmp-${domain_id}-upload-empty.txt`
      let file = await generateFile(fileName, 0, 'text/plain')

      let task

      try {
        // 上传
        await client.uploadFile(
          file,
          {
            drive_id,
          },
          {
            ignore_rapid: true,
            parallel_upload: false,
            verbose: true, //显示详细日志
            async onReady(t) {
              task = t

              await new Promise(a => setTimeout(a, 100))
              task.stop()
            },
          },
        )

        expect(1).toBe(2)
      } catch (e) {
        expect(e.code).toBe('stopped')
      }

      console.log(task)
      expect(task.state).toBe('stopped')
    })
    it('cancel uploadFile', async () => {
      let fileName = `tmp-${domain_id}-upload-empty.txt`
      let file = await generateFile(fileName, 0, 'text/plain')

      let task

      try {
        // 上传
        await client.uploadFile(
          file,
          {
            drive_id,
          },
          {
            ignore_rapid: true,
            parallel_upload: false,
            verbose: true, //显示详细日志
            async onReady(t) {
              task = t

              await new Promise(a => setTimeout(a, 100))
              task.cancel()
            },
          },
        )
        expect(1).toBe(2)
      } catch (e) {
        expect(e.code).toBe('cancelled')
      }
      expect(task.state).toBe('cancelled')
    })
  })

  describe('downloadFile', () => {
    let file_id
    beforeAll(async () => {
      let fileName = `tmp-${domain_id}-upload-50M.txt`
      let file = await generateFile(fileName, 50 * 1024 * 1024, 'text/plain')

      let task

      // 上传
      let cp = await client.uploadFile(
        file,
        {
          drive_id,
        },
        {
          parallel_upload: false,
          verbose: true, //显示详细日志
          async onReady(t) {
            task = t
          },
        },
      )
      file_id = cp.file_key
    })

    it('stop downloadFile', async () => {
      let task
      try {
        // 下载
        let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
        console.log(fileInfo)

        let download_to = await getDownloadLocalPath(`tmp-${domain_id}-50M.txt`)

        await client.downloadFile(fileInfo, download_to, {
          max_chunk_size: 3 * 1024 * 1024,
          verbose: true, //显示详细日志
          async onReady(t) {
            task = t

            await new Promise(a => setTimeout(a, 0))
            task.stop()
          },
        })
      } catch (e) {
        expect(e.code).toBe('stopped')
      }
      expect(task.state).toBe('stopped')
    })

    it('cancel downloadFile', async () => {
      let task
      try {
        // 下载
        let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
        console.log(fileInfo)

        let download_to = await getDownloadLocalPath(`tmp-${domain_id}-50M.txt`)

        await client.downloadFile(fileInfo, download_to, {
          max_chunk_size: 3 * 1024 * 1024,
          verbose: true, //显示详细日志
          async onReady(t) {
            task = t

            await new Promise(a => setTimeout(a, 0))
            task.cancel()
          },
        })
      } catch (e) {
        expect(e.code).toBe('cancelled')
      }
      expect(task.state).toBe('cancelled')
    })
  })
})
