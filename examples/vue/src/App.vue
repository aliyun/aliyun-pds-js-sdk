<template>
  <a-config-provider :locale="antLocale">
    <GlobalInfo>
      <a-layout style="height: 100vh; width: 100%">
        <RailBar></RailBar>
        <a-layout>
          <router-view />
        </a-layout>
      </a-layout>
    </GlobalInfo>
  </a-config-provider>
</template>

<script setup>
import {useLocale} from './use/locale'

import {useI18n} from 'vue-i18n'
import {useRouter, useRoute} from 'vue-router'
import Toast from './services/toast'
import Dialog from './services/dialog'
import RailBar from './views/_/RailBar.vue'
import GlobalInfo from './views/_/GlobalInfo.vue'

const {antLocale} = useLocale()

const {t} = useI18n()

let $route = useRoute()
let $router = useRouter()

// 暴露全局变量, 供非 setup 调用
Object.assign(window, {
  $t: t,
  $router,
  $route,
  Toast,
  Dialog,
})
</script>
