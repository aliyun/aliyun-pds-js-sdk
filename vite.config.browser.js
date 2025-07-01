import {defineConfig} from 'vite'
import {join} from 'path'

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
      reporter: ['html', 'json', 'text', 'text-summary'],
      // Windows 使用反斜杠路径，可在配置中强制修正：
      reportsDirectory: join(__dirname, 'coverage/browser'),
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
        'lib/index.ts',
      ],
    },
    browser: {
      // https://vitest.dev/guide/browser/#headless
      provider: 'webdriverio',
      headless: true,
      enabled: true,
      name: 'chrome',
    },
    testTimeout: 3000000, // 增加到 50 分钟
    hookTimeout: 3000000,
  },
})
