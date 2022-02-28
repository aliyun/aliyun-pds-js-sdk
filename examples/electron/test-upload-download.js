/** @format */

const conf = window.Config

window.onload = function () {
  document.getElementById('btn-upload').onclick = () => {
    uploadTest({ignore_rapid: true, parallel_upload: true})
  }
  document.getElementById('btn-upload-serial').onclick = () => {
    uploadTest({ignore_rapid: true, parallel_upload: false})
  }
  document.getElementById('btn-upload-hosting').onclick = () => {
    uploadHostingTest()
  }
  document.getElementById('btn-download').onclick = () => {
    downloadTest()
  }
}
let cp
async function uploadTest({ignore_rapid, parallel_upload}) {
  var client = await window.getPDSClient('StandardMode')

  let p = await window.getUploadFile()
  if (!p) return
  let msg_id = Math.random(36).toString().substring(2)

  const to = {
    drive_id: conf['domains']['StandardMode'].drive_id,
    parent_file_id: 'root',
  }

  let task
  cp = await client.uploadFile(p, to, {
    ignore_rapid,
    parallel_upload,
    verbose: true,
    onReady(t) {
      task = t
    },
    onStateChange(cp, state, error) {
      if (state == 'success') {
        showMessage('上传成功', msg_id)
      } else if (state == 'rapic_success') {
        showMessage('秒传成功', msg_id)
      } else {
        showMessage(state, msg_id)
      }

      console.log('🏞🏞🏞🏞', state)
    },
    onProgress(state, prog) {
      if (state == 'running')
        showMessage('正在上传:' + prog + '%, 速度' + window.PDS_SDK.formatSize(task.speed) + '/s', msg_id)
      else if (state == 'computing_hash') showMessage('正在计算:' + prog + '%', msg_id)
      else if (state == 'checking') {
        showMessage('正在校验:' + prog + '%', msg_id)
      }
      console.log('🤘🏻🤘🏻🤘🏻🤘🏻', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
  })

  console.log('上传成功: ', cp.state, ', file id:', cp.file_id)

  document.getElementById('btn-download').disabled = false
}

async function uploadHostingTest() {
  var client = await window.getPDSClient('HostingMode')

  let p = await window.getUploadFile()
  if (!p) return
  let msg_id = Math.random(36).toString().substring(2)

  const to = {
    drive_id: conf['domains']['HostingMode'].drive_id,
    parent_file_path: '/',
  }
  let task
  cp = await client.uploadFile(p, to, {
    verbose: true,
    onReady(t) {
      task = t
    },
    onStateChange(cp, state, error) {
      if (state == 'success') {
        showMessage('上传成功', msg_id)
      } else {
        showMessage(state, msg_id)
      }

      console.log('🏞🏞🏞🏞', state)
    },
    onProgress(state, prog) {
      if (state == 'running')
        showMessage('正在上传:' + prog + '%, 速度' + window.PDS_SDK.formatSize(task.speed) + '/s', msg_id)
      else if (state == 'computing_hash') showMessage('正在计算:' + prog + '%', msg_id)
      else if (state == 'checking') {
        showMessage('正在校验:' + prog + '%', msg_id)
      }
      console.log('🤘🏻🤘🏻🤘🏻🤘🏻', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
  })

  console.log('上传成功: ', cp.state, ', file id:', cp.file_id)

  document.getElementById('btn-download').disabled = false
}
async function downloadTest() {
  download(cp.drive_id, cp.file_id)

  // const drive_id = conf['domains']['StandardMode'].drive_id
  // download(drive_id,'6218e4f8f97d4698ed964349855ec3c1dc7e4db4')
  // download(drive_id,'6218d58f1ef5651bde994b7b93fa56bcbd9e7d1a')
}

async function download(drive_id, file_id) {
  let msg_id = Math.random(36).toString().substring(2)
  var client = await window.getPDSClient('StandardMode')

  let pdsFile = await client.getFile({drive_id, file_id})

  const downloadTo = 'bin/tmp-' + pdsFile.name
  var task
  var cp2 = await client.downloadFile(pdsFile, downloadTo, {
    verbose: true,
    max_chunk_size: 10 * 1024 * 1024, //每片10MB
    init_chunk_con: 5,
    onReady(t) {
      task = t
    },
    onProgress(state, prog) {
      if (state == 'running')
        showMessage('正在下载:' + prog + '%, 速度' + window.PDS_SDK.formatSize(task.speed) + '/s', msg_id)
      else if (state == 'computing_hash') showMessage('正在计算:' + prog + '%', msg_id)
      else if (state == 'checking') {
        showMessage('正在校验:' + prog + '%', msg_id)
      }

      console.log('👇🏻👇🏻👇🏻👇🏻', state, prog + '%', window.PDS_SDK.formatSize(task.speed) + '/s')
    },
    onStateChange(cp, state, error) {
      if (state == 'success') {
        showMessage('下载成功', msg_id)
      } else {
        showMessage(state, msg_id)
      }
      console.log('🏞🏞🏞🏞', state)
    },
  })

  console.log('下载成功: ', cp2.state)
}
