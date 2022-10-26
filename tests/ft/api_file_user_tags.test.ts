/** @format */

const assert = require('assert')

import {ICreateFileRes} from '../../src'
import {delay} from '../../src/utils/HttpUtil'
import {PDSClient} from './index'
const Config = require('./conf.js')
const {join, basename} = require('path')
const {execSync} = require('child_process')
const {existsSync, writeFileSync, statSync, unlinkSync} = require('fs')

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('file user tags test', function () {
  this.timeout(60000)

  let drive_id: string
  let client: PDSClient
  let test_folder: ICreateFileRes
  let test_folder_name = 'test-user-tags-action'

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = client.token_info.default_drive_id
    test_folder = await client.createFolder({
      drive_id,
      parent_file_id: 'root',
      name: test_folder_name,
    })

    console.log('所有测试在此目录下进行：', test_folder)
  })

  this.afterAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = client.token_info.default_drive_id

    await client.deleteFile(
      {
        drive_id,
        file_id: test_folder.file_id,
      },
      true,
    )

    console.log('删除测试目录')
  })

  this.beforeEach(async () => {
    // 清空
    console.log('---------清空-------')
    let {items = []} = await client.listFiles({drive_id, parent_file_id: test_folder.file_id})
    await client.batchDeleteFiles(items, true)
  })

  it('uploadFile with userTags', async () => {
    const {domain_id, drive_id} = Config['domains'][PATH_TYPE]

    let from = join(__dirname, 'tmp', `tmp-${domain_id}-upload-tags-1MB.txt`)

    // mock 文件
    if (!existsSync(from)) execSync(`dd if=/dev/zero of=${from} bs=1024 count=1000`)

    var client = await getClient(PATH_TYPE)

    console.log('---------------开始上传-----------------------')
    let task
    // 上传
    var cp = await client.uploadFile(
      from,
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
    assert(cp.state == 'success')
    assert(cp.parent_file_id == 'root')
    assert(cp.drive_id == drive_id)
    assert(cp.loc_id == drive_id)
    assert(cp.loc_type == 'drive')

    console.log(cp)

    var info = await client.getFile({drive_id: cp.drive_id, file_id: cp.file_id})

    assert(Object.keys(info.user_tags).length == 1)
    assert(info.user_tags.hihi === 'xx')

    await client.putFileUserTags({
      drive_id: cp.drive_id,
      file_id: cp.file_id,
      user_tags: [
        {key: 'hihi', value: 'ooo'},
        {key: 'toto', value: 'vivi'},
      ],
    })

    var info2 = await client.getFile({drive_id: cp.drive_id, file_id: cp.file_id})

    assert(Object.keys(info2.user_tags).length == 2)

    assert(info2.user_tags.hihi === 'ooo')
    assert(info2.user_tags.toto === 'vivi')

    await client.deleteFileUserTags({drive_id: cp.drive_id, file_id: cp.file_id, key_list: ['hihi']})
    var info3 = await client.getFile({drive_id: cp.drive_id, file_id: cp.file_id})

    assert(Object.keys(info3.user_tags).length == 1)

    assert(info2.user_tags.toto === 'vivi')
  })

  it('create folder with user tags', async () => {
    var client = await getClient(PATH_TYPE)

    var folder1 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: '文件夹tag',
      user_tags: [{key: 'hio', value: 'ohi'}],
    })

    var info = await client.getFile({drive_id, file_id: folder1.file_id})
    console.log(info)
    assert(Object.keys(info.user_tags).length == 1)
    assert(info.user_tags.hio === 'ohi')
  })
})
