import {defineConfig} from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/browser',
    lib: {
      entry: './lib/index.browser.ts',
      name: 'PDS_SDK',
      formats: ['es', 'umd'],
      fileName: `aliyun-pds-js-sdk`,
    },
  }
})
