/** @format */

import assert = require('assert')

const Config = require('./conf.js')
const {join, basename} = require('path')
const {execSync} = require('child_process')
const {existsSync, writeFileSync, statSync, unlinkSync} = require('fs')

const {getClient} = require('./token-util')

describe('LoadFile', function () {
  this.timeout(600000)

  describe('createTask', () => {
    it('uploadTask standard mode', async () => {
      const path_type = 'StandardMode'

      const {domain_id, drive_id} = Config['domains'][path_type]
      let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let client = await getClient(path_type)

      // 上传

      let state_arr = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: {
              name: basename(from),
              size: statSync(from).size,
              type: 'file',
              path: from,
            },
            loc_id: drive_id,
            loc_type: 'drive',
            path_type,
            parent_file_key: 'root',
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
            assert(uploadTask.state == 'waiting')

            uploadTask.start()
            assert(uploadTask.state == 'computing_hash')

            uploadTask.stop()

            // console.log('----after stop()', uploadTask.getCheckpoint())
            assert(uploadTask.state == 'stopped')

            uploadTask.cancel()
            assert(uploadTask.state == 'cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }

          // resolve({})
        })()
      })

      assert(state_arr.join(',') == 'start,computing_hash,stopped,cancelled')
    })

    it('uploadTask standard mode with new params', async () => {
      const path_type = 'StandardMode'
      const {domain_id, drive_id} = Config['domains'][path_type]
      let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let client = await getClient(path_type)

      // 上传

      let state_arr = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: {
              name: basename(from),
              size: statSync(from).size,
              type: 'file',
              path: from,
            },
            drive_id,
            path_type,
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
            assert(uploadTask.state == 'waiting')

            uploadTask.start()
            assert(uploadTask.state == 'computing_hash')

            uploadTask.stop()

            // console.log('----after stop()', uploadTask.getCheckpoint())
            assert(uploadTask.state == 'stopped')

            uploadTask.cancel()
            assert(uploadTask.state == 'cancelled')
            // resolve({})
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
      })

      assert(state_arr.join(',') == 'start,computing_hash,stopped,cancelled')
    })

    it('uploadTask hosting mode', async () => {
      const path_type = 'HostingMode'
      const {domain_id, drive_id} = Config['domains'][path_type]

      let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let client = await getClient(path_type)

      // 上传

      let state_arr = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: {
              name: basename(from),
              size: statSync(from).size,
              type: 'file',
              path: from,
            },
            loc_id: drive_id,
            loc_type: 'drive',
            path_type,
            parent_file_key: '/',
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
        ;(async function () {
          // uploadTask.stop()
          try {
            uploadTask.wait()
            assert(uploadTask.state == 'waiting')

            uploadTask.start()
            assert(uploadTask.state == 'start')

            uploadTask.stop()

            // console.log('----after stop()', uploadTask.getCheckpoint())
            assert(uploadTask.state == 'stopped')

            uploadTask.wait()
            assert(uploadTask.state == 'waiting')

            uploadTask.cancel()
            assert(uploadTask.state == 'cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
        // resolve({})
      })

      assert(state_arr.join(',') == 'start,stopped,waiting,cancelled')
    })

    it('uploadTask hosting mode with new params', async () => {
      const path_type = 'HostingMode'
      const {domain_id, drive_id} = Config['domains'][path_type]

      let from = join(__dirname, `tmp/tmp-${domain_id}-upload-task.txt`)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      let client = await getClient(path_type)

      // 上传

      let state_arr = []
      await new Promise((resolve, reject) => {
        let uploadTask = client.createUploadTask(
          {
            file: {
              name: basename(from),
              size: statSync(from).size,
              type: 'file',
              path: from,
            },
            drive_id,
            path_type,
            parent_file_key: '/',
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
        ;(async function () {
          // uploadTask.stop()

          try {
            uploadTask.wait()
            assert(uploadTask.state == 'waiting')

            uploadTask.start()
            assert(uploadTask.state == 'start')

            uploadTask.stop()

            // console.log('----after stop()', uploadTask.getCheckpoint())
            assert(uploadTask.state == 'stopped')

            uploadTask.wait()
            assert(uploadTask.state == 'waiting')

            uploadTask.cancel()
            assert(uploadTask.state == 'cancelled')
          } catch (e) {
            console.error('---err', e)
            reject(e)
          }
        })()
        // resolve({})
      })

      assert(state_arr.join(',') == 'start,stopped,waiting,cancelled')
    })

    it('download Task', async () => {
      const path_type = 'StandardMode'
      const {domain_id, drive_id} = Config['domains'][path_type]

      const filename = `tmp-${domain_id}-down-test-123-2.txt`
      let from = join(__dirname, 'tmp', `tmp-${domain_id}-down-test-123.txt`)
      let downTo = join(__dirname, 'tmp', filename)

      if (existsSync(downTo)) unlinkSync(downTo)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      var client = await getClient(path_type)

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

      assert(cp.state == 'success')

      let state_arr = []
      await new Promise((resolve, reject) => {
        let downTask = client.createDownloadTask(
          {
            // from
            loc_id: drive_id,
            loc_type: 'drive',
            path_type,
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
            assert(downTask.state == 'waiting')

            downTask.start()

            assert(downTask.state == 'start')

            downTask.stop()

            assert(downTask.state == 'stopped')

            downTask.wait()
            assert(downTask.state == 'waiting')

            downTask.cancel()
            assert(downTask.state == 'cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
        // resolve({})
      })

      assert(state_arr.join(',') == 'start,stopped,waiting,cancelled')
    })

    it('download Task with new params', async () => {
      const path_type = 'StandardMode'
      const {domain_id, drive_id} = Config['domains'][path_type]

      const filename = `tmp-${domain_id}-down-test-123-2.txt`
      let from = join(__dirname, 'tmp', `tmp-${domain_id}-down-test-123.txt`)
      let downTo = join(__dirname, 'tmp', filename)

      if (existsSync(downTo)) unlinkSync(downTo)

      // mock 文件
      if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=10000`)

      var client = await getClient(path_type)

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

      assert(cp.state == 'success')

      let state_arr = []
      await new Promise((resolve, reject) => {
        let downTask = client.createDownloadTask(
          {
            // from
            drive_id,
            path_type,
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
            assert(downTask.state == 'waiting')

            downTask.start()

            assert(downTask.state == 'start')

            downTask.stop()

            assert(downTask.state == 'stopped')

            downTask.wait()
            assert(downTask.state == 'waiting')

            downTask.cancel()
            assert(downTask.state == 'cancelled')
          } catch (e) {
            console.error(e)
            reject(e)
          }
        })()
        // resolve({})
      })

      assert(state_arr.join(',') == 'start,stopped,waiting,cancelled')
    })
  })
})
