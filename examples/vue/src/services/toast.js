import {message} from 'ant-design-vue'

const Toast = {
  info: txt => message.info(txt),
  success: txt => message.success(txt),
  warning: txt => message.warning(txt),
  error: txt => message.error(txt),
}
export default Toast
