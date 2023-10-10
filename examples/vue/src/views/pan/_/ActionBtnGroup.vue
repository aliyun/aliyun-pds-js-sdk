<template>
  <a-space class="ml-10" :size="4">
    <a-button :class="item.class" @click.stop="handleClick(item)" v-for="item in items" :key="item.key">{{
      item.label
    }}</a-button>
  </a-space>
</template>

<script setup>
import {computed, ref} from 'vue'

const props = defineProps(['selectedItems', 'pasteItems'])
const emit = defineEmits(['action'])
const select_items = computed(() => props.selectedItems)
const paste_items = computed(() => props.pasteItems)

const items = computed(() => {
  let arr = [
    {label: '粘贴', key: 'paste', class: 'blue-outline', hide: paste_items.value.length == 0},
    {label: '取消', key: 'cancel', class: 'dashed', hide: paste_items.value.length == 0},
    {label: '剪切', key: 'cut', hide: paste_items.value.length !== 0 || select_items.value.length == 0},
    {label: '复制', key: 'copy', hide: paste_items.value.length !== 0 || select_items.value.length == 0},
    {label: '重命名', key: 'rename', hide: paste_items.value.length !== 0 || select_items.value.length !== 1},
    {label: '下载', key: 'download', hide: select_items.value.length == 0},
    {label: '删除', key: 'del', hide: select_items.value.length == 0},
  ]

  return arr.filter(n => !n.hide)
})

function handleClick(item) {
  emit('action', item.key, select_items.value)
}
</script>

<style>
.blue-outline {
  border: 1px solid rgb(95, 115, 243);
}
.dashed {
  border-style: dashed;
}
</style>
