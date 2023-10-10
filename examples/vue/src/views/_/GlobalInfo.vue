<template>
  <div v-if="loading" class="d-flex align-center justify-center" style="height: 200px">
    <!-- loading -->
    <a-spin> </a-spin>
  </div>
  <div v-else>
    <slot></slot>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {getToken} from '../../services/auth'
import {init} from '../../services/js-sdk'
import tokenStore from '../../services/token-store'

const loading = ref(false)

created()
async function created() {
  loading.value = true

  let info = tokenStore.get()

  if (!info?.access_token) {
    await getToken()
    await init()
  }

  loading.value = false
}
</script>
