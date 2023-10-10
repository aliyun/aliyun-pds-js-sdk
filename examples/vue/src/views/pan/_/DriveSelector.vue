<template>
  <div class="d-flex align-center">
    <div class="mr-4">选择云盘:</div>
    <a-select ref="select" v-model:value="drive_id" style="width: 120px">
      <a-select-option v-for="item in items" :value="item.drive_id" :key="item.drive_id">
        {{ item.drive_name }}</a-select-option
      >
    </a-select>
  </div>
</template>

<script setup>
import {watch} from 'vue'
import Drive from '../../../services/drive'

const emit = defineEmits(['select'])
let drive_id = $ref($route.params.driveId)
let items = $ref([])

watch(
  () => drive_id,
  v => {
    $router.push({name: 'pan', params: {driveId: v}})
    onSelect()
  },
)

load()
async function load() {
  let {items: arr = []} = await Drive.listMyDrives()
  items = arr

  if (arr.length > 0) {
    if ($route.params.driveId) drive_id = $route.params.driveId
    else drive_id = arr[0].drive_id
    onSelect()
  }
}

function onSelect() {
  let currentDrive = items.filter(n => n.drive_id == drive_id)[0]
  emit('select', currentDrive)
}
</script>
