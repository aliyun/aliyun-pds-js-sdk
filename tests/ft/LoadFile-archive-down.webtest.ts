import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import Config from './config/conf'
import {getClient, getTestDrive, createTestFolder, delay} from './util/token-util'
import {generateFile, mockFile} from './util/file-util.js'

describe('Web LoadFile', function () {
  let drive_id: string
  let client
  let test_folder

  let parent_file_id
  const {domain_id} = Config
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

  describe('StandardMode', () => {
    var cp, cp2
    beforeAll(async () => {
      let name = `tmp-${domain_id}-archive-1M.txt`
      let file = await generateFile(name, 1 * 1024 * 1024, 'text/plain')
      let name2 = `tmp-${domain_id}-archive2-2M.txt`
      let file2 = await generateFile(name2, 2 * 1024 * 1024, 'text/plain')

      let task
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
          },
          onProgress(state, progress) {
            console.log(state, progress, task.speed / 1024 / 1024 + 'MB/s')
          },
          onPartComplete(cp, partInfo) {
            console.log('onPartComplete:', partInfo.part_number, '---done-------')
          },
        },
      )

      // expect(cp.state).toBe('success')
      // expect(cp.parent_file_id).toBe('root')
      // expect(cp.drive_id).toBe(drive_id)
      // expect(cp.loc_id).toBe(drive_id)
      // expect(cp.loc_type).toBe('drive')

      // 上传
      cp2 = await client.uploadFile(
        file2,
        {
          drive_id,
          // parent_file_id: 'root'
        },
        {
          ignore_rapid: true,
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
      // expect(cp2.state).toBe('success')
      // expect(cp2.parent_file_id).toBe('root')
      // expect(cp2.drive_id).toBe(drive_id)
      // expect(cp2.loc_id).toBe(drive_id)
      // expect(cp2.loc_type).toBe('drive')
    })

    afterAll(async () => {
      // 删除
      await client.postAPI('/file/delete', {drive_id, file_id: cp.file_key, permanently: true})
      await client.postAPI('/file/delete', {drive_id, file_id: cp2.file_key, permanently: true})
      // console.log(cp2)
    })
    it('archive file', async () => {
      var task
      var cp3 = await client.downloadFile(
        {
          drive_id,
          archive_file_ids: [cp.file_id, cp2.file_id],
          file: {
            name: cp.file.name + '等.zip',
          },
        },
        '',
        {
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
        },
      )
      expect(cp3.state).toBe('success')
      expect(cp3.drive_id).toBe(drive_id)
      expect(cp3.loc_id).toBe(drive_id)
      expect(cp3.loc_type).toBe('drive')
    })

    it('archive file stop and continue', async () => {
      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let downTask = client.createDownloadTask(
          {
            drive_id,
            archive_file_ids: [cp.file_id, cp2.file_id],
            file: {
              name: cp.file.name + '等.zip',
            },
          },
          {
            verbose: true, //显示详细日志
          },
        )

        downTask.on('statechange', (cp, state, error) => {
          console.log('-----------statechange', cp.state, error)
          state_arr.push(cp.state)

          if (cp.state == 'success') resolve({})
          else if (cp.state == 'error') reject(error)
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

            await delay(600)
            downTask.start()
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
      })
      await delay(100)

      console.log(state_arr.join(','))
      expect(state_arr.join(',')).toBe('start,prepare,stopped,start,prepare,created,running,checking,complete,success')
    })
    it('archive file stop & cancel', async () => {
      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let downTask = client.createDownloadTask(
          {
            drive_id,
            archive_file_ids: [cp.file_id, cp2.file_id],
            file: {
              name: cp.file.name + '等.zip',
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
