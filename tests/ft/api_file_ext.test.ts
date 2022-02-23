/** @format */

const assert = require('assert')
import {join} from 'path'
import {PDSClient} from './index'
const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('file_ext', function () {
  this.timeout(60 * 1000)
  let domainId: string
  let drive_id: string
  let client: PDSClient

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
    drive_id = client.token_info.default_drive_id
    domainId = client.token_info.domain_id
  })

  it('office', async () => {
    const fileRes = await client.saveFileContent({
      drive_id,
      parent_file_id: 'root',
      type: 'file',
      name: '文本文档.txt',
      content_type: 'text/plain',
      size: 0,
    })

    // 预览
    const preRes = await client.getOfficePreviewUrl({
      drive_id,
      file_id: fileRes.file_id,
      allow_copy: true,
      // parent_file_id: fileRes.parent_file_id,
    })
    assert.ok(preRes.preview_url)

    // 编辑
    const editRes = await client.getOfficeEditUrl({
      drive_id,
      file_id: fileRes.file_id,
      // parent_file_id: fileRes.parent_file_id,
    })
    assert.ok(editRes.edit_url)

    // 刷新
    const refreshRes = await client.refreshOfficeEditToken({
      office_access_token: editRes.office_access_token,
      office_refresh_token: editRes.office_refresh_token,
    })
    assert.ok(refreshRes.office_access_token)

    // 清理
    const {items = []} = await client.listFiles({
      drive_id,
      parent_file_id: 'root',
    })
    await client.batchDeleteFiles(items, true)
  })

  it('video preview', async () => {
    const localPath = join(__dirname, 'resources/video-test.mov')
    let cp = await client.uploadFile(localPath, {
      drive_id,
      parent_file_id: 'root',
    })

    // 视频预览
    const preRes = await client.getVideoUrlFromDefinition({
      drive_id,
      file_id: cp.file_key,
      // parent_file_id: 'root',
    })
    console.log('------', preRes)
    assert(preRes.video_preview_play_info.category == 'live_transcoding')
  })

  it('audio preview', async () => {
    const localPath = join(__dirname, 'resources/audio-test.mp3')
    let cp = await client.uploadFile(localPath, {
      drive_id,
      parent_file_id: 'root',
    })

    // 音频预览
    const preRes = await client.getAudioUrlFromDefinition({
      drive_id,
      file_id: cp.file_key,
      audio_template_id: 'LQ',
    })
    assert(preRes.code == 'VideoPreviewWaitAndRetry' || preRes.preview_url)
  })

  it('archive files', async () => {
    let folder = await client.createFolder({
      drive_id,
      parent_file_id: 'root',
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
      parent_file_id: folder.file_id,
    })
    assert(items.length == 3)

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

    assert.ok(packRes.async_task_id)
    const packRes2 = await client.pollingArchiveFiles(data)

    assert.ok(packRes2.async_task_id)
    assert.ok(packRes2.state === 'Succeed')
    assert.ok(packRes2.url)

    await client.batchDeleteFiles([folder], true)
  })
})
