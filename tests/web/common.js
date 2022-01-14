/** @format */
const conf = window.Config['domains']
const {PDSClient, HttpClient} = window.PDS_SDK
// 需要先运行 ft，生成 tmp-token-${domainId}-superadmin.json
async function getToken(path_type) {
  return await fetch(`${path_type}-token.json`).then(r => r.json())
}
async function getPDSClient(path_type) {
  const {api_endpoint, auth_endpoint} = conf[path_type]
  return new PDSClient(
    {
      token_info: await getToken(path_type),
      api_endpoint,
      auth_endpoint,
      path_type,
    },
    // {Axios: axios, isNode: false},
  )
}

async function getHttpClient(path_type) {
  const {api_endpoint, auth_endpoint} = conf[path_type]
  return new HttpClient(
    {
      token_info: await getToken(path_type),
      api_endpoint,
      auth_endpoint,
      path_type,
    },
    // {Axios: axios, isNode: false},
  )
}

function getUploadFile(msg = '') {
  return new Promise(resolve => {
    let fileEle = document.querySelector('#upload>input[type=file]')
    document.querySelector('#upload .msg').innerHTML = msg
    document.querySelector('#upload').style.display = 'inline-block'

    fileEle.onchange = function (e) {
      resolve(e.target.files[0])

      setTimeout(() => {
        fileEle.value = ''
        document.querySelector('#upload').style.display = 'none'
      }, 100)
    }
  })
}

function showMessage(id, ...args) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('id', id)
    el.style.margin = '20px'
    el.style.fontFamily = 'Menlo,Monaco,Courier New,monospace'
    document.querySelector('body').appendChild(el)
  }
  el.innerHTML = args.join('&nbsp;')
}
