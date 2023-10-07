<template>
  <a-layout-sider v-if="$route.name != 'home'" collapsed collapsedWidth="50">
    <a-menu theme="dark" mode="vertical" selectable :selectedKeys="[selected_key]">
      <a-menu-item key="pan" @click="$router.push('/pan')">
        <FolderOutlined />
        <span>云盘</span>
      </a-menu-item>
      <a-menu-item key="calc" @click="$router.push('/calc')">
        <ExceptionOutlined />
        <span>计算</span>
      </a-menu-item>
    </a-menu>
  </a-layout-sider>
</template>
<script setup>
import {computed} from 'vue'
import {FolderOutlined, ExceptionOutlined} from '@ant-design/icons-vue'

let selected_key = computed(() => {
  switch ($route.name) {
    case 'pan_entry':
    case 'pan':
    case 'folder':
    case 'doc':
      return 'pan'
    case 'calc':
      return 'calc'
  }
})
</script>
