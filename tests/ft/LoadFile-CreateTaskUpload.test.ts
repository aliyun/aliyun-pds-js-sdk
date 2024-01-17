import {describe, expect, it} from 'vitest'
import {delay} from '../../lib/utils/HttpUtil'

import Config from './config/conf'

import {generateFile} from './util/file-util'
import {getClient} from './util/token-util'

describe('LoadFile upload state change', function () {
  describe('createTask', () => {
    it('uploadTask standard mode', async () => {
      const {domain_id, drive_id} = Config
      // let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // mock 文件
      let file_name = `tmp-${domain_id}-upload-task.txt`
      let file = await generateFile(file_name, 1024 * 10000, 'text/plain')
      // if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let client = await getClient()

      // 上传
      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file,
            loc_id: drive_id,
            loc_type: 'drive',

            parent_file_key: 'root',
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
      const {domain_id, drive_id} = Config
      // let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // // mock 文件
      // if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let file_name = `tmp-${domain_id}-upload-task.txt`
      let file = await generateFile(file_name, 1024 * 10000, 'text/plain')

      let client = await getClient()

      // 上传
      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: file,
            loc_id: drive_id,
            loc_type: 'drive',
            parent_file_key: 'root',
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

            await delay(3000)

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

    it('uploadTask standard mode with new params', async () => {
      const {domain_id, drive_id} = Config
      // let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // // mock 文件
      // if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let file_name = `tmp-${domain_id}-upload-task.txt`
      let file = await generateFile(file_name, 1024 * 10000, 'text/plain')

      let client = await getClient()

      // 上传

      let state_arr: string[] = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: file,
            drive_id,
            parent_file_id: 'root',
          },
          {
            parallel_upload: true,
            verbose: true, //显示详细日志
          },
        )

        uploadTask.on('statechange', (cp, state, error) => {
          console.log('-----------statechange', cp.state)
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
            // resolve({})
          } catch (e) {
            console.error(e)
            reject(e)
          }
          resolve({})
        })()
      })
      await delay(100)
      expect(state_arr.join(',')).toBe('start,computing_hash,stopped,cancelled')
    })
  })
})
