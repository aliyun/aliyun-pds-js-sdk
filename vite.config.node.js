import {defineConfig} from 'vite'
import commonjsExt from 'vite-plugin-commonjs-externals'

export default defineConfig({
  plugins: [
    commonjsExt({
      externals: [
        'fs',
        'url',
        'zlib',
        'worker_threads',
        'crypto',
        'stream',
        'os',
        'net',
        'process',
        'path',
        'util',
        'http',
        'https',
        'process',
        'events',
        'assert',
        'child_process',
      ],
    }),
  ],
  build: {
    outDir: 'dist/node',
    lib: {
      entry: './lib/index.ts',
      name: 'PDS_SDK',
      formats: ['es', 'umd'],
      fileName: `node-pds`,
    },
  },
})
