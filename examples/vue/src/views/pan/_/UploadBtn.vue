<template>
  <a-dropdown placement="bottomLeft">
    <a-button type="primary">
      <cloud-upload-outlined />上传
      <div class="d-none">
        <input type="file" ref="fileRef" @change="onFileChange" multiple />
        <input type="file" ref="folderRef" @change="onFolderChange" multiple webkitdirectory />
      </div>
    </a-button>

    <template #overlay>
      <a-menu>
        <a-menu-item @click="upload('file')">
          <IconFile />
          上传文件
        </a-menu-item>
        <a-menu-item @click="upload('folder')">
          <IconFolder />

          上传文件夹
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup>
import {CloudUploadOutlined} from '@ant-design/icons-vue'
import {inject, ref} from 'vue'
import {IconFolder, IconFile} from './icons/index.js'

const emit = defineEmits(['uploadFiles'])
const isElectron = inject('isElectron')

let fileRef = ref()
let folderRef = ref()

function upload(type) {
  if (isElectron) {
    const prop = {
      folder: ['openDirectory', 'multiSelections', 'treatPackageAsDirectory', 'showHiddenFiles'],
      file: ['openFile', 'multiSelections', 'treatPackageAsDirectory', 'showHiddenFiles'],
    }
    let {fs, path} = window.ClientBridge.Context
    window.ClientBridge.openDialog({
      // filters: clientFileType,
      properties: prop[type],
      title: '上传',
      buttonLabel: '上传',
    }).then(res => {
      if (res.filePaths && res.filePaths.length) {
        console.log('-----upload filePaths:', res.filePaths)
        let t = res.filePaths.map(n => {
          return {
            path: n,
            type,
            name: path.basename(n),
            size: type == 'file' ? fs.statSync(n).size : 0,
          }
        })
        emit('upload4Electron', t)
      }
    })
  } else {
    type == 'file' ? fileRef.value.click() : folderRef.value.click()
  }
}

function onFileChange(e) {
  let files = e.target.files
  console.log('-----target files:', files)
  let list = []
  for (let n of files) {
    n._webkitRelativePath = n.name
    list.push(n)
  }

  emit('upload', list)

  setTimeout(() => {
    fileRef.value.value = ''
  }, 1000)
}

function onFolderChange(e) {
  let files = e.target.files
  console.log('-----target files:', files)

  emit('upload', files)
  setTimeout(() => {
    folderRef.value.value = ''
  }, 1000)
}
</script>
