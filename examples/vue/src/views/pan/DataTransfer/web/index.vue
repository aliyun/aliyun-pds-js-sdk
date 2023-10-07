<template>
  <div class="data-transfer">
    <a-card
      class="data-transfer-frame"
      :tab-list="tabList"
      :active-tab-key="titleKey"
      @tabChange="key => (titleKey = key)"
      bordered
      v-show="visible"
      :bodyStyle="{padding: '0px'}"
    >
      <template #customTab="item">
        <span v-if="item.key === 'upload'">
          {{ $t('upload_list') }}
          ({{ uploadLen }})
        </span>
        <span v-if="item.key === 'download'">
          {{ $t('download_list') }}
          ({{ downloadLen }})
        </span>
      </template>

      <template #tabBarExtraContent>
        <a-button shape="circle" type="link" @click.stop="visible = false">
          <down-outlined />
        </a-button>
      </template>

      <UploadPanel v-show="titleKey == 'upload'" @length="v => (uploadLen = v)" />

      <DownloadPanel v-show="titleKey == 'download'" @length="v => (downloadLen = v)" />
    </a-card>

    <a v-show="!visible" href @click.prevent.stop="visible = true" class="mini-bar">
      {{ uploadLen }} | {{ downloadLen }}
    </a>
  </div>
</template>

<script setup>
import {DownOutlined} from '@ant-design/icons-vue'
import UploadPanel from './UploadPanel.vue'
import DownloadPanel from './DownloadPanel.vue'
import {useBus} from '../../../../use/event'

let visible = $ref(false)
let tabList = $ref([
  {key: 'upload', tab: '上传列表'},
  {key: 'download', tab: '下载列表'},
])
let titleKey = $ref('upload')
let uploadLen = $ref(0)
let downloadLen = $ref(0)

useBus('uploadFiles', () => {
  visible = true
  titleKey = 'upload'
})

useBus('downloadFiles', () => {
  visible = true
  titleKey = 'download'
})
</script>

<style lang="less">
.data-transfer {
  .mini-bar {
    position: fixed;
    z-index: 900;
    right: 20px;
    bottom: 0;
    min-width: 80px;
    height: 24px;
    background-color: #fff;
    border: 1px solid #ccc;
    border-bottom: 0;

    border-radius: 0;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;

    cursor: pointer;
    text-align: center;

    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    &:hover {
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    }
  }

  .data-transfer-frame {
    position: fixed;
    z-index: 900;
    right: 20px;
    bottom: 0;
    width: 540px;
    height: 400px;

    border-bottom: 0;
    border-radius: 10px;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
  }
}
</style>
