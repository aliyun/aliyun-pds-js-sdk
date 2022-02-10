/** @format */

// const {execSync} = window.PDS_SDK.Context.cp
window.addEventListener('load', function () {
  document.getElementById('btn-sha1-browser').onclick = () => {
    sha1Browser()
  }
  document.getElementById('btn-sha1-mul-browser').onclick = () => {
    sha1Browser_mul()
  }
  document.getElementById('btn-sha1-node').onclick = () => {
    sha1Node()
  }
  document.getElementById('btn-sha1-mul-node').onclick = () => {
    sha1Node_mul()
  }
})

async function sha1Node_mul() {
  let p = await window.getUploadFile()
  if (!p) return

  const {path, fs} = window.PDS_SDK.Context

  let file = {
    path: p,
    name: path.basename(p),
    size: fs.statSync(p).size,
  }

  console.log(`文件大小：(${file.size}), path=${p}`)

  console.log('----------- node sha1 并行计算 start------------------')
  let start = Date.now()
  let [parts, part_size] = window.PDS_SDK.ChunkUtil.init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
  console.log('分片:', parts.length, '每片大小:', part_size)

  let result = await window.PDS_SDK.JS_SHA1.calcFilePartsSha1Node(
    file.path,
    parts,
    prog => {
      console.log(prog)
    },
    null,
    {fs, crypto},
  )

  console.log(result)
  console.log(`结果：${result.content_hash} 耗时：${(Date.now() - start) / 1000}s`)
  console.log('------------ node sha1 并行计算 end------------------')
}
async function sha1Node() {
  let p = await window.getUploadFile()
  if (!p) return

  const {path, crypto, fs} = window.PDS_SDK.Context

  let file = {
    path: p,
    name: path.basename(p),
    size: fs.statSync(p).size,
  }

  console.log(`文件大小：(${file.size}), path=${p}`)

  var start = Date.now()
  console.log('-------------node sha1 串行计算 start------------------')

  let result = await window.PDS_SDK.JS_SHA1.calcFileSha1Node(
    file.path,
    0,
    prog => {
      console.log(prog)
    },
    null,
    {fs, crypto},
  )

  console.log(`结果：${result} 耗时：${(Date.now() - start) / 1000}s`)
  console.log('-------------node sha1 串行计算 end------------------')
}

async function sha1Browser_mul() {
  let file = await selectFileInBrowser()
  if (!file) return
  console.log(`-----browser 并行 sha1---------`)

  let [parts, part_size] = window.PDS_SDK.ChunkUtil.init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
  console.log('分片:', parts.length, '每片大小:', part_size)

  let d = Date.now()
  let result = await window.PDS_SDK.JS_SHA1.calcFilePartsSha1(
    file,
    parts,
    prog => {
      console.log(prog)
    },
    null,
    {
      ...window.PDS_SDK.Context,
    },
  )
  console.log(result)
  console.log(`结果：${result.content_hash}, 耗时：${(Date.now() - d) / 1000}s`)
  console.log(`-----browser 并行 sha1---------`)
}

async function sha1Browser() {
  let file = await selectFileInBrowser()
  if (!file) return
  console.log(`-----browser 串行 sha1---------`)

  let d = Date.now()
  let x = await window.PDS_SDK.JS_SHA1.calcFileSha1(
    file,
    0,
    prog => {
      console.log(prog)
    },
    null,
    {
      ...window.PDS_SDK.Context,
    },
  )
  console.log(`结果： ${x}, 耗时：${(Date.now() - d) / 1000}s`)
  console.log(`-----browser 串行 sha1---------`)
}
