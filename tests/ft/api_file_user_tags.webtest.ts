import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'
import {ICreateFileRes} from '../../lib/index'
import {createTestFolder, getClient} from './util/token-util'
import {generateFile} from './util/file-util'

import Config from './config'

describe('file user tags test', function () {
  let drive_id: string
  let client
  let test_folder: ICreateFileRes
  let test_folder_name = 'test-user-tags-action'

  beforeAll(async () => {
    client = await getClient()
    drive_id = client.token_info?.default_drive_id || ''
    test_folder = await createTestFolder(client, {
      drive_id,
      parent_file_id: 'root',
      name: test_folder_name,
    })

    console.log('所有测试在此目录下进行：', test_folder)
  })

  afterAll(async () => {
    client = await getClient()
    drive_id = client.token_info?.default_drive_id || ''

    await client.deleteFile(
      {
        drive_id,
        file_id: test_folder.file_id,
      },
      true,
    )

    console.log('删除测试目录')
  })

  beforeEach(async () => {
    // 清空
    console.log('---------清空-------')
    let {items = []} = await client.listFiles({drive_id, parent_file_id: test_folder.file_id || ''})
    await client.batchDeleteFiles(items, true)
  })

  it('uploadFile with userTags', async () => {
    const {domain_id, drive_id} = Config

    let fname = `tmp-${domain_id}-upload-tags-1MB.txt`

    var client = await getClient()

    console.log('---------------开始上传-----------------------')
    let task

    let f = await generateFile(fname, 1024 * 1000, 'text/plain')

    // 上传
    var cp = await client.uploadFile(
      f,
      {
        drive_id,
      },
      {
        user_tags: [{key: 'hihi', value: 'xx'}],
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
          console.log('onProgress:', state, progress, task.speed / 1024 / 1024 + 'MB/s')
        },
        onPartComplete(cp, partInfo) {
          console.log('onPartComplete:', partInfo.part_number, '---done-------')
        },
      },
    )
    expect(cp.state).toBe('success')
    expect(cp.parent_file_id).toBe('root')
    expect(cp.drive_id).toBe(drive_id)
    expect(cp.loc_id).toBe(drive_id)
    expect(cp.loc_type).toBe('drive')

    console.log(cp)

    var info = await client.getFile({drive_id: cp.drive_id, file_id: cp.file_id})

    expect(Object.keys(info.user_tags).length).toBe(1)
    expect(info.user_tags.hihi).toBe('xx')

    await client.putFileUserTags({
      drive_id: cp.drive_id,
      file_id: cp.file_id,
      user_tags: [
        {key: 'hihi', value: 'ooo'},
        {key: 'toto', value: 'vivi'},
      ],
    })

    var info2 = await client.getFile({drive_id: cp.drive_id, file_id: cp.file_id})

    expect(Object.keys(info2.user_tags).length).toBe(2)

    expect(info2.user_tags.hihi).toBe('ooo')
    expect(info2.user_tags.toto).toBe('vivi')

    await client.deleteFileUserTags({drive_id: cp.drive_id, file_id: cp.file_id, key_list: ['hihi']})
    var info3 = await client.getFile({drive_id: cp.drive_id, file_id: cp.file_id})

    expect(Object.keys(info3.user_tags).length).toBe(1)

    expect(info2.user_tags.toto).toBe('vivi')
  })

  it('create folder with user tags', async () => {
    var client = await getClient()

    var folder1 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: '文件夹tag',
      user_tags: [{key: 'hio', value: 'ohi'}],
    })

    var info = await client.getFile({drive_id, file_id: folder1.file_id})
    console.log(info)
    expect(Object.keys(info.user_tags).length).toBe(1)
    expect(info.user_tags.hio).toBe('ohi')
  })
})
