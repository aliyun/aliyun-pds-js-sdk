import {defineConfig} from 'vite'
import commonjsExt from 'vite-plugin-commonjs-externals'
import {join} from 'path'

export default defineConfig({
  test: {
    include: [
      // ts
      'tests/ut/*.test.ts',
      'tests/ut/*.nodetest.ts',
      'tests/ft/*.test.ts',
      'tests/ft/*.nodetest.ts',
      // js
      'tests/ut/*.test.js',
      'tests/ut/*.nodetest.js',
      'tests/ft/*.test.js',
      'tests/ft/*.nodetest.js',
    ],
    coverage: {
      // reportOnFailure: true,
      provider: 'istanbul',
      reporter: ['html', 'json', 'text', 'text-summary'],
      reportsDirectory: join(__dirname, './coverage/node'),
      include: ['lib/**/*.ts', 'lib/**/*.js'],
      exclude: [
        'tests',
        'lib/utils/checksum/worker/*',
        'lib/utils/checksum/browser-*',
        'lib/utils/checksum/wasm/wasm.js',
        'lib/utils/checksum/wasm/index-browser.js',
        'lib/utils/axios-node-adapter/*',
        'lib/utils/Browser*',
        'lib/loaders/WebDownloader.ts',
        'lib/tasks/WebDownloadTask.ts',
        'lib/context/Browser*',
        'lib/index.browser.ts',
        'lib/fix-browser-env.ts',
      ],
    },
    testTimeout: 1000000,
    hookTimeout: 1000000,
  },
})
