import {describe, expect, it} from 'vitest'
import {delay} from '../../lib/utils/HttpUtil'

import Config from './config/conf.js'

import {join} from 'path'
import {execSync} from 'child_process'
import {existsSync, unlinkSync} from 'fs'

import {getClient} from './util/token-util'

describe('LoadFile download state change', function () {
  describe('createTask', () => {
    it('download Task', async () => {
      const {domain_id, drive_id} = Config

      const fromName = `tmp-${domain_id}-down-test-123.txt`
      const filename = `tmp-${domain_id}-down-test-123-2.txt`
      let from = join(__dirname, 'tmp', fromName)
      let downTo = join(__dirname, 'tmp', filename)

      if (existsSync(downTo)) unlinkSync(downTo)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      var client = await getClient()

      // 上传
      var cp = await client.uploadFile(
        from,
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
            expect(downTask.state).toBe('start')

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

      expect(state_arr.join(',')).toBe('start,stopped,waiting,cancelled')
    })

    it('download Task with new params', async () => {
      const {domain_id, drive_id} = Config

      const fromName = `tmp-${domain_id}-down-test-123.txt`
      const filename = `tmp-${domain_id}-down-test-123-2.txt`
      let from = join(__dirname, 'tmp', fromName)
      let downTo = join(__dirname, 'tmp', filename)

      if (existsSync(downTo)) unlinkSync(downTo)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=50000`)

      var client = await getClient()

      // 上传
      var cp = await client.uploadFile(
        from,
        {
          drive_id,
        },
        {
          ignore_rapid: true,
          parallel_upload: false,
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

            expect(downTask.state).toBe('start')
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

      expect(state_arr.join(',')).toBe('start,stopped,waiting,cancelled')
    })
  })
})
