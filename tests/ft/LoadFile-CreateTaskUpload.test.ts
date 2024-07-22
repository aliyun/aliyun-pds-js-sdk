import {describe, beforeAll, afterAll, expect, it} from 'vitest'

import Config from './config/conf'

import {generateFile} from './util/file-util'
import {getClient, getTestDrive, createTestFolder, delay} from './util/token-util'

describe('LoadFile upload state change', function () {
  describe('createTask', () => {
    let drive_id: string
    let client

    let parent_file_id
    const {domain_id} = Config
    beforeAll(async () => {
      client = await getClient()

      // 创建个新的
      const newDrive = await getTestDrive(client)

      drive_id = newDrive.drive_id

      let test_folder = await createTestFolder(client, {
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
          file_id: parent_file_id,
        },
        true,
      )
    })

    it('uploadTask standard mode', async () => {
      // mock 文件
      let file_name = `tmp-${domain_id}-upload-task.txt`
      let file = await generateFile(file_name, 1024 * 10000, 'text/plain')

      // 上传
      console.log('=========上传', file_name)
      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file,
            loc_id: drive_id,
            loc_type: 'drive',
            parent_file_id: parent_file_id,
          },
          {
            parallel_upload: true,
            verbose: true, //显示详细日志
          },
        )

        uploadTask.on('statechange', (cp, state, error) => {
          state_arr.push(cp.state)

          if (cp.state == 'cancelled') resolve({})
        })
        uploadTask.on('progress', (state, progress) => {
          console.log(state, progress)
        })
        uploadTask.on('partialcomplete', (cp, partInfo) => {
          console.log('onPartComplete:', partInfo.part_number)
        })
        ;(async () => {
          try {
            uploadTask.wait()
            expect(uploadTask.state).toBe('waiting')

            uploadTask.start()
            expect(uploadTask.state).toBe('computing_hash')

            uploadTask.stop()

            // console.log('----after stop()', uploadTask.getCheckpoint())
            expect(uploadTask.state).toBe('stopped')

            uploadTask.cancel()
            expect(uploadTask.state).toBe('cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
      })

      await delay(100)
      expect(state_arr.join(',')).toBe('start,computing_hash,stopped,cancelled')
    })

    it('uploadTask same name refuse', async () => {
      let file_name = `tmp-${domain_id}-upload-task.txt`
      let file = await generateFile(file_name, 1024 * 10000, 'text/plain')

      // upload
      await client.uploadFile(file, {
        drive_id,
        parent_file_id,
      })

      await delay(2000)

      // 上传 again
      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: file,
            loc_id: drive_id,
            loc_type: 'drive',
            parent_file_id: parent_file_id,
          },
          {
            check_name_mode: 'refuse', // refuse

            parallel_upload: true,
            verbose: true, //显示详细日志
          },
        )

        uploadTask.on('statechange', (cp, state, error) => {
          state_arr.push(cp.state)

          if (cp.state == 'cancelled') resolve({})
          if (cp.state == 'error') resolve({})
        })
        uploadTask.on('progress', (state, progress) => {
          console.log(state, progress)
        })
        uploadTask.on('partialcomplete', (cp, partInfo) => {
          console.log('onPartComplete:', partInfo.part_number)
        })
        ;(async () => {
          try {
            uploadTask.wait()
            expect(uploadTask.state).toBe('waiting')

            uploadTask.start()
            expect(uploadTask.state).toBe('computing_hash')

            await delay(6000)

            expect(uploadTask.state).toBe('error')
            expect(uploadTask.message.includes('A file with the same name already exists'))
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
      })

      await delay(100)
      expect(state_arr.join(',')).toBe('start,computing_hash,error')
    })

    // it('uploadTask standard mode with new params', async () => {
    //   // let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)
    //   await delay(2000)

    //   // // mock 文件
    //   // if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

    //   let file_name = `tmp-${domain_id}-upload-task.txt`
    //   let file = await generateFile(file_name, 1024 * 10000, 'text/plain')

    //   // 上传

    //   let state_arr: string[] = []
    //   await new Promise((resolve, reject) => {
    //     let uploadTask = client.createUploadTask(
    //       {
    //         file: file,
    //         drive_id,
    //         parent_file_id,
    //       },
    //       {
    //         parallel_upload: true,
    //         verbose: true, //显示详细日志
    //       },
    //     )

    //     uploadTask.on('statechange', (cp, state, error) => {
    //       console.log('-----------statechange', cp.state)
    //       state_arr.push(cp.state)

    //       if (cp.state == 'cancelled') resolve({})
    //     })
    //     uploadTask.on('progress', (state, progress) => {
    //       console.log(state, progress)
    //     })
    //     uploadTask.on('partialcomplete', (cp, partInfo) => {
    //       console.log('onPartComplete:', partInfo.part_number)
    //     })
    //     ;(async () => {
    //       try {
    //         uploadTask.wait()
    //         expect(uploadTask.state).toBe('waiting')

    //         uploadTask.start()
    //         expect(uploadTask.state).toBe('computing_hash')

    //         uploadTask.stop()

    //         // console.log('----after stop()', uploadTask.getCheckpoint())
    //         expect(uploadTask.state).toBe('stopped')

    //         uploadTask.cancel()
    //         expect(uploadTask.state).toBe('cancelled')
    //         // resolve({})
    //       } catch (e) {
    //         console.error(e)
    //         reject(e)
    //       }
    //       resolve({})
    //     })()
    //   })
    //   await delay(100)
    //   expect(state_arr.join(',')).toBe('start,computing_hash,stopped,cancelled')
    // })
  })
})
