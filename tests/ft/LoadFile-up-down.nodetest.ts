import {describe, beforeAll, afterAll, expect, it} from 'vitest'
import Config from './config/conf'
import {join} from 'path'
import {execSync} from 'child_process'
import {existsSync, writeFileSync, statSync, unlinkSync} from 'fs'

import {getClient, getTestDrive, createTestFolder} from './util/token-util'
import {generateFile} from './util/file-util'

describe('LoadFile', function () {
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
  it('parallel_upload: true', async () => {
    let fileName = `tmp-${domain_id}-std-upload.txt`
    let from = join(__dirname, `tmp`, fileName)

    // // mock 文件
    await generateFile(fileName, 50 * 1024 * 1024, 'text/plain')

    let task
    // 上传
    var cp = await client.uploadFile(
      from,
      {
        drive_id,
        parent_file_id,
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

    expect(cp.state).toBe('success')
    expect(cp.parent_file_id).toBe(parent_file_id)
    expect(cp.drive_id).toBe(drive_id)
    expect(cp.loc_id).toBe(drive_id)
    expect(cp.loc_type).toBe('drive')

    // 上传 again
    var cp2 = await client.uploadFile(
      from,
      {
        drive_id,
        parent_file_id,
      },
      {
        ignore_rapid: false,
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

    expect(cp2.state).toBe('rapid_success')

    // 删除
    await client.postAPI('/file/delete', {drive_id, file_id: cp.file_key, permanently: true})
    await client.postAPI('/file/delete', {drive_id, file_id: cp2.file_key, permanently: true})
    // console.log(cp2)
  })

  it('parallel_upload: false, rapid', async () => {
    let fileName = `tmp-${domain_id}-upload-50MB.txt`
    let from = join(__dirname, 'tmp', fileName)
    let local_name = `tmp-${domain_id}-50MB-2.txt`
    let to = join(__dirname, 'tmp', local_name)
    if (existsSync(to)) unlinkSync(to)

    // mock 文件
    await generateFile(fileName, 50 * 1024 * 1024, 'text/plain')

    console.log('---------------开始上传-----------------------')
    let task
    // 上传
    var cp = await client.uploadFile(
      from,
      {
        drive_id,
        parent_file_id,
      },
      {
        ignore_rapid: true,
        parallel_upload: false,
        max_size_for_sha1: 5 * 1024 * 1024,

        verbose: true, //显示详细日志
        onReady(t) {
          task = t
        },
        onStateChange(cp, state, err) {
          // rapid_success
          console.log('---------state', state, err)
        },
        onProgress(state, progress) {
          // console.log('onProgress:', state, progress, task.speed / 1024 / 1024 + 'MB/s')
        },
        onPartComplete(cp, partInfo) {
          // console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      },
    )
    expect(cp.state).toBe('success')
    expect(cp.parent_file_id).toBe(parent_file_id)
    expect(cp.drive_id).toBe(drive_id)
    expect(cp.loc_id).toBe(drive_id)
    expect(cp.loc_type).toBe('drive')

    console.log('---------------再次上传 -----------------------')

    // 上传
    var cp_1 = await client.uploadFile(
      from,
      {
        drive_id,
        parent_file_id,
      },
      {
        ignore_rapid: false,
        parallel_upload: false,
        verbose: true, //显示详细日志
        min_size_for_pre_hash: 4 * 1024 * 1024,
        onReady(t) {
          task = t
        },
        onProgress(state, progress) {
          // console.log('onProgress:', state, progress, task.speed / 1024 / 1024 + 'MB/s')
        },
        onPartComplete(cp, partInfo) {
          // console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      },
    )
    expect(cp_1.state).toBe('rapid_success')
    expect(cp_1.parent_file_id).toBe(parent_file_id)
    expect(cp_1.drive_id).toBe(drive_id)
    expect(cp_1.loc_id).toBe(drive_id)
    expect(cp_1.loc_type).toBe('drive')

    console.log('---------------开始下载 -----------------------')

    let file_id = cp.file_key

    // 下载
    let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
    console.log('---fileInfo:', fileInfo)

    var cp2 = await client.downloadFile(fileInfo, to, {
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
    })

    expect(cp2.state).toBe('success')
    expect(cp2.file_key).toBe(cp.file_key)
    expect(cp2.file_id).toBe(cp.file_id)
    expect(cp2.drive_id).toBe(drive_id)
    expect(cp2.loc_id).toBe(drive_id)
    expect(cp2.loc_type).toBe('drive')

    // console.log(cp2)
    console.log('---------------删除-----------------------', file_id)

    await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})

    if (existsSync(to)) unlinkSync(to)
  })

  it('empty', async () => {
    let from = join(__dirname, 'tmp', `tmp-${domain_id}-upload-0.txt`)
    let task
    // mock 文件
    writeFileSync(from, '')

    // 上传
    var cp = await client.uploadFile(
      from,
      {
        drive_id,
        parent_file_id,
      },
      {
        parallel_upload: false,
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

    expect(cp.state).toBe('rapid_success')

    let file_id = cp.file_key

    // 下载
    let fileInfo = await client.postAPI('/file/get', {drive_id, file_id})
    console.log(fileInfo)

    expect(fileInfo.size).toBe(0)

    let local_name = `tmp-${domain_id}-download-0.txt`
    var cp2 = await client.downloadFile(fileInfo, join(__dirname, 'tmp', local_name), {
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
    })

    expect(cp2.state).toBe('success')

    expect(statSync(join(__dirname, 'tmp', local_name)).size == 0).toBe(true)

    console.log('---------------删除-----------------------', file_id)

    await client.postAPI('/file/delete', {drive_id, file_id, permanently: true})
  })
})
