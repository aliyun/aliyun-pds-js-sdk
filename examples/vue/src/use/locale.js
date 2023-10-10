import {ref} from 'vue'
import {i18n, changeLocale} from '../locale'
import {useI18n} from 'vue-i18n'
// for dayjs
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

// for ant components
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import enUS from 'ant-design-vue/es/locale/en_US'

let current = i18n.global.locale.value

export {useLocale}

function useLocale() {
  const antLocale = ref()
  const {locale} = useI18n()
  setLocale(current)

  function setLocale(v) {
    v = v.startsWith('zh') ? 'zh-CN' : 'en-US'

    locale.value = v
    // for dayjs
    dayjs.locale(v.match(/(^[a-z]+)/i)[1])
    // for ant components
    antLocale.value = v == 'zh-CN' ? zhCN : enUS

    // for local components
    changeLocale(v)
  }
  return {
    antLocale,
    locale,
    setLocale,
  }
}
