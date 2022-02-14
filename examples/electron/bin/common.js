/** @format */

async function getToken(path_type) {
  return await fetch(`bin/${path_type}-token.json`).then(r => r.json())
}

async function getPDSClient(path_type) {
  const {api_endpoint, auth_endpoint} = window.Config['domains'][path_type]
  return new window.PDS_SDK.PDSClient(
    {
      token_info: await getToken(path_type),
      api_endpoint,
      auth_endpoint,
      path_type,
    },
    window.PDS_SDK.Context,
  )
}

async function getUploadFile() {
  var x = await window.ClientBridge.openUploadDialog('file')

  let {canceled, filePaths = []} = x
  if (canceled) return

  return filePaths?.[0]
}

function selectFileInBrowser() {
  return new Promise(resolve => {
    handle_select_file_browser = file => {
      if (file) resolve(file)
    }
    let fileEle = document.getElementById('file1')
    fileEle.click()
  })
}

function showMessage(msg) {
  document.getElementById('msg').innerHTML = msg || ''
}
