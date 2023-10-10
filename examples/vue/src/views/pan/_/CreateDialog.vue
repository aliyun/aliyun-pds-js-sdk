<template>
  <a-modal v-model:open="visible" :title="formState.title" @close="close" @cancel="close">
    <a-form ref="formRef" :model="formState" name="dynamic_rule" @submit.prevent="onSubmit">
      <a-form-item
        label="名称"
        name="fileName"
        :rules="[
          {required: true, message: '请输入名称', trigger: 'change'},
          {min: 1, max: MAX_LEN, message: `最大支持${MAX_LEN}个字符`, trigger: 'change'},
        ]"
        has-feedback
        :validate-status="error ? 'error' : ''"
      >
        <a-input
          ref="nameRef"
          placeholder="请输入名称"
          showCount
          :maxlength="MAX_LEN"
          allowClear
          v-model:value="formState.fileName"
          autocomplete="off"
          :addon-after="formState.ext"
        />
        <span v-if="error" class="error-text">{{ error }}</span>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button key="back" @click="close">取消</a-button>
      <a-button key="submit" type="primary" :loading="submitting" @click="onSubmit">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import {watch, ref, toRaw, reactive} from 'vue'
import {SDK} from '../../../services/js-sdk'
import PptxGenJS from 'pptxgenjs'
import * as XLSX from 'xlsx/xlsx.mjs'

import {FILE_NAME_MAX_LEN} from '../../../const'

const MAX_LEN = FILE_NAME_MAX_LEN

const props = defineProps(['title', 'defaultValue', 'defaultExt', 'action'])
const emit = defineEmits(['success'])
const visible = ref(false)
const submitting = ref(false)
const formRef = ref()
const error = ref()

const formState = reactive({
  fileName: props.defaultValue,
  ext: props.defaultExt || '',
  title: props.title || '',
})
const nameRef = ref()
let drive_id
let parent_file_id
let file_id

watch(
  () => visible.value,
  v => {
    if (!v) formRef.value.resetFields()
    else setTimeout(() => nameRef.value.select(), 100)
  },
)
watch(
  () => formState.fileName,
  () => (error.value = ''),
)

async function onSubmit() {
  try {
    await formRef.value.validateFields()
  } catch (err) {
    if (err.errorFields.length > 0) return
  }

  let item = toRaw(formState)
  submitting.value = true

  try {
    let data
    if (props.action == 'createFolder') {
      // 新建文件夹
      data = await SDK.createFolder({name: item.fileName, drive_id, parent_file_id, check_name_mode: 'refuse'})
    } else if (props.action == 'saveFileContent') {
      // 新建文件
      let content_type
      let content = ''

      switch (item.ext) {
        case '.docx':
          content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case '.pptx':
          content_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          content = await createPowerPointFile()
          break
        case '.xlsx':
          content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          content = await createExcelFile()
          break
      }

      data = await SDK.saveFileContent(
        {
          name: item.fileName + item.ext,
          content_type,
          drive_id,
          parent_file_id,
          check_name_mode: 'refuse',
        },
        content,
      )
    } else if (props.action == 'renameFile') {
      // 重命名
      try {
        data = await SDK.renameFile({file_id, drive_id, parent_file_id}, item.fileName, 'refuse')
      } catch (e) {
        console.log('-------err', e)
      }
    }
    emit('success', data)

    close()
  } catch (e) {
    console.warn(e)
    error.value = e.message
    // throw e
  } finally {
    submitting.value = false
  }
}
function close() {
  formRef.value.resetFields()
  visible.value = false
  error.value = null
}
function show({ext, title, defaultValue, file_id: _file_id, parent_file_id: _parent_file_id, drive_id: _drive_id}) {
  drive_id = _drive_id
  parent_file_id = _parent_file_id
  file_id = _file_id

  if (ext) formState.ext = ext
  if (defaultValue) formState.fileName = defaultValue
  if (title) formState.title = title
  visible.value = true
}

async function createExcelFile(content = []) {
  const ws = XLSX.utils.book_new()
  const data = XLSX.utils.json_to_sheet(content)
  XLSX.utils.book_append_sheet(ws, data, 'Sheet1')
  const res = XLSX.write(ws, {type: 'array'})
  return res
}

async function createPowerPointFile() {
  const pres = new PptxGenJS()
  pres.addSlide()
  const result = await pres.write('arraybuffer')
  return result
}

defineExpose({
  show,
})
</script>
