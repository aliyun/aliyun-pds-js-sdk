<template>
  <div>
    <div style="line-height: 10px; transform: translateY(6px)">
      <small v-if="props.total == -1">不限大小</small>
      <small v-else>已用空间 {{ formatSize(props.used) }}/{{ formatSize(props.total) }}</small>
    </div>
    <a-progress
      style="line-height: 10px"
      class="mb-0"
      :percent="usedPercent"
      :strokeColor="usedPercentColor"
      size="small"
      :showInfo="false"
    />
  </div>
</template>

<script setup>
import {formatSize} from '../../../services/format'
const props = defineProps(['used', 'total'])
let usedPercent = $computed(() => {
  return props.total == -1 ? 0 : Math.min(100, Math.floor((props.used * 10000) / props.total) / 100)
})

let usedPercentColor = $computed(() => {
  if (usedPercent > 80) return '#f60'
  else return '#39f'
})
</script>
