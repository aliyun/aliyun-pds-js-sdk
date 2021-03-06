/** @format */

window.addEventListener('load', function () {
  document.getElementById('btn-crc64-node').onclick = () => {
    crc64Test_node()
  }
  document.getElementById('btn-crc64-node-process').onclick = () => {
    crc64Test_node(true)
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

async function crc64Test_node(useProcess) {
  let p = await window.getUploadFile()
  if (!p) return

  let start = Date.now()
  let result = await window.PDS_SDK.JS_CRC64[useProcess ? 'crc64FileNodeProcess' : 'crc64FileNode'](
    p,
    prog => {
      console.log(prog)
    },
    () => {},
    window.PDS_SDK.Context,
  )
  console.log(
    `${useProcess ? '使用 node 子进程计算 crc64,' : ''} result: ${result}, 耗时：${(Date.now() - start) / 1000}s`,
  )
}
