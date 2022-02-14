/** @format */

const conf = window.Config

window.onload = function () {
  document.getElementById('btn-upload').onclick = () => {
    uploadTest()
  }
  document.getElementById('btn-download').onclick = () => {
    downloadTest()
  }
}
let cp
async function uploadTest() {
  var client = await window.getPDSClient('StandardMode')

  let p = await window.getUploadFile()
  if (!p) return

  const to = {
    drive_id: conf['domains']['StandardMode'].drive_id,
    parent_file_id: 'root',
  }
  let task
  cp = await client.uploadFile(p, to, {
    ignore_rapid: true,
    parallel_upload: true,
    verbose: true,
    onReady(t) {
      task = t
    },
    onStateChange(cp, state, error) {
      if (state == 'success') {
        showMessage('上传成功')
      } else if (state == 'rapic_success') {
        showMessage('秒传成功')
      } else {
        showMessage(state, error)
      }

      console.log('🏞🏞🏞🏞', state)
    },
    onProgress(state, prog) {
      if (state == 'running') showMessage('正在上传:' + prog + '%, 速度' + window.PDS_SDK.formatSize(task.speed) + '/s')
      else if (state == 'computing_hash') showMessage('正在计算:' + prog + '%')
      else if (state == 'checking') {
        showMessage('正在校验:' + prog + '%')
      }
      console.log('🤘🏻🤘🏻🤘🏻🤘🏻', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
  })

  console.log('上传成功: ', cp.state, ', file id:', cp.file_id)

  document.getElementById('btn-download').disabled = false
}

async function downloadTest() {
  if (!cp) {
    console.warn('请先上传文件')
    return
  }
  var client = await window.getPDSClient('StandardMode')

  const {drive_id, file_id} = cp
  let pdsFile = await client.getFile({drive_id, file_id})

  const downloadTo = 'bin/tmp-' + pdsFile.name

  var cp2 = await client.downloadFile(pdsFile, downloadTo, {
    verbose: true,
    onReady(t) {
      task = t
    },
    onProgress(state, prog) {
      if (state == 'running') showMessage('正在上传:' + prog + '%, 速度' + window.PDS_SDK.formatSize(task.speed) + '/s')
      else if (state == 'computing_hash') showMessage('正在计算:' + prog + '%')
      else if (state == 'checking') {
        showMessage('正在校验:' + prog + '%')
      }

      console.log('👇🏻👇🏻👇🏻👇🏻', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
    onStateChange(cp, state, error) {
      if (state == 'success') {
        showMessage('下载成功')
      } else {
        showMessage(state, error)
      }
      console.log('🏞🏞🏞🏞', state)
    },
  })

  console.log('下载成功: ', cp2.state)
}
