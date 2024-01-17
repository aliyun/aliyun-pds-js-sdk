import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'
import {delay} from '../../lib/utils/HttpUtil'
import {getClient, createTestFolder} from './util/token-util'
import {getTestVideoFile, getTestAudioFile} from './util/file-util'

describe('file_ext', function () {
  let domainId: string
  let drive_id: string
  let client
  let test_folder_name = 'test-ext-folder'
  let test_folder
  beforeAll(async () => {
    client = await getClient(true)
    drive_id = client.token_info?.default_drive_id || ''
    domainId = client.token_info?.domain_id || ''

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

  it('office', async () => {
    // 清理
    const {items: fileItems = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })
    console.log('--batchDeleteFiles')
    await client.batchDeleteFiles(fileItems, true)
    console.log('--saveFileContent')

    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_id: test_folder.file_id,
      type: 'file',
      name: '文本文档.txt',
      content_type: 'text/plain',
      size: 0,
    })
    console.log('--getOfficePreviewUrl')

    // 预览
    const preRes = await client.getOfficePreviewUrl({
      drive_id,
      file_id: fileRes.file_id,
      allow_copy: true,
      // parent_file_id: fileRes.parent_file_id,
    })
    expect(!!preRes.preview_url).toBe(true)
    console.log('--getOfficeEditUrl')

    // 编辑
    const editRes = await client.getOfficeEditUrl({
      drive_id,
      file_id: fileRes.file_id,
      // parent_file_id: fileRes.parent_file_id,
    })
    expect(!!editRes.edit_url).toBe(true)
    console.log('--refreshOfficeEditToken')

    // 刷新
    const refreshRes = await client.refreshOfficeEditToken({
      office_access_token: editRes.office_access_token,
      office_refresh_token: editRes.office_refresh_token,
    })
    expect(!!refreshRes.office_access_token).toBe(true)

    // 清理
    console.log('--listFiles')

    const {items: fileItems2 = []} = await client.listFiles({
      drive_id,
      parent_file_id: test_folder.file_id,
    })
    await client.batchDeleteFiles(fileItems2, true)
  })

  it('video preview', async () => {
    let f = await getTestVideoFile()
    console.log('---------f', f)

    let cp = await client.uploadFile(f, {
      drive_id,
      parent_file_id: test_folder.file_id,
    })
    console.log('----------', cp)

    await delay(1000)

    let info = await client.getFile({
      drive_id,
      file_id: cp.file_id,
      thumbnail_processes: {
        '480X480': {
          video_thumbnail_process: 'video/snapshot,t_1000,f_jpg,m_fast,ar_auto,h_0,w_480',
        },
      },
    })
    // console.log('---info', info)
    expect(info.thumbnail_urls['480X480']).toContain('https://')

    await delay(1000)

    // 视频预览
    let preRes = await client.getVideoPreviewPlayMeta({
      drive_id,
      file_id: cp.file_id,
      category: 'live_transcoding',
      // get_without_url: true
      // parent_file_id: test_folder.file_id,
    })

    console.log('-----------preRes---', preRes)

    // 视频预览
    preRes = await client.getVideoUrlFromDefinition({
      drive_id,
      file_id: cp.file_id,
      category: 'live_transcoding',

      get_without_url: true,
      // parent_file_id: test_folder.file_id,
    })
    console.log('-----------preRes2---', preRes)

    expect(preRes.video_preview_play_info?.category).toBe('live_transcoding')
  })

  it('audio preview', async () => {
    let f = await getTestAudioFile()
    console.log('----------ff', f)

    let cp = await client.uploadFile(f, {
      drive_id,
      parent_file_id: test_folder.file_id,
    })
    console.log('----------', cp)
    // 音频预览
    const preRes = await client.getAudioUrlFromDefinition({
      drive_id,
      file_id: cp.file_key,
      audio_template_id: 'LQ',
    })
    expect(preRes.code == 'VideoPreviewWaitAndRetry' || !!preRes.preview_url).toBe(true)
  })

  it('archive files', async () => {
    let folder = await client.createFolder({
      drive_id,
      parent_file_id: test_folder.file_id,
      name: '下载test文件夹',
    })

    for (let i = 1; i < 4; i++) {
      await client.createFolder({
        drive_id,
        parent_file_id: folder.file_id,
        name: '文件夹' + i,
      })
    }
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: folder.file_id || '',
    })
    expect(items.length).toBe(3)

    // 打包
    const data = {
      files: items.map(m => {
        return {
          file_id: m.file_id,
        }
      }),
      name: '服务端打包',
      drive_id,
    }
    const packRes = await client.archiveFiles(data)

    expect(!!packRes.async_task_id).toBe(true)
    const packRes2 = await client.pollingArchiveFiles(data)

    expect(!!packRes2.async_task_id).toBe(true)
    expect(packRes2.state).toBe('Succeed')
    expect(!!packRes2.url).toBe(true)

    await client.batchDeleteFiles([folder], true)
  })
})
