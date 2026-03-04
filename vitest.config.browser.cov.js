import {defineConfig} from 'vite'
import {join} from 'path'

export default defineConfig({
  test: {
    threads: false, // 所有测试在主进程运行 
    rpcOptions: {
      timeout: 120_000
    },
    
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
      // reportOnFailure: true,
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
      provider: 'playwright',
      headless: true,
      enabled: true,
      name: 'chromium',
    },
    // Windows 环境优化配置
    testTimeout: 3000000, // 50分钟
    hookTimeout: 3000000,
    teardownTimeout: 3000000,
    
    // 针对 Windows 的特殊配置 
    maxConcurrency: 1, // 限制并发数
    
    // 重试配置
    retry: 3, // 失败时重试3次
    bail: 5, // 连续5个测试失败时停止
  },
})
