/** @format */

const assert = require('assert')

import {ICreateFileRes} from '../../src'
import {delay} from '../../src/utils/HttpUtil'
import {PDSClient} from './index'

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('FileAPI', function () {
  this.timeout(60000)

  let drive_id: string
  let client: PDSClient
  let test_folder: ICreateFileRes

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = client.token_info.default_drive_id

    test_folder = await client.createFolder({
      drive_id,
      parent_file_id: 'root',
      name: 'test-file-action',
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

  it('fileActions', async () => {
    // 创建两个文件夹
    const folder1 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: 'folder1',
    })
    assert.ok(folder1.type, 'folder')

    const folder2 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: 'folder2',
    })

    // 更新文件 重命名
    const folder3 = await client.renameFile(
      {
        drive_id,
        file_id: folder2.file_id,
      },
      'folder3',
    )

    // 将第一个移动到第二个里面
    await client.moveFiles([folder1], {
      to_parent_file_id: folder3.file_id,
      onProgress: () => {},
    })

    // 对 folder2 进行复制 复制到同层级
    await client.copyFiles([folder3], {
      to_parent_file_id: test_folder.file_id,
      new_name: 'folder4',
      onProgress: () => {},
    })

    // 获取所有文件
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })
    // console.log(items)
    assert(items.length === 2)

    assert(
      items
        .map(n => n.name)
        .sort()
        .join(',') == 'folder3,folder4',
    )

    // 对文件进行打包
    const res = await client.archiveFiles({
      drive_id,
      name: 'pack-file' + items.length,
      files: items.map(m => {
        return {file_id: m.file_id}
      }),
    })
    assert.ok(res.async_task_id)

    // console.log('==================', items)

    // 删除
    for (const c of items) {
      await client.batchDeleteFiles(
        [
          {
            drive_id,
            file_id: c.file_id,
          },
        ],
        true,
      )
    }

    // 获取
    const {items: listItem = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })

    // 删除
    await client.batchDeleteFiles(listItem, true)

    await delay(2000)
    // 获取
    const {items: listItem2 = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })

    assert(listItem2.length === 0)
  })

  it('searchFile', async () => {
    console.log('------删除所有文件')
    let {items: list_items = []} = await client.listFiles({drive_id, parent_file_id: test_folder.file_id})
    // console.log(list_items)
    await client.batchDeleteFiles(list_items, false)

    console.log('------创建4个目录')
    const arr = ['she', 'yt', 'k中', 'jk']
    for (let n of arr) {
      let x = await client.createFolder({
        drive_id,
        parent_file_id: test_folder.file_id,
        name: n,
      })
      // console.log(x)
    }

    // 获取所有文件
    const {items = []} = await client.listFiles(
      {
        drive_id,
        parent_file_id: test_folder.file_id,
      },
      {},
    )
    assert(items.length == 4)

    // 更新
    const updateRes = await client.updateFile({
      drive_id,
      file_id: items[0].file_id,
      name: 'UP_FILE',
    })
    assert(updateRes.name === 'UP_FILE')

    await delay(4000)
    // 特定条件筛选
    const searchRes = await client.searchFiles({
      drive_id,
      query: `(name="k" or name match "k" or description match "k") and parent_file_id="${test_folder.file_id}"`,
      fields: '*',
      limit: 100,
      url_expire_sec: 7200,
    })
    // console.log('搜索1', searchRes)
    assert.ok(searchRes.items.length == 1) //'k中'

    // 收藏
    const starRes = await client.batchToggleFilesStar(items, true)
    assert(starRes.type === 'star')

    // 查询收藏
    const customRes = await client.listStarredFiles({
      drive_id,
    })
    // console.log('查询收藏:', customRes.items)
    assert(customRes.items.length === 4)
    assert(customRes.items.filter(n => n.starred).length == 4)

    // 取消收藏
    const hiddenRes = await client.batchToggleFilesStar(starRes.successItems, false)
    assert(hiddenRes.type === 'unStar')

    // 再查询收藏
    const customRes2 = await client.listStarredFiles({
      drive_id,
    })

    assert(customRes2.items.length === 0)
    assert(customRes2.items.filter(n => n.starred).length == 0)

    // 删除
    await client.batchDeleteFiles(items, true)

    // 获取回收站内容
    const getTrashList = await client.searchFiles(
      {
        drive_id,
        query: '',
        fields: '*',
        limit: 100,
        image_thumbnail_process: 'image/resize,w_160/format,jpeg',
        image_url_process: 'image/resize,w_1920/format,jpeg',
        marker: '',
        order_by: 'type ASC,updated_at DESC',
        url_expire_sec: 7200,
        video_thumbnail_process: 'video/snapshot,t_0,f_jpg,w_100,ar_auto',
      },
      {},
      true,
    )

    const restoreRes = await client.batchRestoreFiles(getTrashList.items)
    assert.ok(restoreRes.successItems)

    // 清空回收站
    const trashRes = await client.clearRecycleBin()
    assert(trashRes.items)
  })

  it('folder', async () => {
    const folderRes = await client.createFolder({
      drive_id,
      parent_file_id: 'root',
      name: 'folder-01',
    })

    // 情况1 移动空文件
    await client.moveFiles([], {
      to_parent_file_id: folderRes.file_id,
      onProgress: () => {},
    })

    // 情况2 移动到同一目录下
    await client.moveFiles([folderRes], {
      to_parent_file_id: 'root',
      to_drive_id: drive_id,
      onProgress: () => {},
    })

    // 创建目录
    const folder_id = await client.createFolders(
      ['a', 'b', 'c'],
      {
        drive_id,
        parent_file_id: folderRes.file_id,
      },
      {
        onFolderRepeat: () => true,
        onFolderCreated: folderKey => {
          console.log('onFolderCreated:', folderKey)
        },
      },
    )
    assert(typeof folder_id === 'string')

    // 再次创建同名目录
    try {
      await client.createFolders(
        ['a', 'b', 'c'],
        {
          drive_id,
          parent_file_id: folderRes.file_id,
        },
        {
          onFolderRepeat: () => false,
          onFolderCreated: folderKey => {
            console.log('onFolderCreated:', folderKey)
          },
        },
      )
      assert(false, 'should throw')
    } catch (e) {
      // console.error(e)
      assert(e.code == 'AlreadyExists')
    }

    // 获取文件夹路径 为空的情况
    const filePath = await client.getFileByPath({
      drive_id,
      file_path: '/folder-01',
    })
    assert(filePath.type === 'folder')

    // 向上查父级目录
    let arr = await client.getBreadcrumbFolders(drive_id, folder_id)

    assert(arr.length == 4)
    assert(arr[0].name == 'folder-01')
    assert(arr[0].file_id == folderRes.file_id)

    assert(arr[1].name == 'a')
    assert(arr[2].name == 'b')
    assert(arr[3].name == 'c')
    assert(arr[3].file_id == folder_id)

    // 向上查父级目录
    arr = await client.getBreadcrumbFolderList({drive_id, file_id: folder_id})

    assert(arr.length == 4)
    assert(arr[0].name == 'folder-01')
    assert(arr[0].file_id == folderRes.file_id)

    assert(arr[1].name == 'a')
    assert(arr[2].name == 'b')
    assert(arr[3].name == 'c')
    assert(arr[3].file_id == folder_id)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })

    await client.batchDeleteFiles(items, true)
  })

  it('file', async () => {
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文件01',
    })

    // 根据文件id获取文件信息
    const fileList = await client.getFile({
      drive_id,
      file_id: fileRes.file_id,
    })
    assert(fileList.file_id === fileRes.file_id)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })

    await client.batchDeleteFiles(items, true)
  })

  it('batchOssPath', async () => {
    const folderRes1 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: '文件夹01',
    })
    const folderRes2 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: '文件夹02',
    })
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文本文档.txt',
      parent_file_path: '/',
    })

    const copyRes1 = await client.copyFiles([fileRes], {
      to_parent_file_id: folderRes1.file_id,
      to_drive_id: drive_id,
      onProgress: () => {},
    })
    assert.ok(copyRes1.length == 1)

    const copyRes2 = await client.copyFiles([fileRes], {
      to_parent_file_id: folderRes1.file_id,
      to_drive_id: drive_id,
      onProgress: () => {},
    })

    assert.ok(copyRes2.length == 1)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })
    await client.batchDeleteFiles(items, true)
  })

  it('file content', async () => {
    const fileRes = await client.saveFileContent(
      {
        drive_id,
        parent_file_id: test_folder.file_id,
        type: 'file',
        name: '文本文档.txt',
        parent_file_path: '/',
      },
      'abc',
      {ignore_rapid: true},
    )

    const contentResult = await client.getFileContent(
      {
        drive_id,
        file_id: fileRes.file_id,
      },
      {
        responseType: 'text',
      },
    )

    assert(contentResult.content == 'abc')
  })
  it('get file download url', async () => {
    const fileRes = await client.saveFileContent(
      {
        drive_id,
        parent_file_id: test_folder.file_id,
        type: 'file',
        name: '文本文档2.txt',
        parent_file_path: '/',
      },
      'abc2',
      {ignore_rapid: true},
    )

    const result = await client.getFileDownloadUrl({
      drive_id,
      file_id: fileRes.file_id,
    })
    // console.log(result)
    assert(result.method == 'GET')
    assert(result.url)
    assert(result.expiration)
  })
})
