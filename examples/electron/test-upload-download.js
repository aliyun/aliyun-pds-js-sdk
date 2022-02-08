/** @format */

const conf = window.Config
// const {execSync} = window.PDS_SDK.Context.cp
window.onload = function () {
  document.getElementById('btn').onclick = () => {
    uploadDownload()
  }

  document.getElementById('btn2').onclick = () => {
    sha1Test()
  }
}

async function sha1Test() {
  let p = await window.getUploadFile()
  if (!p) return

  const {path, fs} = window.PDS_SDK.Context

  let file = {
    path: p,
    name: path.basename(p),
    size: fs.statSync(p).size,
  }

  let d = Date.now()
  let x = await window.PDS_SDK.JS_SHA1.calcFileSha1Node(file, 0, prog => { 
    console.log(prog)
  }, null, {
    ...window.ClientBridge.Context,
  })
  console.log(x, Date.now() - d)
}

async function uploadDownload() {
  var client = await window.getPDSClient('StandardMode')

  let p = await window.getUploadFile()
  if (!p) return

  const to = {
    drive_id: conf['domains']['StandardMode'].drive_id,
    parent_file_id: 'root',
  }
  let task
  var cp = await client.uploadFile(p, to, {
    ignore_rapid: true,
    parallel_upload: true,
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

  const downloadTo = 'bin/tmp-' + pdsFile.name

  var cp2 = await client.downloadFile(pdsFile, downloadTo, {
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
