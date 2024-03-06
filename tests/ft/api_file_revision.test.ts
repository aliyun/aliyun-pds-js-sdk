import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'

import {getClient, delay, createTestFolder} from './util/token-util'

describe('file_revision', function () {
  let drive_id: string
  let client
  let test_folder
  let test_folder_name = 'test-user-rev-action'

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

  it('revision', async () => {
    console.log('save file content')
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文本文档.txt',
      content_type: 'text/plain',
      size: 0,
    })
    console.log('保存', fileRes)

    let file_id = fileRes.file_id

    await delay(3000)

    // 查询版本
    const res = await client.listFileRevisions({
      drive_id,
      file_id: file_id,
      fields: '*',
    })
    console.log('查询版本:', res.items)

    expect(res.items.length).toBe(1)

    // 再次保存
    const fileRes2 = await client.saveFileContent(
      {
        drive_id,
        parent_file_id: test_folder.file_id,
        file_id,
        type: 'file',
        name: '文本文档.txt',
        content_type: 'text/plain',

        size: 3,
      },
      'abc',
    )

    console.log('再次保存', fileRes2)

    await delay(3000)
    // 查询版本
    const {items = []} = await client.listFileRevisions({
      drive_id,
      file_id: file_id,
      fields: '*',
    })
    console.log('list版本:', items)

    expect(items.length).toBe(2)

    // 还原历史到最新
    console.log('还原历史到最新')
    await client.restoreFileRevision({
      drive_id,
      file_id: file_id,
      revision_id: items[1].revision_id,
    })

    await delay(3000)

    //
    console.log('再查询版本')
    const {items: items2 = []} = await client.listFileRevisions({
      drive_id,
      file_id: file_id,
      fields: '*',
    })
    console.log('list版本2:', items2)

    expect(items2[0].revision_id == fileRes2.revision_id)
    expect(items2[1].revision_id == fileRes.revision_id)

    try {
      console.log('无法删除最新版本')
      await client.deleteFileRevision({
        drive_id,
        file_id,
        revision_id: items[0].revision_id,
      })
    } catch (e) {
      expect(e.code).toBe('FileLatestRevisionCannotBeRestore')
    }

    console.log('删除版本')
    await client.deleteFileRevision({
      drive_id,
      file_id,
      revision_id: items[1].revision_id,
    })
    console.log('删除版本成功')
    await delay(3000)
    // 查询版本
    const pres = await client.listFileRevisions({
      drive_id,
      file_id: file_id,
      fields: '*',
    })
    console.log('查询版本:', pres.items)

    expect(pres.items.length).toBe(1)
  })

  it('update', async () => {
    console.log('--------------update------------')

    console.log('保存文件')
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文本文档.txt',
      content_type: 'text/plain',
      size: 0,
    })
    console.log('保存', fileRes)

    let file_id = fileRes.file_id
    let revision_id = fileRes.revision_id

    let res = await client.updateFileRevision({
      drive_id,
      file_id,
      revision_id,
      revision_description: '中文',
      keep_forever: true,
    })

    console.log(res)

    let info = await client.getFileRevision({
      drive_id,
      file_id,
      revision_id,
    })

    console.log(info)
    expect(info.revision_description).toBe('中文')
  })
})
