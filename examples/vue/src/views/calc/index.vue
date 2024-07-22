<template>
  <a-layout class="h-100">
    <a-page-header class="page-bar" @back="() => $router.push('/')">
      <template #title>文件计算 Demo </template>

      <template #backIcon>
        <home-outlined />
      </template>
    </a-page-header>
    <a-layout-content class="page-content">
      <drop-zone @dropList="handleDrop" @dropList4Electron="handleDrop4electron">
        <a-card title="1. 选择文件/输入文件内容">
          <a-tabs v-model:activeKey="tab">
            <a-tab-pane key="1" tab="选择文件">
              <input type="file" @change="$event => keepFile($event)" />
              <div v-if="keep">文件名称：{{ keep.name }} （大小：{{ formatSize(keep.size) }}）</div>
            </a-tab-pane>
            <a-tab-pane key="2" tab="输入文件内容" force-render>
              <a-textarea v-model:value="textArea"></a-textarea>
              as file size: {{ formatSize(getCurrentFile()?.size || 0) }}
            </a-tab-pane>
          </a-tabs>
        </a-card>

        <a-card title="2. 计算">
          <section class="mt-10">
            <a-button type="primary" :disabled="!btnActive" @click="crc64File()">crc64</a-button>
            <span v-if="crc64.prog" class="mx-4"> 进度: {{ crc64.prog }}</span>
            <span v-if="crc64.result" class="mx-4"> 结果: {{ crc64.result }}</span>
            <span v-if="crc64.elapse" class="mx-4"> 耗时: {{ crc64.elapse }}ms</span>
          </section>

          <section class="mt-10">
            <a-button type="primary" :disabled="!btnActive" @click="sha1File()">sha1</a-button>
            <span v-if="sha1.prog" class="mx-4"> 进度: {{ sha1.prog }}</span>
            <span v-if="sha1.result" class="mx-4"> 结果: {{ sha1.result }}</span>
            <span v-if="sha1.elapse" class="mx-4"> 耗时: {{ sha1.elapse }}ms</span>
          </section>

          <section class="mt-10">
            <a-button type="primary" :disabled="!btnActive" @click="sha1PartsFile()">sha1分片</a-button>
            <span v-if="sha1_parts.prog" class="mx-4"> 进度: {{ sha1_parts.prog }}</span>
            <span v-if="sha1_parts.result" class="mx-4"> 结果: {{ sha1_parts.result }}</span>
            <span v-if="sha1_parts.elapse" class="mx-4"> 耗时: {{ sha1_parts.elapse }}ms</span>
            <span v-if="sha1_parts.part_info_list?.length > 0" class="mx-4">
              分片数: {{ sha1_parts.part_info_list.length }}</span
            >
          </section>

          <section class="mt-10">
            <a-button type="primary" :disabled="!btnActive" @click="sha256File()">sha256</a-button>
            <span v-if="sha256.prog" class="mx-4"> 进度: {{ sha256.prog }}</span>
            <span v-if="sha256.result" class="mx-4"> 结果: {{ sha256.result }}</span>
            <span v-if="sha256.elapse" class="mx-4"> 耗时: {{ sha256.elapse }}ms</span>
          </section>

          <section class="mt-10">
            <a-button type="primary" :disabled="!btnActive" @click="sha256PartsFile()">sha256分片</a-button>
            <span v-if="sha256_parts.prog" class="mx-4"> 进度: {{ sha256_parts.prog }}</span>
            <span v-if="sha256_parts.result" class="mx-4"> 结果: {{ sha256_parts.result }}</span>
            <span v-if="sha256_parts.elapse" class="mx-4"> 耗时: {{ sha256_parts.elapse }}ms</span>
            <span v-if="sha256_parts.part_info_list?.length > 0" class="mx-4">
              分片数: {{ sha256_parts.part_info_list.length }}</span
            >
          </section>
        </a-card>
      </drop-zone>
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import {HomeOutlined} from '@ant-design/icons-vue'
import {ref, watch, computed, reactive} from 'vue'
import {CalcUtil, ChunkUtil, Context} from '../../services/js-sdk'
import DropZone from '../pan/_/DropZone.vue'
import {formatSize} from '../../services/format'
import {provide} from 'vue'

const isElectron = !!window.ClientBridge
console.log('isElectron', isElectron)
provide('isElectron', isElectron)

let tab = ref('1')

let textArea = ref('')
let keep = ref()

let crc64 = reactive({
  prog: 0,
  elapse: 0,
  result: '',
})
let sha1 = reactive({
  prog: 0,
  elapse: 0,
  result: '',
})
let sha1_parts = reactive({
  prog: 0,
  elapse: 0,
  result: '',
  part_info_list: [],
})
let sha256 = reactive({
  prog: 0,
  elapse: 0,
  result: '',
})
let sha256_parts = reactive({
  prog: 0,
  elapse: 0,
  result: '',
  part_info_list: [],
})
watch(
  () => tab.value,
  v => {
    crc64.prog = 0
    crc64.elapse = 0
    crc64.result = ''

    sha1.prog = 0
    sha1.elapse = 0
    sha1.result = ''

    sha1_parts.prog = 0
    sha1_parts.elapse = 0
    sha1_parts.result = ''
    sha1_parts.part_info_list = []

    sha256.prog = 0
    sha256.elapse = 0
    sha256.result = ''

    sha256_parts.prog = 0
    sha256_parts.elapse = 0
    sha256_parts.result = ''
    sha256_parts.part_info_list = []
  },
)

let btnActive = computed(() => {
  return (tab.value == '1' && keep.value) || (tab.value == '2' && textArea.value)
})

function keepFile(e) {
  keep.value = e.target.files[0]
}
function handleDrop(arr) {
  keep.value = arr[0]
}
function handleDrop4electron(arr) {
  keep.value = arr[0]
}

function getCurrentFile() {
  if (tab.value == '1') {
    if (isElectron) return keep.value.path
    else return keep.value
  } else {
    let ab = textArea.value ? new TextEncoder().encode(textArea.value) : ''
    return new File([ab], 'a.txt', {type: 'text/plain;charset=utf-8'})
  }
}

/////////////////////////////

async function crc64File() {
  let st = Date.now()
  let f = getCurrentFile()
  crc64.result = await CalcUtil.calc_file_crc64(
    f,
    prog => (crc64.prog = prog.toFixed(2) + '%'),
    () => false,
  )

  crc64.elapse = Date.now() - st
}

async function sha1File() {
  let st = Date.now()
  let f = getCurrentFile()
  sha1.result = await CalcUtil.calc_file_sha1(
    f,
    0,
    prog => (sha1.prog = prog.toFixed(2) + '%'),
    () => false,
  )

  sha1.elapse = Date.now() - st
}

async function sha1PartsFile() {
  let st = Date.now()
  let f = getCurrentFile()

  let [part_info_list, chunk_size] = ChunkUtil.init_chunks_sha(f.size, [], 64)
  console.log(part_info_list, chunk_size)

  let result = await CalcUtil.calc_file_parts_sha1(
    f,
    part_info_list,
    prog => (sha1_parts.prog = prog.toFixed(2) + '%'),
    () => false,
    isElectron ? Context : null,
  )
  sha1_parts.result = result.content_hash
  sha1_parts.part_info_list = result.part_info_list
  console.log(sha1_parts.part_info_list)

  sha1_parts.elapse = Date.now() - st
}

async function sha256File() {
  let st = Date.now()
  let f = getCurrentFile()
  sha256.result = await CalcUtil.calc_file_sha256(
    f,
    0,
    prog => (sha256.prog = prog.toFixed(2) + '%'),
    () => false,
  )

  sha256.elapse = Date.now() - st
}

async function sha256PartsFile() {
  let st = Date.now()
  let f = getCurrentFile()

  let [part_info_list, chunk_size] = ChunkUtil.init_chunks_sha(f.size, [], 64)
  console.log(part_info_list, chunk_size)

  let result = await CalcUtil.calc_file_parts_sha256(
    f,
    part_info_list,
    prog => (sha256_parts.prog = prog.toFixed(2) + '%'),
    () => false,
    isElectron ? Context : null,
  )
  sha256_parts.result = result.content_hash
  sha256_parts.part_info_list = result.part_info_list
  console.log(sha256_parts.part_info_list)

  sha256_parts.elapse = Date.now() - st
}
</script>
