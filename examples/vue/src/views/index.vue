<!-- @format -->

<template>
  <div>
    <h1>并发上传（标准模式）</h1>
    <input type="file" id="f1" />
  </div>
</template>
<script setup>
import {onMounted} from 'vue'
const  {PDSClient, formatSize, JS_CRC64, JS_SHA1} = window.PDS_SDK

const path_type = 'StandardMode'
const {api_endpoint, auth_endpoint, drive_id} = window.Config.domains[path_type]

window.JS_CRC64 = JS_CRC64
window.JS_SHA1 = JS_SHA1

onMounted(async () => {
  let client = await getPDSClient(path_type)
  console.log(client)

  window.client = client
  document.getElementById('f1').onchange = async e => {
    let file = e.target.files?.[0]
    if (!file) return

    console.log('--------file name', file.name)
    console.log('--------file path', file.path)
    console.log('--------file size', file.size)

    client.on('error', (error, req_opt) => {
      console.log('-----------err', error)
    })

    let task
    try {
      let cp = await client.uploadFile(
        file,
        {drive_id},
        {
          verbose: true,
          parallel_upload: true,
          ignore_rapid: true,
          onReady(t) {
            task = t
          },
          onProgress(status, prog) {
            console.log('onProgress:', status, prog + '%', formatSize(task.speed) + '/s')
          },
          onStatusChange(cp, status, err) {
            console.log('onStatusChange:', status, err)
          },
        },
      )
      console.log('上传成功', cp)
    } catch (e) {
      console.log('上传失败', e.message)
    }
  }
})

async function getToken(path_type) {
  return await fetch(`/${path_type}-token.json`).then(r => r.json())
}
async function getPDSClient(path_type) {
  return new PDSClient({
    token_info: await getToken(path_type),
    api_endpoint,
    auth_endpoint,
    path_type,
  })
}
</script>
