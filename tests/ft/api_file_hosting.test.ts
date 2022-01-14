/** @format */

const assert = require('assert')

import {ICreateFileRes} from '../../src'
import {delay} from '../../src/utils/HttpUtil'
import {PDSClient} from './index'

const {getClient} = require('./token-util')

const PATH_TYPE = 'HostingMode'

describe('HostingFileAPI', function () {
  this.timeout(60000)
  let drive_id: string
  let client: PDSClient
  let test_folder: ICreateFileRes

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = client.token_info.default_drive_id

    test_folder = await client.createFolder({
      drive_id,
      parent_file_path: '/',
      name: 'test-file-action',
    })

    console.log('所有测试在此目录下进行：', test_folder)
  })

  this.afterAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = client.token_info.default_drive_id

    test_folder = await client.deleteFile(
      {
        drive_id,
        file_path: test_folder.file_path,
      },
      true,
    )

    console.log('删除测试目录')
  })

  this.beforeEach(async () => {
    // 清空
    console.log('---------清空-------')
    let {items = []} = await client.listFiles({drive_id, parent_file_path: test_folder.file_path})
    await client.batchDeleteFiles(items, true)
  })

  it('fileActions', async () => {
    // 创建两个文件夹
    // console.log('-------创建两个文件夹')

    const folder1 = await client.createFolder({
      drive_id,
      parent_file_path: test_folder.file_path,
      name: 'folder1',
    })
    assert.ok(folder1.type, 'folder')

    const folder2 = await client.createFolder({
      drive_id,
      parent_file_path: test_folder.file_path,
      name: 'folder2',
    })

    // 更新文件 重命名
    // console.log('-------重命名')
    const folder3 = await client.renameFile(
      {
        drive_id,
        file_path: folder2.file_path,
      },
      'folder3',
    )

    // 将第一个移动到第二个里面
    // console.log('-------将第一个移动到第二个里面')

    await client.moveFiles([folder1], {
      to_parent_file_path: folder3.file_path,
      onProgress: () => {},
    })

    // 对 folder2 进行复制 复制到同层级
    await client.copyFiles([folder3], {
      to_parent_file_path: test_folder.file_path,
      new_name: 'folder4',
      onProgress: () => {},
    })

    // 获取所有文件
    // console.log('------获取所有文件')

    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_path: test_folder.file_path,
    })
    // console.log(items)
    assert(items.length === 2)

    assert(
      items
        .map(n => n.name)
        .sort()
        .join(',') == 'folder3,folder4',
    )

    // console.log('==================', items)

    // 删除
    // console.log('----------------删除')
    for (const c of items) {
      await client.batchDeleteFiles(
        [
          {
            drive_id,
            file_path: c.file_path,
          },
        ],
        true,
      )
    }

    // 获取
    // console.log('----------------获取')

    const {items: listItem = []} = await client.listFiles({
      drive_id,
      parent_file_path: test_folder.file_path,
    })

    // 删除
    // console.log('----------------删除')

    await client.batchDeleteFiles(listItem, true)

    await delay(2000)
    // 获取
    // console.log('----------------获取')
    const {items: listItem2 = []} = await client.listFiles({
      drive_id,
      parent_file_path: test_folder.file_path,
    })

    assert(listItem2.length === 0)
  })

  it('folder', async () => {
    const folderRes = await client.createFolder({
      drive_id,
      parent_file_path: '/',
      name: 'folder-01',
    })

    // 情况1 移动空文件
    await client.moveFiles([], {
      to_parent_file_path: folderRes.file_path,
      onProgress: () => {},
    })

    // 情况2 移动到同一目录下
    await client.moveFiles([folderRes], {
      to_parent_file_path: '/',
      to_drive_id: drive_id,
      onProgress: () => {},
    })

    // 创建目录
    const mu = await client.createFolders(
      ['a', 'b', 'c'],
      {
        drive_id,
        parent_file_path: folderRes.file_path,
      },
      {
        onFolderRepeat: () => true,
        onFolderCreated: folderKey => {
          console.log('onFolderCreated:', folderKey)
        },
      },
    )
    assert(typeof mu === 'string')

    // 再次创建同名目录, 托管模式不会报错

    await client.createFolders(
      ['a', 'b', 'c'],
      {
        drive_id,
        parent_file_path: folderRes.file_path,
      },
      {
        onFolderRepeat: () => false,
        onFolderCreated: folderKey => {
          console.log('onFolderCreated:', folderKey)
        },
      },
    )

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_path: test_folder.file_path,
    })
    await client.batchDeleteFiles(items, true)
  })

  it('file', async () => {
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_path: test_folder.file_path,
      type: 'file',
      name: '文件01',
    })

    // 根据文件id获取文件信息
    const fileList = await client.getFile({
      drive_id,
      file_path: fileRes.file_path,
    })
    assert(fileList.file_path === fileRes.file_path)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_path: test_folder.file_path,
    })
    await client.batchDeleteFiles(items, true)
  })

  it('batchOssPath', async () => {
    const folderRes1 = await client.createFolder({
      drive_id,
      parent_file_path: test_folder.file_path,
      name: '文件夹01',
    })
    const folderRes2 = await client.createFolder({
      drive_id,
      parent_file_path: test_folder.file_path,
      name: '文件夹02',
    })
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_path: test_folder.file_path,
      type: 'file',
      name: '文本文档.txt',
    })

    const copyRes1 = await client.copyFiles([fileRes], {
      to_parent_file_path: folderRes1.file_path,
      to_drive_id: drive_id,
      onProgress: () => {},
    })
    assert.ok(copyRes1.length == 1)

    const copyRes2 = await client.copyFiles([fileRes], {
      to_parent_file_path: folderRes1.file_path,
      to_drive_id: drive_id,
      onProgress: () => {},
    })

    assert.ok(copyRes2.length == 1)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_path: test_folder.file_path,
    })
    await client.batchDeleteFiles(items, true)
  })

  it('file content', async () => {
    const fileRes = await client.saveFileContent(
      {
        drive_id,
        parent_file_path: test_folder.file_path,
        type: 'file',
        name: '文本文档.txt',
      },
      'abc',
      {ignore_rapid: true},
    )

    const contentResult = await client.getFileContent(
      {
        drive_id,
        file_path: fileRes.file_path,
      },
      {
        responseType: 'text',
      },
    )

    assert(contentResult.content == 'abc')
  })
})
