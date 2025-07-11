import {describe, beforeAll, afterAll, expect, it} from 'vitest'

import Config from './config/conf'

import {generateFile} from './util/file-util'
import {getClient, getTestDrive, createTestFolder, delay} from './util/token-util'
import fs from 'fs'
import path from 'path'
import {IFile} from '../../lib/Types'

describe('LoadFile upload file, restore', function () {
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

    it('uploadTask,remove source file and restore', async () => {
      let file_name = `tmp-${domain_id}-upload-task-restore.txt`
      let file: IFile = await generateFile(file_name, 1024 * 50000, 'text/plain')

      let uploadTask = client.createUploadTask(
        {
          file: file,
          loc_id: drive_id,
          loc_type: 'drive',
          parent_file_id: parent_file_id,
        },
        {
          check_name_mode: 'refuse', // refuse
          ignore_rapid: true,
          parallel_upload: true,
          verbose: true, //显示详细日志
        },
      )

      await new Promise((resolve, reject) => {
        const fn = (cp, state, error) => {
          console.log('--------state', state)
          if (cp.state == 'created') {
            uploadTask.off('statechange', fn)
            uploadTask.stop()
            resolve({})
          }
        }
        uploadTask.on('statechange', fn)
        uploadTask.wait()
        expect(uploadTask.state).toBe('waiting')
        uploadTask.start()
      })

      expect(uploadTask.state).toBe('stopped')

      // rename
      const oldPath = file.path as string
      const newPath = oldPath.replace(file.name, 'bak-' + file.name)
      await fs.promises.rename(oldPath, newPath)

      const {error} = await new Promise<{error: Error}>((resolve, reject) => {
        const fn = (cp, state, error) => {
          if (cp.state == 'error') {
            uploadTask.off('statechange', fn)
            resolve({error})
          }
        }
        uploadTask.on('statechange', fn)
        uploadTask.wait()
        expect(uploadTask.state).toBe('waiting')

        uploadTask.start()
      })

      expect(error.message).toContain('no such file or directory')

      // "ENOENT: no such file or directory, open '/Users/zu/works/sdk/pds-js-sdk/tests/ft/tmp/tmp-rgclient1029-upload-task-restore.txt' [code: ClientError]"
      expect(uploadTask.message).toContain('no such file or directory')

      // start

      // restore
      await fs.promises.rename(newPath, oldPath)

      await new Promise((resolve, reject) => {
        const fn = (cp, state, error) => {
          if (cp.state == 'success') {
            uploadTask.off('statechange', fn)
            resolve({})
          } else if (cp.state == 'error') {
            reject(error)
          }
        }
        uploadTask.on('statechange', fn)
        // uploadTask.wait()
        // expect(uploadTask.state).toBe('waiting')

        uploadTask.start()
      })

      expect(uploadTask.state).toBe('success')
    })
  })
})
