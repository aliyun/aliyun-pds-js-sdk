/** @format */

window.addEventListener('load', function () {
  document.getElementById('btn-crc64-node').onclick = () => {
    crc64Test_node()
  }
  document.getElementById('btn-crc64-browser').onclick = () => {
    crc64Test_browser()
  }
})

async function crc64Test_browser() {
  let file = await selectFileInBrowser()
  if (!file) return
  let start = Date.now()
  let result = await window.PDS_SDK.JS_CRC64.crc64File(
    file,
    prog => {
      console.log(prog)
    },
    () => {},
  )
  console.log(`result: ${result}, 耗时：${(Date.now() - start) / 1000}s `)
}

async function crc64Test_node() {
  let p = await window.getUploadFile()
  if (!p) return

  const {fs} = window.PDS_SDK.Context

  let start = Date.now()
  let result = await window.PDS_SDK.JS_CRC64.crc64FileNode(
    p,
    prog => {
      console.log(prog)
    },
    () => {},
    {fs, crypto},
  )
  console.log(`result: ${result}, 耗时：${(Date.now() - start) / 1000}s`)
}
