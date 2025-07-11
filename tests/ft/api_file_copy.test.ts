import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'

import {getClient, delay, getTestDrive, createTestFolder} from './util/token-util'
import {IFileItemKey} from '../../lib/client/api_file'

const LEN = 200
const PER = 20

describe('FileAPI:gen file 429 & copy', function () {
  let drive_id: string
  let client
  let parent_file_id
  beforeAll(async () => {
    client = await getClient()

    // 创建个新的
    const newDrive = await getTestDrive(client)

    drive_id = newDrive.drive_id

    let test_folder = await createTestFolder(client, {
      drive_id,
      parent_file_id: 'root',
      name: `test-file-${Date.now()}`,
    })
    parent_file_id = test_folder.file_id

    console.log('所有测试在此目录下进行：', test_folder)
  })

  afterAll(async () => {
    client = await getClient()

    console.log('删除测试目录')

    await client.deleteFile(
      {
        drive_id,
        file_id: parent_file_id,
      },
      true,
    )
  })

  beforeEach(async () => {
    // 清空
    console.log('---------清空-------')
    let {items = []} = await client.listFiles({drive_id, parent_file_id: parent_file_id})
    await client.batchDeleteFiles(items, true)
  })

  it('gen file 429 & copy', async () => {
    // 创建 2个文件夹
    const folder1 = await client.createFolder({
      drive_id,
      parent_file_id: parent_file_id,
      name: 'folder1',
    })
    expect(folder1.type).toBe('folder')
    const folder2 = await client.createFolder({
      drive_id,
      parent_file_id: parent_file_id,
      name: 'folder2',
    })
    expect(folder2.type).toBe('folder')

    let t: (IFileItemKey & {name: string})[] = await new Promise(async (a, b) => {
      let arr: (IFileItemKey & {name: string})[] = []

      // 在 folder1 下创 200 个文件
      for (let i = 0; i < LEN; i++) {
        if (i % PER == 0) {
          await delay(100)
        }
        ;(async function () {
          let name = 'copy-test文档' + i + '.txt'
          let cp = await client.saveFileContent(
            {
              drive_id,
              parent_file_id: folder1.file_id,
              type: 'file',
              name,
            },
            'abc-' + Math.random(),
            {ignore_rapid: true},
          )

          console.log('-----generate copy file' + i)
          arr.push({file_id: cp.file_id, name, drive_id, parent_file_id: folder1.file_id})
          if (arr.length == LEN) a(arr)
        })()
      }
    })

    console.log('======文件创建完成:', t.length, t.map(n => n.name).sort())

    expect(t.length).toBe(LEN)
    // 去重后数量
    expect(new Set(t.map(n => n.name)).size).toBe(LEN)

    let t2: number[] = []
    // 复制 copy1下的 150 个文件，到copy2下面
    let results = await client.copyFiles(t, {
      to_parent_file_id: parent_file_id,
      to_drive_id: drive_id,
      onProgress: (c, len) => {
        t2.push(c)
        console.log('========', c, len)
      },
    })

    // 去重后数量
    expect(new Set(t2).size).toBe(LEN)

    console.log('-----result------')
    console.log(results)

    // 删除

    await client.batchDeleteFiles(
      [
        {
          drive_id,
          file_id: folder1.file_id,
        },
        {
          drive_id,
          file_id: folder1.file_id,
        },
      ],
      true,
    )
  })
})
