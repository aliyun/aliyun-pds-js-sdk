/** @format */

const conf = window.Config
// const {execSync} = window.PDS_SDK.Context.cp
window.onload = function () {
  document.getElementById('btn').onclick = () => {
    init()
  }
}

async function init() {
  var client = await window.getPDSClient('StandardMode')

  let p = await window.getUploadFile()
  if (!p) return
  // const p = 'bin/tmp-electron-test.txt'
  const p2 = 'bin/tmp-electron-test2.txt'

  // execSync(`dd if=/dev/zero of=${p} bs=1024 count=10000`)

  const to = {
    drive_id: conf['domains']['StandardMode'].drive_id,
    parent_file_id: 'root',
  }
  let task
  var cp = await client.uploadFile(p, to, {
    ignore_rapid: true,
    parallel_upload: false,
    verbose: true,
    onReady(t) {
      task = t
    },
    onStateChange(cp, state) {
      console.log('🏞🏞🏞🏞', state)
    },
    onProgress(state, prog) {
      console.log('🔫🔫🔫🔫', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
  })

  console.log('上传成功: ', cp.state, ', file id:', cp.file_id)
  const {drive_id, file_id} = cp
  let pdsFile = await client.getFile({drive_id, file_id})

  var cp2 = await client.downloadFile(pdsFile, p2, {
    verbose: true,
    onReady(t) {
      task = t
    },
    onProgress(state, prog) {
      console.log('🔫🔫🔫🔫', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
    onStateChange(cp, state) {
      console.log('🏞🏞🏞🏞', state)
    },
  })

  console.log('下载成功: ', cp2.state)
}
