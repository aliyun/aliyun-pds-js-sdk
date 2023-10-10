import {describe, expect, it, vi} from 'vitest'
import {BaseUploader} from '../../lib/loaders/BaseUploader'
import {delay} from '../../lib/utils/HttpUtil'
import {PDSError} from '../../lib/utils/PDSError'

function mockFile() {
  return {
    name: 'a.txt',
    size: 100,
    path: '/home/admin/a.txt',
  }
}
describe('BaseUploader', function () {
  describe('handleError', function () {
    it('constructor error', async () => {
      expect(() => new BaseUploader({})).toThrowError('Fatal: Invalid file struct')
    })

    it('handleError', async () => {
      let client = new BaseUploader({file: mockFile()}, {})
      let e = await client.handleError(new Error('test'))
      expect(e.message).toBe('test')
    })

    it('cancelFlag', async () => {
      let client = new BaseUploader({file: mockFile()}, {})
      client.cancel()
      let e = await client.handleError(new Error('test'))
      expect(client.state).toBe('error')
      expect(e.message).toBe('test')
    })

    it('stop', async () => {
      let client = new BaseUploader({file: mockFile()}, {})

      let e = await client.handleError(new PDSError('stopped', 'stopped'))
      expect(client.state).toBe('stopped')
      expect(e.code).toBe('stopped')
    })
  })

  describe('wait', function () {
    it('wait', async () => {
      class TestBaseUploader1 extends BaseUploader {
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
      let client = new TestBaseUploader1({file: mockFile(), state: 'error'}, {})

      client.on('statechange', (cp, state) => {
        lastState = state
      })

      client.wait()
      await delay(100)
      expect(lastState).toBe('waiting')
    })
  })

  describe('run', function () {
    it('run has upload id', async () => {
      class TestBaseUploader1 extends BaseUploader {
        constructor(...argv) {
          super(...argv)
        }
        async prepareAndCreate() {}
        async initChunks() {
          this.part_info_list = []
        }
        async upload() {}
        //mock
        async startCrc64Worker() {}
        async listAllUploadedParts() {
          return []
        }
      }

      let client = new TestBaseUploader1({file: mockFile(), upload_id: 'x', state: 'waiting'}, {})

      vi.spyOn(client, 'getUploadUrl').mockImplementation(async () => {
        throw new PDSError('err', 'AlreadyExist.File')
      })

      client.run()
      await delay(100)
      expect(client.state).toBe('rapid_success')
    })
  })

  describe('start', function () {
    class TestBaseUploader1 extends BaseUploader {
      constructor(...argv) {
        super(...argv)
      }
      async prepareAndCreate() {}
      async initChunks() {
        this.part_info_list = []
      }
      async upload() {}
      //mock
      async startCrc64Worker() {}
      async listAllUploadedParts() {
        return []
      }
    }

    it('run has upload id', async () => {
      let client = new TestBaseUploader1({file: mockFile(), upload_id: 'x', state: 'waiting'}, {})

      vi.spyOn(client, 'getUploadUrl').mockImplementation(async () => {
        throw new PDSError('err', 'AlreadyExist.File')
      })

      client.start()
      await delay(100)
      expect(client.state).toBe('rapid_success')
    })

    it('max_file_size_limit', async () => {
      let client = new TestBaseUploader1(
        {file: mockFile(), upload_id: 'x', state: 'waiting'},
        {
          max_file_size_limit: 1,
        },
      )

      client.start()
      await delay(100)
      console.log(client)
      expect(client.state).toBe('error')
      expect(client.error.code).toBe('FileSizeExceedUploadLimit')
    })

    it('file_ext_list_limit', async () => {
      let client = new TestBaseUploader1(
        {file: mockFile(), upload_id: 'x', state: 'waiting'},
        {
          file_ext_list_limit: ['.jpg'],
        },
      )

      client.start()
      await delay(100)
      expect(client.state).toBe('error')
      expect(client.error.code).toBe('FileExtentionIsInvalid')
    })
  })
})
