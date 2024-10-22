<template>
  <div>
    <TransList type="upload" :items="cItems" @clearDone="() => (items_done = [])" />
    <SameNameModeDialog ref="sameNameModeDialogRef" />
  </div>
</template>

<script setup>
import {ref} from 'vue'

import {bus, useBus} from '../../../../use/event'
import {SDK} from '../../../../services/js-sdk'
import {inject, onMounted, onUnmounted, watch} from 'vue'
import TransList from './TransList.vue'
import SameNameModeDialog from '../../_/SameNameModeDialog.vue'

let items = $ref([])
let items_running = $ref([])
let items_done = $ref([])
let CON = 3
let con_running = 0

let sameNameModeDialogRef = $ref(null)

const emit = defineEmits(['length'])
let cItems = $computed(() => items_running.concat(items).concat(items_done))
const currentDrive = inject('currentDrive')
watch(
  () => cItems.length,
  v => emit('length', v),
)
useBus('uploadFiles', onUploadFiles)

async function onUploadFiles({files, parent_file_id, drive_id}) {
  console.log('----onUploadFiles', files, {parent_file_id, drive_id})

  let create_folder_cache = {}

  // 1. 判断空间是否足够
  if (currentDrive.value.total_size !== -1) {
    let used_size = currentDrive.value.used_size

    for (let n of files) {
      used_size += n.size
    }
    console.log(
      'check space size:',
      used_size,
      '/',
      currentDrive.value.total_size,
      (used_size * 100) / currentDrive.value.total_size + '%',
    )
    if (used_size >= currentDrive.value.total_size) {
      window.Toast.error('没有足够的空间')
      return
    }
  }

  // 2. 检查同名文件，策略
  let {select_mode: mode, exist_files = []} = await checkNameBeforeUpload({files, parent_file_id, drive_id})

  // mode 范围: 'cancel', 'skip', 'overwrite', 'auto_rename'
  console.log('User choose mode:', mode)

  if (mode == 'cancel') return

  const exist_names = exist_files.map(n => n.name)

  // 3. 上传（如果有多级目录，先创建目录，再上传）
  for (let n of files) {
    // 如果有多级目录，先创建目录。
    let folder_id = parent_file_id
    let relativePath = n._webkitRelativePath || n.webkitRelativePath
    let pathArr = relativePath.split('/')
    if (pathArr.length > 1) {
      // 创建目录

      // 跳过
      if (mode == 'skip' && exist_names.includes(pathArr[0])) continue

      try {
        // 返回最后一级目录 id
        let dirArr = pathArr.slice(0, pathArr.length - 1)

        folder_id = await SDK.createFolders(
          dirArr,
          {parent_file_id, drive_id},
          {
            create_folder_cache,
            check_name_mode: mode,
          },
        )
      } catch (e) {
        if (e.code === 'AlreadyExists') {
          continue
        } else throw e
      }
    }

    // 上传文件 任务

    // 跳过
    if (mode == 'skip' && exist_names.includes(n.name)) continue

    let task = SDK.createUploadTask(
      {
        file: n,
        parent_file_id: folder_id,
        drive_id,
      },
      {
        verbose: true,
        check_name_mode: mode, // refuse, auto_rename, overwrite, skip
        ignore_rapid: Global.ignore_rapid, // 忽略秒传，测试用
        parallel_upload: Global.parallel_upload, // 并发上传
        state_changed(cp, state, err) {
          console.log('---state:', n.name, state, err)
          if (state == 'error' && err.code == 'AlreadyExists' && cp.is_skip) {
            let ind = items_running.indexOf(task)
            items_running.splice(ind, 1)
          }
          if (['success', 'rapid_success', 'cancelled'].includes(state)) {
            let ind = items_running.indexOf(task)
            let end_task = items_running.splice(ind, 1)

            // 移到 done 列表
            items_done.unshift(end_task[0])
          }

          if (['success', 'rapid_success'].includes(state)) {
            // end state
            bus.emit('refreshPan')
            bus.emit('refreshDrive')
          }

          if (['success', 'rapid_success', 'error', 'stopped', 'cancelled'].includes(state)) {
            con_running--
            if (con_running < CON && items.length > 0) checkStart()
          }
        },
        progress_changed(state, progress) {
          console.log(n.name, 'size', n.size, ' progress: ', progress)
        },
      },
    )
    items.unshift(task)
    task.wait()
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
// 上传前，检查第一级同名文件，策略
async function checkNameBeforeUpload({files, parent_file_id, drive_id}) {
  let select_mode = 'overwrite'
  let t = []
  // 去重
  let m = {}
  for (let n of files) {
    let relativePath = n._webkitRelativePath || n.webkitRelativePath
    let pathArr = relativePath.split('/')
    if (pathArr.length > 1) {
      // 有目录，取第一级目录即可
      if (m[pathArr[0]]) continue
      m[pathArr[0]] = 1
      t.push({
        drive_id,
        parent_file_id,
        name: pathArr[0],
        type: 'folder',
      })
    } else {
      // 文件
      t.push({
        drive_id,
        parent_file_id,
        name: n.name,
        type: 'file',
      })
    }
  }

  // 判断是否存在
  let {exist_files = [], not_exist_files = []} = await SDK.batchCheckFilesExist(t)
  if (exist_files.length > 0) {
    // 只要有一个存在 都询问
    select_mode = await sameNameModeDialogRef.show()
  }
  // 'cancel', 'skip', 'overwrite', 'auto_rename'
  return {select_mode, exist_files}
}
</script>
