import {describe, expect, it, vi} from 'vitest'
import {BaseDownloader} from '../../lib/loaders/BaseDownloader'
import {delay} from '../../lib/utils/HttpUtil'
import {PDSError} from '../../lib/utils/PDSError'

function mockFile() {
  return {
    name: 'a.txt',
    size: 0,
    path: '/home/admin/a.txt',
  }
}

describe('BaseDownloader', function () {
  describe('handleError', function () {
    it('constructor error', async () => {
      expect(() => new BaseDownloader({}, {}, {})).toThrowError('Fatal: Invalid file struct')
    })

    it('handleError', async () => {
      let client = new BaseDownloader({file: mockFile()}, {}, {})
      let e = await client.handleError(new Error('test'))
      expect(e.message).toBe('test')
    })

    it('cancelFlag', async () => {
      let client = new BaseDownloader({file: mockFile()}, {}, {})
      client.cancel()
      let e = await client.handleError(new Error('test'))
      expect(client.state).toBe('error')
      expect(e.message).toBe('test')
    })

    it('stop', async () => {
      let client = new BaseDownloader({file: mockFile()}, {}, {})

      let e = await client.handleError(new PDSError('stopped', 'stopped'))
      expect(client.state).toBe('stopped')
      expect(e.code).toBe('stopped')
    })
  })

  describe('wait', function () {
    it('wait', async () => {
      class TestBaseDownloader1 extends BaseDownloader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
      }

      let lastState
      let client = new TestBaseDownloader1({file: mockFile(), state: 'error'}, {}, {})

      client.on('statechange', (cp, state) => {
        lastState = state
      })

      client.wait()
      await delay(100)
      expect(lastState).toBe('waiting')
    })
  })

  describe('run', function () {
    it('run', async () => {
      class TestBaseDownloader2 extends BaseDownloader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
      }

      let client = new TestBaseDownloader2(
        {verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'},
        {
          max_file_size_limit: 1000,
        },
        {},
      )

      await client.start()
      await delay(100)
      expect(client.state).toBe('error')
      expect(client.message.startsWith('File size exceeds limit: ')).toBe(true)
    })

    it('stop', async () => {
      class TestBaseDownloader2 extends BaseDownloader {
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

      let client = new TestBaseDownloader2({verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'}, {}, {})

      await client.doStart()
      await delay(100)
      expect(client.state).toBe('stopped')
    })
  })

  describe('http_client_call', function () {
    it('http_client_call', async () => {
      class TestBaseDownloader2 extends BaseDownloader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
      }

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
      )

      let v = await client.http_client_call('act', {a: 1})
      await delay(100)
      expect(v).toBe('v-1')
    })

    it('504', async () => {
      class TestBaseDownloader3 extends BaseDownloader {
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
      )

      await delay(1)

      try {
        await client.http_client_call('act', {a: 1}, {}, 2, 1)
      } catch (e) {
        console.log('-----------------e', e)
        expect(e.code).toBe('stopped')
      }

      expect(c).toBe(2)
    })
    it('401', async () => {
      class TestBaseDownloader3 extends BaseDownloader {
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
      let client = new TestBaseDownloader3(
        {verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'},
        {
          share_token: 'xx',
          refresh_share_token: () => {
            return 'x2'
          },
        },
        {
          http_client: {
            act: async ({a}) => {
              c++
              throw new PDSError('e', 'b', 401)
            },
          },
        },
      )

      await delay(1)

      try {
        await client.http_client_call('act', {a: 1}, {}, 2, 1)
      } catch (e) {
        expect(e.message).toBe('e [status: 401] [code: b]')
        expect(e.code).toBe('b')
        expect(e.status).toBe(401)
      }

      expect(c).toBe(3)
    })
  })

  describe('doDownloadPart', () => {
    it('isOssUrlExpired', async () => {
      class TestBaseDownloader3 extends BaseDownloader {
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
      let client = new TestBaseDownloader3({verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'}, {}, {})

      await delay(1)

      vi.spyOn(client, '_axiosDownloadPart').mockImplementation(async () => {
        if (client.download_url != 'a1')
          throw {
            message: 'expired',
            response: {
              status: 403,
              data: 'AccessDenied expired',
            },
          }
        else return 'ok'
      })
      vi.spyOn(client, 'getDownloadUrl').mockImplementation(async () => {
        client.download_url = 'a1'
      })

      let partInfo = {
        part_number: 1,
        part_size: 1000,
        from: 0,
        to: 1000,
      }
      let opt = {}

      await client.doDownloadPart(partInfo, opt)

      expect(client.download_url).toBe('a1')
    })

    it('socket hang up', async () => {
      class TestBaseDownloader3 extends BaseDownloader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
        async retryAllDownloadRequest() {}
      }

      let c = 0
      let client = new TestBaseDownloader3({verbose: true, file: {...mockFile(), size: 1001}, state: 'waiting'}, {}, {})

      await delay(1)

      vi.spyOn(client, '_axiosDownloadPart').mockImplementation(async () => {
        throw new Error('socket hang up')
      })

      let partInfo = {
        part_number: 1,
        part_size: 1000,
        from: 0,
        to: 1000,
      }
      let opt = {}
      try {
        await client.doDownloadPart(partInfo, opt)
        expect('should throw').toBe(false)
      } catch (e) {
        expect(e.code).toBe('stopped')
      }
      expect(client.message).toBe('socket hang up')
    })
  })
})
