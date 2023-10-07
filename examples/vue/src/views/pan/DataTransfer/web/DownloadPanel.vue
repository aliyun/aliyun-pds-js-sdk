<template>
  <TransList :items="cItems" @clearDone="() => (items_done = [])" />
</template>

<script setup>
import {useBus} from '../../../../use/event'

import {watch} from 'vue'
import TransList from './TransList.vue'
import {SDK} from '../../../../services/js-sdk'
let items = $ref([])
let items_running = $ref([])
let items_done = $ref([])
let CON = 3
let con_running = 0

const emit = defineEmits(['length'])
let cItems = $computed(() => items_running.concat(items).concat(items_done))
watch(
  () => cItems.length,
  v => emit('length', v),
)
useBus('downloadFiles', onDownloadFiles)

async function onDownloadFiles({files}) {
  // console.log('----onDownloadFiles', files)

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
        await onDownloadFiles({files: arr})
      } while (list_opt.marker)
    } else {
      // single file

      n.file = {
        name: n.name,
        size: n.size,
      }
      let task = SDK.createDownloadTask(n, {
        state_changed(cp, state, err) {
          console.log('---state:', n.name, state, err)
          if (['success', 'cancelled'].includes(state)) {
            // end state
            // 移到 done 列表
            let ind = items_running.indexOf(task)
            if (ind != -1) {
              let end_task = items_running.splice(ind, 1)
              items_done.unshift(end_task[0])
            }
          }
          if (['success', 'error', 'stopped', 'cancelled'].includes(state)) {
            con_running--
            if (con_running < CON && items.length > 0) checkStart()
          }
        },
        progress_changed(state, progress) {
          // console.log(n.name, 'size', n.size, ' progress: ', progress)
        },
      })

      items.unshift(task)
      task.wait()
    }
  }
  if (con_running < CON && items.length > 0) checkStart()
}

async function checkStart() {
  console.log('check start:', con_running, CON)
  if (con_running < CON && items.length > 0) {
    let task = items.pop()
    items_running.push(task)
    task.start()
    con_running++
    if (con_running < CON && items.length > 0) checkStart()
  }
}
</script>
