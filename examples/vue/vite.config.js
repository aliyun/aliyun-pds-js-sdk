import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import {AntDesignVueResolver} from 'unplugin-vue-components/resolvers'

const ORIGIN = 'http://127.0.0.1:3300'

const {domain_id, api_endpoint, data_hash_name} = require('./lib/config')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      reactivityTransform: true,
    }),
    //自动按需引入组件
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ],
    }),
  ],
  define: {
    Global: {
      domain_id,
      api_endpoint,
      data_hash_name,
    },
  },
  server: {
    open: true,
    proxy: {
      '/token': {
        target: ORIGIN,
      },
    },
  },
  //依赖优化选项
  optimizeDeps: {
    exclude: ['../..'],
  },
})
