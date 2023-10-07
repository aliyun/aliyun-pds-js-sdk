import {createApp} from 'vue'

import './quick.less'
import './style.less'
import './color.less'
import './block-layout.less'

import App from './App.vue'
import Router from './router'
import {i18n} from './locale'
import directives from './directives'

const app = createApp(App)

// 加载公共filter
for (const key in directives) {
  app.directive(key, directives[key])
}

app.use(Router)
app.use(i18n)

app.mount('#app')
