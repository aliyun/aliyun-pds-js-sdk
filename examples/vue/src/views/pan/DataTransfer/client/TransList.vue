<template>
  <div>
    <header class="trans-toolbar">
      <slot name="toolbar-extra"></slot>
      <!-- <a-button size="small" class="mx-2">全部启动</a-button>
      <a-button size="small" class="mx-2">全部暂停</a-button>
      <a-button size="small" class="mx-2" >全部取消</a-button> -->
      <a-button size="small" class="mx-2" @click.stop="emit('clearDone')">清空已完成</a-button>
    </header>
    <section class="trans-list">
      <a-list size="small" :data-source="props.items" rowKey="id">
        <template #renderItem="{item}">
          <a-list-item class="trans-list-item">
            <a-list-item-meta>
              <template #title>
                <div class="d-flex">
                  <!-- 文件名 -->
                  <label
                    class="text-truncate"
                    :class="{'text-through': item.state == 'cancelled'}"
                    :title="item.file.name"
                    >{{ item.file.name }}</label
                  >
                  <div class="text-w ml-10" style="min-width: 220px">
                    <small class="grey-text">
                      <span v-if="SUCCESS_STATES.includes(item.state)">({{ formatSize(item.loaded) }})</span>
                      <span v-else>({{ formatSize(item.loaded) }}/{{ formatSize(item.file.size) }})</span>
                    </small>

                    <small v-if="item.state == 'running'" class="grey-text">({{ formatSize(item.speed) }}/s)</small>
                    <small v-else-if="SUCCESS_STATES.includes(item.state)" class="grey-text"
                      >({{ formatSize(item.avg_speed) }}/s)</small
                    >

                    <a-tooltip
                      :overlayStyle="{zIndex: 9999}"
                      color="red"
                      v-if="['error', 'fatal'].includes(item.state)"
                    >
                      <close-circle-outlined class="error-text mx-6 mt-4" />
                      <template #title> 失败: {{ item.error }} </template>
                    </a-tooltip>
                  </div>
                </div>
              </template>

              <template #avatar>
                <!-- icon -->
                <a-avatar :size="25">
                  <template #icon>
                    <IconFolder v-if="item.type == 'folder'" />
                    <IconFile v-else /> </template></a-avatar
              ></template>
            </a-list-item-meta>

            <template #actions>
              <div class="text-right ml-0 mr-0" style="max-width: 80px">
                <a-button
                  shape="circle"
                  size="small"
                  class="mx-2"
                  v-if="['running', 'waiting'].includes(item.state)"
                  @click.stop="stop(item)"
                >
                  <pause-circle-outlined />
                </a-button>

                <a-button
                  shape="circle"
                  size="small"
                  class="mx-2"
                  v-if="['stopped', 'error'].includes(item.state)"
                  @click.stop="start(item)"
                >
                  <play-circle-outlined />
                </a-button>

                <a-button
                  shape="circle"
                  class="mx-2"
                  size="small"
                  v-if="!['success', 'rapid_success', 'cancelled', 'error'].includes(item.state)"
                  @click.stop="cancel(item)"
                >
                  <CloseCircleOutlined />
                </a-button>

                <CloseCircleOutlined class="error-text mx-6" v-if="['cancelled'].includes(item.state)" />
                <CheckCircleOutlined class="success-text mx-6" v-if="['success'].includes(item.state)" />
                <a-tooltip
                  color="green"
                  v-if="['rapid_success'].includes(item.state)"
                  placement="left"
                  :overlayStyle="{zIndex: 9999}"
                >
                  <CheckOutlined class="success-text mx-6" />
                  <template #title>秒传成功</template>
                </a-tooltip>
              </div>
            </template>
            <!-- 进度 -->
            <div class="trans-list-item-prog" :class="item.state" :style="`width:${item.progress}%`"></div>
          </a-list-item>
        </template>
      </a-list>
    </section>
  </div>
</template>

<script setup>
import {formatSize} from '../../../../services/format'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue'
import {IconFile, IconFolder} from '../../_/icons'
import {inject} from 'vue'
const SUCCESS_STATES = ['success', 'rapid_success']
const props = defineProps(['items', 'type'])
const emit = defineEmits(['clearDone'])
const dtIns = inject('dtIns')

function start(item) {
  dtIns.startTask(props.type, item.id)
}
function stop(item) {
  dtIns.stopTask(props.type, item.id)
}
function cancel(item) {
  dtIns.cancelTask(props.type, item.id)
}
</script>

<style lang="less">
.trans-toolbar {
  height: 40px;
  padding: 0 10px;
  display: flex;
  justify-content: end;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.trans-list {
  overflow: auto;
  height: 300px;
  width: 100%;

  .trans-list-item {
    position: relative;
    .ant-list-item-meta-title {
      margin: 2px;
    }
  }
  .trans-list-item-prog {
    height: 100%;
    position: absolute;
    z-index: -1;
    margin-left: -16px;
    margin-right: -16px;
    // margin-left: -24px;
    // margin-right: -24px;
    &.running {
      background: #def;
    }
    &.error {
      background: rgb(244, 167, 148);
    }
    &.fatal {
      background: rgb(244, 167, 148);
    }
    &.stopped {
      background: rgb(244, 220, 158);
    }
    &.finished {
      // background: rgb(168, 244, 188);
    }
  }
}
</style>
