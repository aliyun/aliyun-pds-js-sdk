import {onMounted, onUnmounted} from 'vue'
import mitt from 'mitt'
import debug from 'debug'
const bus = new mitt()

function useEventListener(target, event, callback) {
  // 如果你想的话，
  // 也可以用字符串形式的 CSS 选择器来寻找目标 DOM 元素
  onMounted(() => target.addEventListener(event, callback))
  onUnmounted(() => target.removeEventListener(event, callback))
}

function useBus(event, callback) {
  onMounted(() =>
    bus.on(event, (...argv) => {
      debug(`%cuseBus[${event}`, 'background:#f9e;', ...argv)
      callback(...argv)
    }),
  )
  onUnmounted(() => bus.off(event, callback))
}

export {useEventListener, bus, useBus}
