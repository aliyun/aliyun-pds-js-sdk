<template>
  <span>
    <a-dropdown placement="bottomLeft">
      <a-button> <plus-outlined />新建 </a-button>

      <template #overlay>
        <a-menu>
          <a-menu-item @click="() => createFolderRef.show({...current_path})">
            <IconFolder />
            <span class="ml-10">新建文件夹</span>
          </a-menu-item>

          <a-menu-divider />

          <a-menu-item v-for="item in items" @click="() => createFileRef.show({...item, ...current_path})">
            <component :is="item.icon"></component>
            <span class="ml-10">{{ item.label }}</span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <CreateDialog
      action="createFolder"
      ref="createFolderRef"
      title="新建文件夹"
      defaultValue="新建文件夹"
      @success="item => emit('createFolderSuccess', item)"
    />
    <CreateDialog action="saveFileContent" ref="createFileRef" @success="item => emit('createFileSuccess', item)" />
  </span>
</template>

<script setup>
import {PlusOutlined} from '@ant-design/icons-vue'
import {ref, inject, h} from 'vue'
import CreateDialog from './CreateDialog.vue'
import {IconFolder, IconWord, IconPpt, IconExcel, IconFile} from './icons/index.js'

const emit = defineEmits(['createFolderSuccess', 'createFileSuccess'])

const items = ref([
  {
    type: 'word',
    ext: '.docx',
    label: 'Word',
    title: '新建文档',
    defaultValue: '新建文档',
    icon: () => h(IconWord),
  },
  {
    type: 'ppt',
    ext: '.pptx',
    label: 'Powerpoint',
    title: '新建演示文稿',
    defaultValue: '新建演示文稿',
    icon: () => h(IconPpt),
  },
  {
    type: 'excel',
    ext: '.xlsx',
    label: 'Excel',
    title: '新建工作簿',
    defaultValue: '新建工作簿',
    icon: () => h(IconExcel),
  },
  {
    type: 'txt',
    ext: '.txt',
    label: 'Text',
    title: '新建文本',
    defaultValue: '新建文本',
    icon: () => h(IconFile),
  },
])

const createFolderRef = ref()
const createFileRef = ref()

const current_path = inject('current_path')
</script>
