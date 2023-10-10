<template>
  <TransList :items="cItems" @clearDone="clearDone">
    <template #toolbar-extra>
      <small style="color: #eee"
        >{{ items_waiting.length }}
        {{ items_running.length }}
        {{ items_done.length }}</small
      >
    </template>
  </TransList>
</template>

<script setup>
import {useBus} from '../../../../use/event'
import {inject, watch} from 'vue'
import TransList from './TransList.vue'
import {SDK} from '../../../../services/js-sdk'

const emit = defineEmits(['length'])

const dtIns = inject('dtIns')
const itemsState = inject('itemsState')
let items_waiting = $computed(() => itemsState?.waitingDownloadTasks || [])
let items_running = $computed(() => itemsState?.downloadingTasks || [])
let items_done = $computed(() => itemsState?.downloadedTasks || [])
let cItems = $computed(() => items_running.concat(items_waiting).concat(items_done))

watch(
  () => cItems.length,
  v => emit('length', v),
)
useBus('clientDownloadFiles', onDownloadFiles)

function clearDone() {
  dtIns.clearDownloadedTask()
}

async function onDownloadFiles({files, to_dir}) {
  console.log('----onDownloadFiles', files, '===>', to_dir)

  let {fs, path} = window.ClientBridge.Context
  for (let n of files) {
    if (n.type == 'folder') {
      // for folder

      let list_opt = {
        drive_id: n.drive_id,
        share_id: n.share_id,
        parent_file_id: n.file_id,
        limit: 100,
        marker: '',
      }

      do {
        let {items: arr = [], next_marker} = await SDK.listFiles(list_opt)
        list_opt.marker = next_marker || null

        await onDownloadFiles({files: arr, to_dir: path.resolve(to_dir, n.name)})
      } while (list_opt.marker)
    } else {
      // single file
      n.file = {
        name: n.name,
        size: n.size,
        path: path.resolve(to_dir, n.name),
      }
      await fs.promises.mkdir(to_dir, {recursive: true})
      dtIns.createDownloadTask(n)
    }
  }
}
</script>
