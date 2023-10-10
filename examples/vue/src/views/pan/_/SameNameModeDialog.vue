<template>
  <a-modal v-model:open="visible" @close="close" @cancel="close">
    <template #title> 检查到同名文件 </template>
    是否继续操作？
    <template #footer>
      <a-button @click.stop="waitUntilCall('skip')">跳过</a-button>
      <a-button @click.stop="waitUntilCall('overwrite')">覆盖</a-button>
      <a-button @click.stop="waitUntilCall('auto_rename')" type="primary" autofocus>保留两者</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import {ref} from 'vue'
const visible = ref(false)

let waitUntilCall
async function show() {
  visible.value = true

  return await new Promise(resolve => {
    waitUntilCall = v => {
      resolve(v)
      visible.value = false
    }
  })
}
function close() {
  waitUntilCall('cancel')
}

defineExpose({
  show,
})
</script>
