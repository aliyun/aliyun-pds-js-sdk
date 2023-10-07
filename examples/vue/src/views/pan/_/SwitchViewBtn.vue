<template>
  <div class="py-2">
    <a-button size="small" :disabled="view == 'line'" @click="view = 'line'"><unordered-list-outlined /></a-button>
    <a-button size="small" :disabled="view == 'block'" @click="view = 'block'"><appstore-outlined /></a-button>
  </div>
</template>

<script setup>
import {UnorderedListOutlined, AppstoreOutlined} from '@ant-design/icons-vue'
import {watch, ref, onMounted} from 'vue'

const view = ref('block')
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
watch(
  () => props.modelValue,
  v => (view.value = v),
)
watch(
  () => view.value,
  v => {
    emit('update:modelValue', v)
  },
)
onMounted(() => {
  view.value = props.modelValue
})
</script>
