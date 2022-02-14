/** @format */

import {createApp} from 'vue'
import App from './App.vue'
import router from './router.js'

import * as PDS_SDK2 from '../../..'
const {PDSClient} = PDS_SDK2
console.log(PDSClient)

const app = createApp(App)
app.use(router)
app.mount('#app')
