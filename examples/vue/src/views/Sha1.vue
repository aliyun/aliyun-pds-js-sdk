<template>
  
  <div>
    <h1>测试计算文件 sha1</h1>

    <input type="file" id="f1" />
  </div> 

</template>

<script setup>
import {onMounted} from 'vue'
import { JS_SHA1} from '../../../..'

onMounted(()=>{
  document.getElementById('f1').onchange = async e => {
    let file = e.target.files?.[0]
    if (!file) return

    console.log('--------file name', file.name)
    console.log('--------file path', file.path)
    console.log('--------file size', file.size)
    
    let d = Date.now()
    let x = await JS_SHA1.calcFileSha1(file,0,prog=>console.log(prog),null)
    console.log(x, Date.now()-d)
  }
})

</script>
