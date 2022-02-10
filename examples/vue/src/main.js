/** @format */

import {createApp} from 'vue'
import App from './App.vue'
import router from './router.js'

import * as PDS_SDK from '../../..'

if (!window.PDS_SDK) {
  window.PDS_SDK = PDS_SDK
}

const app = createApp(App)
app.use(router)
app.mount('#app')
