<template>
  <a-breadcrumb>
    <template #separator>
      <span>/</span>
    </template>
    <a-breadcrumb-item class="addr-item"
      ><a href @click.prevent="$router.push({name: 'pan', params: {driveId: props.driveId}})"
        >根目录</a
      ></a-breadcrumb-item
    >
    <template v-if="items.length <= 4">
      <a-breadcrumb-item class="addr-item" v-for="(item, ind) in items" :key="'pre-crumb-' + ind"
        ><a href @click.prevent="onClick(item)" :title="item.name">{{ item.name }}</a></a-breadcrumb-item
      >
    </template>
    <template v-else>
      <a-breadcrumb-item class="addr-item" v-for="(item, ind) in pre_items" :key="'pre-crumb-' + ind"
        ><a href @click.prevent="onClick(item)" :title="item.name">{{ item.name }}</a></a-breadcrumb-item
      >

      <!-- 中间省略 -->
      <a-breadcrumb-item class="addr-item" v-if="items.length > 4">
        <a-dropdown>
          <a href @click.prevent>...</a>
          <template #overlay>
            <a-menu>
              <a-menu-item key="0" v-for="item in mid_items">
                <a href @click.prevent="onClick(item)" :title="item.name"> {{ item.name }} </a>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-breadcrumb-item>

      <a-breadcrumb-item class="addr-item" v-for="(item, ind) in post_items" :key="'post-crumb-' + ind"
        ><a href @click.prevent="onClick(item)" :title="item.name">{{ item.name }}</a></a-breadcrumb-item
      >
    </template>
  </a-breadcrumb>
</template>

<script setup>
import {watch, computed, ref, onMounted} from 'vue'
import {SDK} from '../../../services/js-sdk'

const props = defineProps(['modelValue'])
const items = ref([])

const pre_items = computed(() => (items.value.length > 2 ? items.value.slice(0, 2) : items.value))
const mid_items = computed(() => (items.value.length >= 5 ? items.value.slice(2, items.value.length - 2) : []))
const post_items = computed(() => (items.value.length >= 4 ? items.value.slice(items.value.length - 2) : []))

watch(
  () => props.modelValue,
  v => {
    splitArr(props.modelValue)
  },
  {deep: true},
)
onMounted(() => {
  splitArr(props.modelValue)
})

async function splitArr(v) {
  if (!v) return
  let {drive_id, parent_file_id = 'root'} = v
  if (!drive_id) return

  let arr = await SDK.getBreadcrumbFolderList({drive_id, file_id: parent_file_id})
  items.value = arr
}

function onClick(item) {
  $router.push({name: 'folder', params: {driveId: props.modelValue.drive_id, folderId: item.file_id}})
}
</script>

<style lang="less">
.addr-item {
  a {
    color: rgb(47, 62, 77);
    &:hover {
      font-weight: normal;
    }
  }
  a {
    vertical-align: top;
    max-width: 100px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
}
</style>
