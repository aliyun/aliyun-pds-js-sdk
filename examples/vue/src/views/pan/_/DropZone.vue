<template>
  <div
    class="drop-zone"
    @dragenter="dragenter($event)"
    @dragleave="stop($event)"
    @dragover="stop($event)"
    @drop="stop($event)"
  >
    <div
      v-if="!disabled"
      :class="['status-' + status, {'forbidden-child-pointer-events': forbiddenChildPointerEvents}]"
      @dragenter="stop($event)"
      @dragleave="dragleave($event)"
      @dragover="stop($event)"
      @drop="drop($event)"
    >
      <div class="hint text-center">
        <drag-outlined />
        <!-- <vertical-align-top-outlined /> -->
        <span class="ml-2">{{ cText }}</span>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<style lang="less">
.drop-zone {
  position: relative;

  .status-normal {
    display: none;
  }
  .status-dragging {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 3px dashed #1a80f5;
    background-color: rgba(26, 128, 245, 0.04);
    box-sizing: border-box;
    display: block;
    z-index: 5;
  }
  .hint {
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    // width: 200px;
    height: 48px;
    line-height: 48px;
    font-size: 14px;
    background: #1a80f5;
    box-shadow: 0 2px 4px 0 rgba(4, 4, 4, 0.15);
    border-radius: 4px;
    background-color: #1a80f5;
    color: #fff;

    padding: 0 20px;
  }
  .forbidden-childe-pointer-events * {
    pointer-events: none;
  }
}
</style>

<script setup>
import {inject} from 'vue'
import {DragOutlined} from '@ant-design/icons-vue'
const props = defineProps({
  disabled: Boolean,
  ignoreHiddenFiles: Boolean,
  recursive: {
    type: Boolean,
    default: true,
  },
  text: {
    type: String,
    default: '拖放到这里',
  },
})
const emit = defineEmits(['drop', 'dropList4Electron', 'dropList', 'error'])

let isElectron = inject('isElectron')
const cDisabled = $computed(() => props.disabled)
const cText = $computed(() => props.text)
const cIgnoreHiddenFiles = $computed(() => props.ignoreHiddenFiles)
const cRecursive = $computed(() => props.recursive)

let status = $ref('normal')
let forbiddenChildPointerEvents = $ref(false)

function dragenter(e) {
  // effectAllowed： 火狐默认 uninitialized，  webkit 默认 all
  if (cDisabled || !['uninitialized', 'all'].includes(e.dataTransfer.effectAllowed)) return
  stop(e)
  status = 'dragging'
}
function dragleave(e) {
  stop(e)
  status = 'normal'
  forbiddenChildPointerEvents = false
}

function drop(e) {
  stop(e)
  status = 'normal'
  let fileList = getFileList(e)
  if (fileList.length === 0) return
  emit('drop', fileList)
  if (!cRecursive) return
  handleDataTransfer(fileList, (files, files4Electron) => {
    if (files) {
      emit('dropList', files)
    }
    if (files4Electron) {
      emit('dropList4Electron', files4Electron)
    }
  })
}
function stop(e) {
  e.preventDefault()
  e.stopPropagation()
  forbiddenChildPointerEvents = true
}

// 变成数组
function getFileList(e) {
  const arr = e.dataTransfer.items
  const files = []
  // FileList 变成 File[]
  Array.prototype.forEach.call(arr, n => files.push(n))
  return files.filter(n => n.kind === 'file')
}

async function handleDataTransfer(files, listFn) {
  if (files.length === 0) {
    emit('error', new Error('当前浏览器不支持'))
    return
  }

  try {
    if (isElectron) {
      getFileListByDropEvent4Electron(files, listFn)
    } else {
      getFileListByDropEvent(files, listFn)
    }
  } catch (e) {
    listFn(files)
  }
}
async function getFileListByDropEvent4Electron(items, listFn) {
  const arr = []

  for (const item of items) {
    const file = item.getAsFile()
    const ent = item.webkitGetAsEntry ? item.webkitGetAsEntry() : item

    arr.push({
      name: file.name,
      type: ent.isFile ? 'file' : 'folder',
      path: file.path,
      size: file.size,
    })
  }

  listFn(null, arr)
}

async function getFileListByDropEvent(items, listFn) {
  const entries = []

  for (const item of items) {
    const ent = item.webkitGetAsEntry ? item.webkitGetAsEntry() : item
    if (ent) {
      entries.push(ent)
    }
  }
  try {
    window.console.time('entries')
    const resultList = await travEntries(entries, null, listFn)
    window.console.timeEnd('entries') // 34647.1669921875 ms
    window.console.log(resultList.length, 'files') // 102505
    listFn(resultList)
  } catch (e) {
    window.Toast.error('请使用点击上传按钮上传文件')
    window.console.error('Failed to read file(s)/folder(s)', e)
  }

  /// //////////////////////////////////////////////////////
  // function checkEnd() {
  //   c++;
  //   window.console.log("c/len:", c, len);
  //   if (c == len) {
  //     listFn(fileList);
  //   }
  // }
  async function travEntries(itemList, pp) {
    pp = pp || ''
    let fileList = []
    for (const item of itemList) {
      if (item.isFile) {
        const file = await getFile(item)
        if (cIgnoreHiddenFiles && file.name.substring(0, 1) === '.') {
          continue
        }
        file._webkitRelativePath = pp + file.name
        fileList.push(file)
        // checkEnd();
      } else if (item.isDirectory) {
        const dirReader = item.createReader()
        // 每次最多读 100 条，可以多次读，直到 entries.length==0
        let hasMore = false
        do {
          hasMore = false
          const datas = await readEntries(dirReader)

          if (datas.length > 0) {
            const subFileList = await travEntries(datas, `${pp + item.name}/`)

            fileList = fileList.concat(subFileList)
            hasMore = true
          }
          // checkEnd();
        } while (hasMore)
      } else {
        // windows,不支持目录上传，只支持文件上传
        fileList.push(item)
        // checkEnd();
      }
    }
    return fileList
  }
  /// ///////////
  function getFile(item) {
    return new Promise((res, rej) => {
      item.file(
        file => res(file),
        e => {
          window.console.error('getFile', e)
          rej(e)
        },
      )
    })
  }
  function readEntries(dirReader) {
    return new Promise((res, rej) => {
      dirReader.readEntries(
        list => res(list),
        e => {
          window.console.error('readEntries', e)
          rej(e)
        },
      )
    })
  }
}
</script>
