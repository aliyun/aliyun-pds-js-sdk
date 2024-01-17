import {describe, expect, it, beforeEach, afterEach} from 'vitest'
import Config from './config/conf'
import {getClient} from './util/token-util'
import {generateFile, mockFile} from './util/file-util.js'

describe('WebDownloader Error test', function () {
  let file_id
  const {domain_id, drive_id} = Config
  let client
  let task
  let cp
  beforeEach(async () => {
    let name = `tmp-${domain_id}-std-web-up.txt`

    let file = await generateFile(name, 50 * 1024 * 1024, 'text/plain')

    client = await getClient()

    // 上传
    cp = await client.uploadFile(
      file,
      {
        drive_id,
        parent_file_id: 'root',
      },
      {
        // ignore_rapid: true,
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
    file_id = cp.file_key
    expect(['success', 'rapid_success']).toContain(cp.state)
    expect(cp.parent_file_id).toBe('root')
    expect(cp.drive_id).toBe(drive_id)
    expect(cp.loc_id).toBe(drive_id)
    expect(cp.loc_type).toBe('drive')
  })

  afterEach(async () => {
    // console.log(cp2)
    console.log('---------------删除-----------------------', file_id)
    await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
  })

  describe('downloadDirectlyUsingBrowser', () => {
    it('test downloadDirectlyUsingBrowser', async () => {
      console.log('---------------开始下载 -----------------------')

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      var cp2 = await client.downloadFile(fileInfo, '', {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        async onReady(t) {
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

      // 手动点击下载用浏览器下载
      task.downloadDirectlyUsingBrowser()
    })
  })
  describe('mockResponseError', () => {
    it('InsufficientBrowserCacheSpace', async () => {
      console.log('---------------开始下载 -----------------------')

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      try {
        var cp2 = await client.downloadFile(fileInfo, '', {
          max_chunk_size: 3 * 1024 * 1024,
          verbose: true, //显示详细日志
          onReady(t) {
            task = t

            setTimeout(() => {
              // mock error
              task.mockResponseError = () => {
                let err = new Error('Failed to fetch')
                err.name = 'TypeError'
                throw err
              }
            })
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        })
        expect(false).toBe('should throw')
      } catch (er) {
        console.error('er:', er)
        expect(er.code).toBe('InsufficientBrowserCacheSpace')
      } finally {
        // restore
        task.mockResponseError = a => a
      }
    })

    it('Network Error, retry', async () => {
      console.log('---------------开始下载 -----------------------')

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      var cp2 = await client.downloadFile(fileInfo, '', {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        async onReady(t) {
          task = t

          // mock error
          task.mockPushStreamError = () => {
            let err = new Error('Network Error')
            throw err
          }
          await new Promise(a => setTimeout(a, 3000))

          // restore
          task.mockResponseError = a => a
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
    })
  })

  describe('mockPushStreamError', () => {
    it('InsufficientBrowserCacheSpace', async () => {
      console.log('---------------开始下载 -----------------------')

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      try {
        var cp2 = await client.downloadFile(fileInfo, '', {
          max_chunk_size: 3 * 1024 * 1024,
          verbose: true, //显示详细日志
          onReady(t) {
            task = t

            // mock error
            task.mockPushStreamError = () => {
              let err = new Error(`Failed to execute 'enqueue' on 'ReadableStreamDefaultController'`)
              err.name = 'TypeError'
              throw err
            }
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        })
        expect(false).toBe('should throw')
      } catch (er) {
        console.error('er:', er)
        expect(er.code).toBe('InsufficientBrowserCacheSpace')
      } finally {
        // restore
        task.mockResponseError = a => a
      }
    })
    it('Network Error, retry', async () => {
      console.log('---------------开始下载 -----------------------')

      // 下载
      let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
      console.log(fileInfo)

      var cp2 = await client.downloadFile(fileInfo, '', {
        max_chunk_size: 3 * 1024 * 1024,
        verbose: true, //显示详细日志
        async onReady(t) {
          task = t

          // mock error
          task.mockPushStreamError = () => {
            let err = new Error('Network Error')
            throw err
          }
          await new Promise(a => setTimeout(a, 3000))

          // restore
          task.mockResponseError = a => a
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
    })
  })
})
