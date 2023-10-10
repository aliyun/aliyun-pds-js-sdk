<template>
  <a-layout class="h-100">
    <a-page-header class="page-bar" @back="() => $router.push('/')">
      <template #title>云盘Demo </template>
      <template #subTitle>
        <UsedSizeBar
          style="width: 180px"
          v-if="currentDrive"
          :used="currentDrive.used_size"
          :total="currentDrive.total_size"
        ></UsedSizeBar>
      </template>
      <template #extra>
        <DriveSelector @select="v => (currentDrive = v)" />
      </template>
      <template #backIcon>
        <home-outlined />
      </template>
    </a-page-header>
    <a-layout-content class="page-content">
      <FileExplorer :driveId="drive_id" :folderId="folder_id"></FileExplorer>
    </a-layout-content>
    <ClientDataTransfer v-if="isElectron" />
    <WebDataTransfer v-else />
  </a-layout>
</template>

<script setup>
import {HomeOutlined} from '@ant-design/icons-vue'
import FileExplorer from './FileExplorer.vue'
import DriveSelector from './_/DriveSelector.vue'
import WebDataTransfer from './DataTransfer/web/index.vue'
import ClientDataTransfer from './DataTransfer/client/index.vue'
import {watch, ref, provide} from 'vue'
import UsedSizeBar from './_/UsedSizeBar.vue'
import {useBus} from '../../use/event'
import Drive from '../../services/drive'
let {driveId, folderId} = $route.params
let drive_id = $ref(driveId)
let folder_id = $ref(folderId)
let currentDrive = ref(null)

let isElectron = !!window.ClientBridge?.DataTransfer
console.log('isElectron', isElectron)

provide('isElectron', isElectron)
provide('currentDrive', currentDrive)

useBus('refreshDrive', async () => {
  currentDrive.value = await Drive.get({drive_id})
})

watch(
  () => currentDrive.value?.drive_id,
  (v, a) => {
    if (v) drive_id = v
  },
)
watch(
  () => $route.path,
  v => {
    init()
  },
)
init()
function init() {
  drive_id = $route.params.driveId
  folder_id = $route.params.folderId
}
</script>
