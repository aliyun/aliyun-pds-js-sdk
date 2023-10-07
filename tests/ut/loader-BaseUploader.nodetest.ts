import {describe, expect, it} from 'vitest'
import {BaseUploader} from '../../lib/loaders/BaseUploader'
import {delay} from '../../lib/utils/HttpUtil'
import {NodeContextExt} from '../../lib/context/NodeContextExt'
import {PDSError} from '../../lib/utils/PDSError'
import * as NodeContex from '../../lib/context/NodeContext'

function mockFile() {
  return {
    name: 'a.txt',
    size: 0,
    path: '/home/admin/a.txt',
  }
}

describe('BaseUploader', function () {
  describe('run', function () {
    it('run', async () => {
      class TestBaseUploader extends BaseUploader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
      }

      let client = new TestBaseUploader(
        {verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'},
        {
          max_file_size_limit: 1000,
        },
      )

      await client.start()
      await delay(100)
      expect(client.state).toBe('error')
      expect(client.message.startsWith('File size exceeds limit: ')).toBe(true)
    })
    it('force stop', async () => {
      class TestBaseUploader extends BaseUploader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
        async run(): Promise<any> {
          throw new Error('stopped')
        }
      }

      let ext = new NodeContextExt(NodeContex)
      let client = new TestBaseUploader(
        {verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'},
        {},
        {},
        ext,
      )

      await client.doStart()
      await delay(100)
      expect(client.state).toBe('stopped')
    })
  })
  describe('http_client_call', function () {
    it('http_client_call', async () => {
      class TestBaseDownloader2 extends BaseUploader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
      }

      let ext = new NodeContextExt(NodeContex)
      let client = new TestBaseDownloader2(
        {verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'},
        {},
        {
          http_client: {
            act: ({a}) => {
              return Promise.resolve('v-' + a)
            },
          },
        },
        ext,
      )

      let v = await client.http_client_call('act', {a: 1})
      await delay(100)
      expect(v).toBe('v-1')
    })

    it('504', async () => {
      class TestBaseDownloader3 extends BaseUploader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
      }

      let c = 0
      let ext = new NodeContextExt(NodeContex)
      let client = new TestBaseDownloader3(
        {verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'},
        {},
        {
          http_client: {
            act: async ({a}) => {
              c++
              throw new PDSError('e', 'b', 504)
            },
          },
        },
        ext,
      )

      await delay(1)

      try {
        await client.http_client_call('act', {a: 1}, {}, 2, 1)
      } catch (e) {
        expect(e.code).toBe('stopped')
      }

      expect(c).toBe(2)
    })
  })
})
