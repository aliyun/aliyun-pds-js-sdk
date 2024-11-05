import {describe, beforeAll, afterAll, expect, it} from 'vitest'

import Config from './config/conf'

import {getClient, getTestDrive, createTestFolder, delay} from './util/token-util'
import {generateFile} from './util/file-util'

describe('LoadFile download state change', function () {
  const {domain_id} = Config

  let drive_id: string
  let client
  let test_folder

  let parent_file_id

  beforeAll(async () => {
    client = await getClient()

    // 创建个新的
    const newDrive = await getTestDrive(client)

    drive_id = newDrive.drive_id

    test_folder = await createTestFolder(client, {
      drive_id,
      parent_file_id: 'root',
      name: `test-file-${Math.random().toString(36).substring(2)}`,
    })
    parent_file_id = test_folder.file_id

    console.log('所有测试在此目录下进行：', test_folder)
  })
  afterAll(async () => {
    console.log('删除测试目录')

    await client.deleteFile(
      {
        drive_id,
        file_id: test_folder.file_id,
      },
      true,
    )
  })

  describe('createTask', () => {
    it('download Task', async () => {
      const fromName = `tmp-${domain_id}-down-test-123.txt`
      const filename = `tmp-${domain_id}-down-test-123-2.txt`

      let downTo = ''

      // mock 文件
      let file = await generateFile(fromName, 10 * 1024 * 1024, 'text/plain')

      // 上传
      var cp = await client.uploadFile(
        file,
        {
          drive_id,
        },
        {
          ignore_rapid: true,
          parallel_upload: false,
        },
      )

      expect(cp.state).toBe('success')

      await delay(100)

      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let downTask = client.createDownloadTask(
          {
            // from
            loc_id: drive_id,
            loc_type: 'drive',
            file_key: cp.file_key,

            // to
            file: {
              name: filename,
              path: downTo,
              size: cp.file.size,
            },
          },
          {
            verbose: true, //显示详细日志
          },
        )

        downTask.on('statechange', (cp, state, error) => {
          console.log('-----------statechange', cp.state)
          state_arr.push(cp.state)

          if (cp.state == 'cancelled') resolve({})
        })
        downTask.on('progress', (state, progress) => {
          console.log('download progress: ', state, progress)
        })
        downTask.on('partialcomplete', (cp, partInfo) => {
          console.log('onPartComplete:', partInfo.part_number)
        })
        ;(async function () {
          // downTask.start()
          try {
            downTask.wait()
            expect(downTask.state).toBe('waiting')

            downTask.start()
            expect(downTask.state).toBe('prepare')

            downTask.stop()
            expect(downTask.state).toBe('stopped')

            downTask.wait()
            expect(downTask.state).toBe('waiting')

            downTask.cancel()
            expect(downTask.state).toBe('cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
      })
      await delay(100)

      expect(state_arr.join(',')).toBe('start,prepare,stopped,waiting,cancelled')
    })

    it('download Task with new params', async () => {
      const fromName = `tmp-${domain_id}-down-test-123.txt`
      const filename = `tmp-${domain_id}-down-test-123-2.txt`

      let downTo = ''

      let file = await generateFile(fromName, 50 * 1024 * 1024, 'text/plain')

      // 上传
      var cp = await client.uploadFile(
        file,
        {
          drive_id,
        },
        {
          ignore_rapid: true,
          parallel_upload: true,
        },
      )

      expect(cp.state).toBe('success')

      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let downTask = client.createDownloadTask(
          {
            // from
            drive_id,
            file_id: cp.file_id,

            // to
            file: {
              name: filename,
              path: downTo,
              size: cp.file.size,
            },
          },
          {
            verbose: true, //显示详细日志
          },
        )

        downTask.on('statechange', (cp, state, error) => {
          console.log('-----------statechange', cp.state)
          state_arr.push(cp.state)

          if (cp.state == 'cancelled') resolve({})
        })
        downTask.on('progress', (state, progress) => {
          console.log('download progress: ', state, progress)
        })
        downTask.on('partialcomplete', (cp, partInfo) => {
          console.log('onPartComplete:', partInfo.part_number)
        })
        ;(async function () {
          // downTask.start()
          try {
            downTask.wait()
            expect(downTask.state).toBe('waiting')
            downTask.start()

            expect(downTask.state).toBe('prepare')
            downTask.stop()

            expect(downTask.state).toBe('stopped')

            downTask.wait()
            expect(downTask.state).toBe('waiting')

            downTask.cancel()
            expect(downTask.state).toBe('cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
      })
      await delay(100)

      expect(state_arr.join(',')).toBe('start,prepare,stopped,waiting,cancelled')
    })
  })
})
