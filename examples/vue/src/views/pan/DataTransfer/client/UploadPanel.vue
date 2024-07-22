<template>
  <div>
    <TransList type="upload" :items="cItems" @clearDone="clearDone">
      <template #toolbar-extra>
        <small style="color: #eee"
          >{{ items_waiting.length }}
          {{ items_running.length }}
          {{ items_done.length }}</small
        >
      </template>
    </TransList>

    <SameNameModeDialog ref="sameNameModeDialogRef" />
  </div>
</template>

<script setup>
import {bus, useBus} from '../../../../use/event'
import {SDK} from '../../../../services/js-sdk'
import {inject, watch} from 'vue'
import TransList from './TransList.vue'
import SameNameModeDialog from '../../_/SameNameModeDialog.vue'

let sameNameModeDialogRef = $ref(null)

const emit = defineEmits(['length'])
const currentDrive = inject('currentDrive')
const dtIns = inject('dtIns')
const itemsState = inject('itemsState')

let items_waiting = $computed(() => itemsState?.waitingUploadTasks || [])
let items_running = $computed(() => itemsState?.uploadingTasks || [])
let items_done = $computed(() => itemsState?.uploadedTasks || [])
let cItems = $computed(() => items_running.concat(items_waiting).concat(items_done))

watch(
  () => cItems.length,
  v => emit('length', v),
)
useBus('clientUploadFiles', onUploadFiles)

function clearDone() {
  dtIns.clearUploadedTask()
}

async function onUploadFiles({files, parent_file_id, drive_id}) {
  console.log('----onUploadFiles', files, {parent_file_id, drive_id})
  let {fs, path} = window.ClientBridge.Context
  // 1. 判断空间是否足够 ()
  if (currentDrive.value.total_size !== -1) {
    let used_size = currentDrive.value.used_size || 0

    for (let n of files) {
      if (n.type == 'folder') continue

      used_size += fs.statSync(n.path).size
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
  console.log('User choose mode:', mode, exist_files)

  if (mode == 'cancel') return

  const exist_names = exist_files.map(n => n.name)

  // 3. 上传（如果有多级目录，先创建目录，再上传）
  let create_folder_cache = {}

  for (let n of files) {
    // 跳过
    if (mode == 'skip' && exist_names.includes(n.name)) continue

    await createFolderTasks({
      file: n,
      parent_file_id,
      drive_id,
      relativePaths: [n.name],
      check_name_mode: mode,
      create_folder_cache,
    })

    bus.emit('refreshPan')
    bus.emit('refreshDrive')
  }
  // if (con_running < CON && items.length > 0) checkStart()
}

async function createFolderTasks({
  file,
  parent_file_id,
  drive_id,
  relativePaths = [],
  check_name_mode,
  create_folder_cache,
}) {
  if (file.type == 'folder') {
    let folder_id

    // 目录
    try {
      // 返回最后一级目录 id
      // console.log('---create folder', parent_file_id, relativePaths)
      folder_id = await SDK.createFolders(
        relativePaths,
        {parent_file_id, drive_id},
        {
          create_folder_cache,
          check_name_mode,
        },
      )
      // console.log('--- folder_id',folder_id)

      // 递归
      let {fs, path} = window.ClientBridge.Context
      let arr = await fs.promises.readdir(file.path)

      for (let n of arr) {
        const file_path = path.join(file.path, n)
        let fstat = fs.statSync(file_path)
        const file_type = fstat.isDirectory() ? 'folder' : 'file'
        const file_size = fstat.isDirectory() ? 0 : fstat.size

        await createFolderTasks({
          file: {name: n, type: file_type, path: file_path, size: file_size},
          parent_file_id: folder_id,
          drive_id,
          relativePaths: [n],
          check_name_mode,
          create_folder_cache,
        })
      }
    } catch (e) {
      if (e.code === 'AlreadyExists') {
      } else throw e
    }
  } else {
    // 文件
    dtIns.createUploadTask({file, parent_file_id, drive_id, check_name_mode, hash_name: Global.data_hash_name})
  }
}

// 上传前，检查第一级同名文件，策略
async function checkNameBeforeUpload({files, parent_file_id, drive_id}) {
  let select_mode = 'overwrite'
  let t = []
  for (let n of files) {
    if (n.type == 'folder') {
      // 有目录，取第一级目录即可
      t.push({
        drive_id,
        parent_file_id,
        name: n.name,
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
