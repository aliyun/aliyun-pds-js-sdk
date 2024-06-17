import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'

import {getClient, delay, getTestDrive, createTestFolder} from './util/token-util'

describe('FileAPI', function () {
  let drive_id: string
  let client
  let test_folder
  let test_folder_name = `test-file-${Math.random().toString(36).substring(2)}`
  beforeAll(async () => {
    client = await getClient()
    // 创建个新的
    const newDrive = await getTestDrive(client)

    drive_id = newDrive.drive_id

    test_folder = await createTestFolder(client, {
      drive_id,
      parent_file_id: 'root',
      name: test_folder_name,
    })

    expect(!!test_folder.file_id).toBe(true)

    console.log('所有测试在此目录下进行：', test_folder)
  })

  afterAll(async () => {
    client = await getClient()
    console.log('删除测试目录')

    await client.deleteFile(
      {
        drive_id,
        file_id: test_folder.file_id,
      },
      true,
    )
  })

  beforeEach(async () => {
    // 清空
    console.log('---------清空-------')
    let {items = []} = await client.listFiles({drive_id, parent_file_id: test_folder.file_id || ''})
    await client.batchDeleteFiles(items, true)
  })

  it('fileActions', async () => {
    // 创建两个文件夹
    const folder1 = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: 'folder1',
    })
    expect(folder1.type).toBe('folder')

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

    // 复制一个
    await client.copyFiles(
      [
        {
          drive_id,
          file_id: folder3.file_id,
          parent_file_id: test_folder.file_id,
        },
      ],
      {
        to_parent_file_id: test_folder.file_id,
        to_drive_id: drive_id,
        new_name: 'folder5',
      },
    )

    await delay(1000)

    // 将第一个移动到第二个里面
    let {successItems: successItems1 = [], errorItems: errorItems1 = []} = await client.batchMoveFiles([folder1], {
      to_parent_file_id: folder3.file_id,
      // onProgress: () => {},
    })
    expect(successItems1.length).toBe(1)
    await delay(1000)

    // 对 folder2 进行复制 复制到同层级
    let {successItems: successItems2 = [], errorItems: errorItems2 = []} = await client.batchCopyFiles([folder3], {
      to_parent_file_id: test_folder.file_id,
      new_name: 'folder4',
      // onProgress: () => {},
    })
    expect(successItems2.length).toBe(1)
    // 复制目录是异步的，骚等即可
    await delay(1000)

    // 获取所有文件
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id || '',
    })
    // console.log(items)
    expect(items.length).toBe(3)

    expect(
      items
        .map(n => n.name)
        .sort()
        .join(','),
    ).toBe('folder3,folder4,folder5')

    // 对文件进行打包
    const res = await client.archiveFiles({
      drive_id,
      name: 'pack-file' + items.length,
      files: items.map(m => {
        return {file_id: m.file_id}
      }),
    })
    expect(!!res.async_task_id).toBe(true)

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
      parent_file_id: test_folder.file_id || '',
    })

    // 删除
    await client.batchDeleteFiles(listItem, true)

    await delay(2000)
    // 获取
    const {items: listItem2 = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id || '',
    })

    expect(listItem2.length).toBe(0)
  })

  it('searchFile', async () => {
    console.log('------删除所有文件')
    let {items: list_items = []} = await client.listFiles({drive_id, parent_file_id: test_folder.file_id || ''})
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
        parent_file_id: test_folder.file_id || '',
      },
      {},
    )
    expect(items.length).toBe(4)

    // 更新
    const updateRes = await client.updateFile({
      drive_id,
      file_id: items[0].file_id,
      name: 'UP_FILE',
    })
    expect(updateRes.name).toBe('UP_FILE')

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
    expect(searchRes.items.length).toBe(1) //'k中'

    // 收藏
    const starRes = await client.batchToggleFilesStar(items, true)
    expect(starRes.type).toBe('star')

    // 查询收藏
    const customRes = await client.listStarredFiles({
      drive_id,
    })
    // console.log('查询收藏:', customRes.items)
    expect(customRes.items.length).toBe(4)
    expect(customRes.items.filter(n => n.starred).length).toBe(4)

    // 取消收藏
    const hiddenRes = await client.batchToggleFilesStar(starRes.successItems, false)
    expect(hiddenRes.type).toBe('unStar')

    // 再查询收藏
    const customRes2 = await client.listStarredFiles({
      drive_id,
    })

    expect(customRes2.items.length).toBe(0)
    expect(customRes2.items.filter(n => n.starred).length).toBe(0)

    // 删除
    await client.batchDeleteFiles(items, false)

    let getTrashList
    for (let i = 0; i < 5; i++) {
      await delay(5000)
      // 获取回收站内容
      getTrashList = await client.searchFiles(
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

      if (getTrashList.items.length == items.length) break
    }

    const restoreRes = await client.batchRestoreFiles(getTrashList.items)
    expect(restoreRes.successItems.length + restoreRes.errorItems.length).toBe(getTrashList.items.length)

    // 清空回收站
    const trashRes = await client.clearRecycleBin()
    expect(trashRes.items.length).toBeGreaterThan(0)
  })

  it('folder', async () => {
    // 先删除
    console.log('===先删除 /folder-01')
    try {
      const fileInfo1 = await client.getFileByPath({
        drive_id,
        file_path: '/folder-01/',
      })
      await client.deleteFile(fileInfo1, true)
    } catch (e) {
      console.log('-----')
    }

    console.log('===开始创建目录')

    // 开始创建目录
    const folderRes = await client.createFolder({
      drive_id,
      // parent_file_id: 'root',
      name: 'folder-01',
    })

    console.log('===移动空文件')

    // 情况1 移动空文件
    await client.moveFiles([], {
      to_parent_file_id: folderRes.file_id,
      onProgress: () => {},
    })

    console.log('===移动到同一目录下')

    // 情况2 移动到同一目录下
    await client.moveFiles([folderRes], {
      to_parent_file_id: test_folder.file_id,
      to_drive_id: drive_id,
      onProgress: () => {},
    })

    console.log('===创建目录')

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
          // console.log('onFolderCreated:', folderKey)
        },
      },
    )
    console.log('========创建目录', folder_id)
    expect(typeof folder_id).toBe('string')

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
            // console.log('onFolderCreated:', folderKey)
          },
        },
      )
      expect('should throw').toBe(true)
    } catch (e) {
      expect(e.code).toBe('AlreadyExists')
    }
    console.log('====== 获取文件夹路径 为空的情况')
    // 获取文件夹路径 为空的情况
    const fileInfo = await client.getFileByPath({
      drive_id,
      file_path: '/' + test_folder_name + '/folder-01',
    })
    expect(fileInfo.type).toBe('folder')

    console.log('======向上查父级目录')

    // 向上查父级目录
    let arr = await client.getBreadcrumbFolders(drive_id, folder_id)
    console.log('---', arr)
    expect(arr.length).toBe(5)
    expect(arr[0].name).toBe(test_folder_name)
    expect(arr[0].file_id).toBe(test_folder.file_id)

    expect(arr[1].name).toBe('folder-01')
    expect(arr[1].file_id).toBe(folderRes.file_id)

    expect(arr[2].name).toBe('a')
    expect(arr[3].name).toBe('b')
    expect(arr[4].name).toBe('c')
    expect(arr[4].file_id).toBe(folder_id)

    // 向上查父级目录2
    console.log('======向上查父级目录(缓存)')

    arr = await client.getBreadcrumbFolderList({drive_id, file_id: folder_id})
    console.log(JSON.stringify(arr))
    expect(arr.length).toBe(5)
    expect(arr[0].name).toBe(test_folder_name)
    expect(arr[0].file_id).toBe(test_folder.file_id)

    expect(arr[1].name).toBe('folder-01')
    expect(arr[1].file_id).toBe(folderRes.file_id)

    expect(arr[2].name).toBe('a')
    expect(arr[3].name).toBe('b')
    expect(arr[4].name).toBe('c')
    expect(arr[4].file_id).toBe(folder_id)
    // 清理
    console.log('======清理')

    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id || '',
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
    expect(fileList.file_id).toBe(fileRes.file_id)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id || '',
    })

    await client.batchDeleteFiles(items, true)
  })

  it('file content', async () => {
    const fileRes = await client.saveFileContent(
      {drive_id, parent_file_id: test_folder.file_id, type: 'file', name: '文本文档.txt'},
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

    expect(contentResult.content).toBe('abc')
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
    expect(result.method).toBe('GET')
    expect(!!result.url).toBe(true)
    expect(!!result.expiration).toBe(true)
  })

  it('pre create check', async () => {
    const res0 = await client.preCreateCheck({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文本文档2.txt',
    })
    console.log(res0)
    expect(res0.result_code).toBe('success')

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
    await delay(2000)

    const res = await client.preCreateCheck({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文本文档2.txt',
    })
    console.log(res)
    expect(res.result_code).toBe('NameCheckFailed.ExistSameNameFile')
    expect(res.name_check_result.exist_file_id).toBe(fileRes.file_id)
  })

  it('batch pre create check', async () => {
    const {exist_files, not_exist_files} = await client.batchCheckFilesExist([
      {
        drive_id,
        parent_file_id: test_folder.file_id,
        type: 'file',
        name: '文本文档2.txt',
      },
    ])

    console.log('--result:', exist_files, not_exist_files)

    expect(exist_files.length).toBe(0)
    expect(not_exist_files.length).toBe(1)
    expect(not_exist_files[0].drive_id).toBe(drive_id)
    expect(not_exist_files[0].parent_file_id).toBe(test_folder.file_id)
    expect(not_exist_files[0].file_name).toBe(test_folder.name)

    // 保存一个
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

    // 再查
    const {exist_files: _exist_files, not_exist_files: _not_exist_files} = await client.batchCheckFilesExist([
      {
        drive_id,
        parent_file_id: test_folder.file_id,
        type: 'file',
        name: '文本文档2.txt',
      },
    ])

    console.log('--result2:', _exist_files, _not_exist_files)
    expect(_exist_files.length).toBe(1)
    expect(_not_exist_files.length).toBe(0)

    expect(_exist_files[0].drive_id).toBe(drive_id)
    expect(_exist_files[0].parent_file_id).toBe(test_folder.file_id)
    expect(_exist_files[0].file_name).toBe(test_folder.name)
    expect(_exist_files[0].file_id).toBe(fileRes.file_id)
  })
})
