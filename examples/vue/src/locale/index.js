import {createI18n} from 'vue-i18n'
import zhCN from './zh_CN'
import enUS from './en_US'

const STORE_KEY = 'locale'
let default_lang = localStorage.getItem(STORE_KEY) || navigator.language

const i18n = createI18n({
  legacy: false,
  locale: default_lang, // 默认显示语言
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

function changeLocale(locale = 'zh-CN') {
  console.log('==== changeLocale ===', locale)
  locale = locale.startsWith('zh') ? 'zh-CN' : 'en-US'
  localStorage.setItem(STORE_KEY, locale)
  // 全局改locale  en-US zh-CN
  i18n.global.locale.value = locale
}

export {i18n, changeLocale}
