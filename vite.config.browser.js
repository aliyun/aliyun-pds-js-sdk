import { defineConfig } from 'vite'
import { join } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist/browser',
    lib: {
      entry: './lib/index.browser.ts',
      name: 'PDS_SDK',
      formats: ['es', 'umd'],
      fileName: `aliyun-pds-js-sdk`,
    },
  },
  test: {
    include: [
      // ts
      'tests/ut/*.test.ts',
      'tests/ut/*.webtest.ts',
      'tests/ft/*.test.ts',
      'tests/ft/*.webtest.ts',
      // js
      'tests/ut/*.test.js',
      'tests/ut/*.webtest.js',
      'tests/ft/*.test.js',
      'tests/ft/*.webtest.js',
    ],
    // environment: 'happy-dom',
    coverage: {
      reportOnFailure: true,
      provider: 'istanbul',
      reporter: ['html'],
      reportsDirectory: join(__dirname, './coverage/browser'),
      include: ['lib/**/*.ts', 'lib/**/*.js'],
      exclude: [
        'tests',
        'lib/utils/checksum/wasm/index-node.js',
        'lib/utils/checksum/wasm/wasm.js',
        'lib/utils/checksum/node-index.ts',
        'lib/utils/axios-node-adapter/*',
        'lib/utils/Node*',
        'lib/loaders/BaseDownloader.js',
        'lib/loaders/NodeDownloader.ts',
        'lib/tasks/NodeDownloadTask.ts',
        'lib/context/Node*',
        'lib/index.ts'
      ],
    },
    browser: {
      provider: 'webdriverio',
      providerOptions: {
        launch: {
          devtools: true,
        }
      },
      headless: true,
      enabled: true,
      name: 'chrome',
    },
    testTimeout: 1000000,
    hookTimeout: 1000000,
  },
})
