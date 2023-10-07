<template>
  <div @click="selected = []">
    <section class="px-20 py-10 d-flex justify-between">
      <AddressBar v-model="current_path" />

      <div class="flex-1"></div>
      <div class="pt-4" @click.stop>
        ({{ selected.length }}<span>/</span>{{ items.length }}<span v-if="has_next">+</span>)
        <a-checkbox v-model:checked="selected_all" :indeterminate="indeterminate" @change="onCheckAllChange">
          全选/全不选
        </a-checkbox>
      </div>
      <SwitchViewBtn v-model="viewType" />
    </section>

    <div class="d-flex align-center justify-start pb-10 px-20">
      <div>
        <UploadBtn class="mr-2" @upload="onUploadFiles" @upload4Electron="onClientUploadFiles" />
        <CreateBtn class="mx-2" @createFolderSuccess="refresh" @createFileSuccess="refresh" />
      </div>

      <ActionBtnGroup
        :paste-items="paste_items"
        :selected-items="items.filter(n => selected.includes(n[ROW_KEY]))"
        @action="(key, items) => onAction(key, items)"
      />

      <div class="flex-1"></div>
      <div>
        <a-button class="mr-2" @click.stop="refresh()">
          <ReloadOutlined />
        </a-button>
      </div>
    </div>

    <DropZone @drop="onDrop" @dropList="onUploadFiles" @dropList4Electron="onClientUploadFiles">
      <Loading v-if="loading" style="height: 200px"> </Loading>

      <div v-else-if="items.length > 0" style="user-select: none">
        <section
          class="px-14 py-10"
          v-scroll-bottom="() => has_next && listFiles()"
          style="height: calc(100vh - 145px); overflow: auto"
        >
          <!-- 视图: 方块 -->
          <div v-show="viewType == 'block'" class="block-item-container">
            <div class="block-item-wrap" v-for="item in items" :key="item.file_id">
              <ItemBlock
                v-model:selected="selected"
                @select="e => onItemSelect(item, e)"
                @open="() => onItemOpen(item)"
                :item="item"
                :row-key="ROW_KEY"
              />
            </div>
          </div>

          <!-- 视图: 列表 -->
          <section v-show="viewType == 'line'" class="px-6">
            <div class="line-item-wrap" v-for="item in items" :key="item.file_id">
              <ItemLine
                v-model:selected="selected"
                @select="e => onItemSelect(item, e)"
                @open="() => onItemOpen(item)"
                :item="item"
                :row-key="ROW_KEY"
              />
            </div>
          </section>

          <!-- 载入下一页 -->
          <div v-if="has_next" class="p-10 text-center">
            <a-spin></a-spin>
            <span class="ml-6 grey-text">载入下一页</span>
          </div>
          <div v-else class="p-10 text-center">
            <small class="grey-text">- 没有更多了 -</small>
          </div>
        </section>
      </div>

      <!-- 暂无数据 -->
      <div v-else style="height: calc(100vh - 145px)">
        <NoData style="height: 200px" />
      </div>
    </DropZone>

    <CreateDialog
      action="renameFile"
      ref="renameFileRef"
      title="重命名"
      defaultValue="重命名"
      @success="item => onRenameFileSuccess(item)"
    />
  </div>
</template>

<script setup>
import {computed, reactive, provide, ref, toRaw, watch} from 'vue'
import UploadBtn from './_/UploadBtn.vue'
import CreateBtn from './_/CreateBtn.vue'
import ActionBtnGroup from './_/ActionBtnGroup.vue'
import {SDK} from '../../services/js-sdk'
import ItemBlock from './_/ItemBlock.vue'
import ItemLine from './_/ItemLine.vue'
import SwitchViewBtn from './_/SwitchViewBtn.vue'
import AddressBar from './_/AddressBar.vue'
import NoData from './_/NoData.vue'
import Loading from './_/Loading.vue'
import DropZone from './_/DropZone.vue'
import {bus, useBus} from '../../use/event'
import {debounce} from 'lodash'
import Toast from '../../services/toast'
import CreateDialog from './_/CreateDialog.vue'
import {ReloadOutlined} from '@ant-design/icons-vue'

const props = defineProps(['driveId', 'folderId'])

const ROW_KEY = 'file_id'

const current_path = reactive({
  drive_id: props.driveId,
  parent_file_id: props.folderId || 'root',
})

const viewType = ref(localStorage.viewType || 'block') // block line
watch(
  () => viewType.value,
  v => (localStorage.viewType = v),
)

const items = ref([])
const loading = ref(false)
const loading_next = ref(false)
const has_next = ref(false)

const list_opt = {limit: 100, marker: ''}

const paste_type = ref(false)
const paste_items = ref([])

const renameFileRef = ref()

//************** 选中 **************** */
const selected = ref([]) // [file_id, file_id2,...]
const selected_all = ref(false)
const indeterminate = ref(false)
let last_select_index = 0

function onCheckAllChange(e) {
  selected.value = e.target.checked ? items.value.map(n => n[ROW_KEY]) : []
  indeterminate.value = false
}

watch(
  () => selected.value,
  v => {
    indeterminate.value = v.length > 0 && v.length < items.value.length
    selected_all.value = v.length > 0 && v.length === items.value.length
  },
  {
    deep: true,
  },
)

// 单击选中
function onItemSelect(item, e) {
  // console.log(e.metaKey, e.ctrlKey, e.shiftKey)
  if (e.shiftKey) {
    // shift 多选
    let current_index = items.value.indexOf(item)

    let st = Math.min(last_select_index, current_index)
    let et = Math.max(last_select_index, current_index)

    items.value.slice(st, et + 1).forEach(n => {
      let has = selected.value.includes(n.file_id)
      if (!has) selected.value.push(n.file_id)
    })
  } else {
    let ind = selected.value.indexOf(item[ROW_KEY])
    if (ind != -1) selected.value.splice(ind, 1)
    else selected.value.push(item[ROW_KEY])
  }
  last_select_index = items.value.indexOf(item)
}
//****************************** */

const refresh = debounce(_refresh, 300)

provide('current_path', current_path)

watch(
  () => [props.driveId, props.folderId],
  () => {
    init()
  },
)

useBus('refreshPan', () => {
  refresh()
})

init()
function init() {
  if (!props.driveId) return
  current_path.drive_id = props.driveId
  current_path.parent_file_id = props.folderId || 'root'

  selected.value = []
  refresh()
}

async function _refresh() {
  if (loading.value) return
  loading.value = true

  items.value = []
  list_opt.marker = ''
  has_next.value = false
  last_select_index = 0

  selected.value = []
  paste_items.value = []
  paste_type.value = ''

  try {
    await listFiles()
  } catch (err) {
    console.warn(err)
  } finally {
    loading.value = false
  }
}
async function listFiles() {
  console.log('------listFiles---------')

  list_opt.drive_id = current_path.drive_id
  list_opt.parent_file_id = current_path.parent_file_id
  loading_next.value = true
  let {items: arr = [], next_marker} = await SDK.listFiles(list_opt)

  items.value = items.value.concat(arr)
  list_opt.marker = next_marker || null
  loading_next.value = false

  has_next.value = !!next_marker
}

async function gotoPath(file_id) {
  $router.push({name: 'folder', params: {driveId: current_path.drive_id, folderId: file_id}})
}

// 双击打开
function onItemOpen(item) {
  if (item.type == 'folder') gotoPath(item.file_id)
  else if (item.category == 'doc') {
    previewDoc(item)
  } else {
    window.Toast.warning('暂不支持该文件格式')
  }
}
// 文档预览
function previewDoc(item) {
  // $router.push({name: 'doc', params: {filePath: base64(item.dir + item.name)}})
}

// Electron 客户端上传文件
function onClientUploadFiles(files) {
  console.log('handle client upload files:', files, current_path)
  bus.emit('clientUploadFiles', {files, ...current_path})
}

// 上传文件
function onUploadFiles(files) {
  console.log('handle upload files:', files, current_path)
  bus.emit('uploadFiles', {files, ...current_path})
}

// 下载文件
async function handleDownloadFile(files) {
  let opt = {files}
  console.log('handle download files:', opt)
  if (window.ClientBridge) {
    // for electron client
    let res = await window.ClientBridge.openDialog({
      properties: ['openDirectory', 'treatPackageAsDirectory', 'showHiddenFiles'],
      title: '下载',
      buttonLabel: '下载',
    })

    if (res.filePaths && res.filePaths.length) {
      bus.emit('clientDownloadFiles', {...opt, to_dir: res.filePaths[0]})
    }
  } else {
    // for web
    bus.emit('downloadFiles', opt)
  }
}

// 复制
function handleCopyFiles(items) {
  paste_type.value = 'copy'
  paste_items.value = [...items]
  selected.value = []
}
// 剪切
function handleCutFiles(items) {
  paste_type.value = 'cut'
  paste_items.value = [...items]
  selected.value = []
}
// 重命名
function handleRenameFile(item) {
  const opt = {
    defaultValue: item.name,
    file_id: item.file_id,
    drive_id: item.drive_id,
    share_id: item.share_id,
    parent_file_id: item.parent_file_id,
  }
  renameFileRef.value.show(opt)
}
// 重命名成功
function onRenameFileSuccess(item) {
  Toast.success('重命名成功')
  let ind = items.value.findIndex(n => n.file_id == item.file_id)
  items.value.splice(ind, 1, item)
  // selected.value=[]
}

/**
 * 粘贴
 * @param {*} type  copy, cut
 * @param {*} items
 */
async function handlePasteFiles(type, items) {
  if (type == 'copy') {
    // 复制，粘贴
    let {errorItems = []} = await SDK.batchCopyFiles(items, {
      to_parent_file_id: current_path.parent_file_id,
      to_drive_id: current_path.drive_id,
    })

    if (errorItems.length > 0) {
      Toast.error('失败个数:' + errorItems.length)
      throw new Error('失败个数:' + errorItems.length)
    } else {
      refreshAll()
    }
  } else {
    // 剪切，粘贴
    let {errorItems = []} = await SDK.batchMoveFiles(items, {
      to_parent_file_id: current_path.parent_file_id,
      to_drive_id: current_path.drive_id,
    })

    if (errorItems.length > 0) {
      Toast.error('失败个数:' + errorItems.length)
      throw new Error('失败个数:' + errorItems.length)
    } else {
      refreshAll()
    }
  }
  paste_type.value = ''
  paste_items.value = []
  selected.value = []
}

function refreshAll() {
  refresh()
  ;(async () => {
    await new Promise(a => setTimeout(a, 3000))
    bus.emit('refreshDrive')
  })()
  window.Toast.success('操作成功')
}

// 删除文件
async function handleDeleteFiles(items) {
  let {successItems = [], errorItems = []} = await SDK.batchDeleteFiles(items, true)
  if (errorItems.length > 0) {
    window.Dialog.info({
      title: '以下文件删除失败',
      content: errorItems.map(n => n.name).join('<br/>'),
    })
  }

  if (successItems.length > 0) {
    refreshAll()
  }
}

function onDrop(items) {
  console.log('on drop items(kind=="file"):', items)
}

// 其他操作
async function onAction(key, items) {
  let arr = toRaw(items).map(n => toRaw(n))
  console.log('Action:', key, arr)

  switch (key) {
    case 'del':
      await handleDeleteFiles(arr)
      break

    case 'copy':
      handleCopyFiles(arr)
      break
    case 'cut':
      handleCutFiles(arr)
      break
    case 'paste':
      await handlePasteFiles(paste_type.value, paste_items.value)
      break
    case 'rename':
      await handleRenameFile(arr[0])
      break
    case 'cancel':
      paste_type.value = ''
      paste_items.value = []
      break

    case 'download':
      await handleDownloadFile(arr)
      break
    default:
      window.Toast.warning('暂不支持')
      break
  }
}
</script>
