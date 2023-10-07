<template>
  <a-card
    bordered
    class="item-line relative px-10 pt-0 my-8"
    :class="{'item-line-selected': checked}"
    hoverable
    :bodyStyle="{padding: '12px', display: 'flex', alignItems: 'center'}"
    @dblclick.stop="$emit('open')"
    @click.stop="e => $emit('select', e)"
  >
    <div @click.stop="$emit('open')" class="d-flex align-center">
      <!-- 右上角，checkbox -->
      <a-checkbox v-model:checked="checked" @click.stop></a-checkbox>

      <!-- 图标: 目录 -->
      <a-avatar v-if="cItem.type == 'folder'" :size="iconSize" style="background: #f7f7f7">
        <template #icon>
          <IconFolder />
        </template>
      </a-avatar>
      <!-- 图标: 图片 -->
      <a-avatar v-else-if="cItem.category == 'image'" :size="iconSize" :src="cItem.url"></a-avatar>
      <!-- 图标: doc -->
      <a-avatar v-else-if="cItem.category == 'doc'" :size="iconSize" style="background: #eee">
        <template #icon>
          <IconWord v-if="/doc|docx|dot|wps|wpt|dotx|docm|dotm$/.test(cItem.file_extension)" />
          <IconPpt v-else-if="/ppt|pptx|pptm|ppsx|ppsm|pps|potx|potm|dpt|dps$/.test(cItem.file_extension)" />
          <IconExcel v-else-if="/et|xls|xlt|xlsx|xlsm|xltx|xltm$/.test(cItem.file_extension)" />
          <IconPdf v-else-if="/pdf$/.test(cItem.file_extension)" />
          <IconFile v-else />
        </template>
      </a-avatar>
      <!-- 图标 video -->
      <a-avatar v-else-if="cItem.category == 'video'" :size="iconSize" style="background: #eee">
        <template #icon>
          <IconVideo />
        </template>
      </a-avatar>
      <a-avatar v-else-if="cItem.category == 'audio'" :size="iconSize" style="background: #eee">
        <template #icon>
          <IconAudio />
        </template>
      </a-avatar>

      <!-- 图标: 压缩包 -->
      <a-avatar v-else-if="cItem.category == 'zip'" :size="iconSize" style="background: #eee">
        <template #icon><IconZip :size="iconSize" /></template>
      </a-avatar>
      <!-- 图标: file -->
      <a-avatar v-else style="background: #eee" :size="iconSize">
        <template #icon><IconFile :size="iconSize" /></template>
      </a-avatar>
    </div>

    <!-- 文件名称 -->
    <div class="text-truncate mr-10" style="flex: 1" :title="cItem.name">
      <a href @click.prevent.stop="$emit('open')" style="user-select: text">{{ cItem.name }}</a>
    </div>
    <div v-if="cItem.type == 'file'" style="width: 10%; min-width: 80px">
      <small class="grey-text">{{ formatSize(cItem.size) }}</small>
    </div>
    <div style="width: 20%; min-width: 120px">
      <small class="grey-text">{{ formatTime(cItem.updated_at) }}</small>
    </div>
  </a-card>
</template>

<script setup>
import {computed, ref, watch, toRaw} from 'vue'
import {formatSize, formatTime} from '../../../services/format'
import {IconFolder, IconWord, IconExcel, IconPpt, IconPdf, IconAudio, IconVideo, IconZip, IconFile} from './icons'

const emit = defineEmits(['update:selected', 'open', 'select'])
const props = defineProps(['item', 'selected', 'rowKey'])
let cItem = computed(() => props.item)

const checked = ref(false)
const cache_selected = ref([])
const iconSize = 22
watch(
  () => props.selected,
  v => {
    init()
  },
  {deep: true},
)

function init() {
  cache_selected.value = props.selected
  checked.value = props.selected.includes(props.item[props.rowKey])
}

watch(
  () => checked.value,
  async v => {
    // await new Promise((a) => setTimeout(a, 20))

    let arr = toRaw(cache_selected.value || [])

    if (v) {
      if (!arr.includes(props.item[props.rowKey])) {
        cache_selected.value.push(props.item[props.rowKey])
        emit('update:selected', cache_selected.value)
      }
    } else {
      let ind = arr.indexOf(props.item[props.rowKey])
      if (ind != -1) {
        cache_selected.value.splice(ind, 1)
        emit('update:selected', cache_selected.value)
      }
    }
  },
)
</script>

<style lang="less">
.item-line {
  width: 100%;
  &.item-line-selected {
    border-color: #1677ff;
    box-shadow: 0 0 4px #1677ff;
  }
  .ant-avatar {
    margin: 0 10px;

    &:hover {
      box-shadow: 0 0 6px #535bf2;
    }
  }
}
</style>
