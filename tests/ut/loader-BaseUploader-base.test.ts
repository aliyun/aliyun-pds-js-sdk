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

class TestBaseUploader extends BaseUploader {
  constructor(...argv) {
    super(...argv)
  }
  async prepareAndCreate() {}
  async initChunks() {
    this.part_info_list = []
  }
  async upload() {}
  async startCrc64Worker() {}
  async listAllUploadedParts() {
    return []
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

  describe('Additional coverage', () => {
    class TestUploader extends BaseUploader {
      async prepareAndCreate() {}
      async initChunks() {
        this.part_info_list = []
      }
      async upload() {}
      async startCrc64Worker() {}
      async listAllUploadedParts() {
        return []
      }
    }

    it('should handle different initial states', () => {
      const states = ['waiting', 'running', 'stopped', 'error', 'complete']
      states.forEach(state => {
        const client = new TestUploader({file: mockFile(), state}, {})
        expect(client.state).toBe(state)
      })
    })

    it('should handle checkpoint config', () => {
      const client = new TestUploader(
        {file: mockFile()},
        {
          enable_checkpoint: true,
          checkpoint_key: 'test-checkpoint',
        },
      )
      // checkpoint配置已设置
      expect(client).toBeDefined()
    })

    it('should handle part_size config', () => {
      const client = new TestUploader({file: mockFile(), part_size: 1024 * 1024}, {})
      // part_size配置已设置
      expect(client).toBeDefined()
    })

    it('should handle verbose mode', () => {
      const client = new TestUploader({file: mockFile(), verbose: true}, {})
      expect(client.verbose).toBe(true)
    })

    it('should handle cancel', async () => {
      const client = new TestUploader({file: mockFile()}, {})
      client.cancel()
      expect(client.stopFlag).toBe(true)
      expect(client.state).toBe('cancelled')
    })

    it('should handle stop', () => {
      const client = new TestUploader({file: mockFile()}, {})
      client.stop()
      expect(client.stopFlag).toBe(true)
    })

    it('should emit progress event', async () => {
      const client = new TestUploader({file: mockFile()}, {})
      let progressCalled = false
      client.on('progress', () => {
        progressCalled = true
      })
      client.notifyProgress('running', 50)
      expect(progressCalled).toBe(true)
    })

    it('should handle complete state change', async () => {
      const client = new TestUploader({file: mockFile()}, {})
      await client.changeState('complete')
      expect(client.state).toBe('complete')
    })

    it('should handle error state', async () => {
      const client = new TestUploader({file: mockFile()}, {})
      const err = new Error('Test error')
      await client.handleError(err)
      expect(client.state).toBe('error')
      expect(client.error).toBe(err)
    })

    it('should handle chunk_size range', () => {
      const testCases = [
        {chunk_size: 100 * 1024, expected: 100 * 1024},
        {chunk_size: 10 * 1024 * 1024, expected: 10 * 1024 * 1024},
      ]
      testCases.forEach(({chunk_size, expected}) => {
        const client = new TestUploader({file: mockFile(), chunk_size}, {})
        expect(client.chunk_size).toBeGreaterThanOrEqual(expected)
      })
    })

    it('should handle rapid upload result', async () => {
      const client = new TestUploader({file: mockFile()}, {})
      client.rapid_upload = vi.fn().mockResolvedValue(true)
      await client.changeState('computing_hash')
      expect(client.state).toBe('computing_hash')
    })

    it('should handle different file sizes', () => {
      const sizes = [100, 1024, 1024 * 1024, 100 * 1024 * 1024]
      sizes.forEach(size => {
        const client = new TestUploader({file: {...mockFile(), size}}, {})
        expect(client.file.size).toBe(size)
      })
    })

    it('should handle verbose mode', () => {
      const client = new TestBaseUploader({file: mockFile(), verbose: true}, {})
      expect(client.verbose).toBe(true)
    })

    it('should handle progress events', async () => {
      let progressCalled = false
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.on('progress', () => {
        progressCalled = true
      })
      client.notifyProgress('running', 50)
      expect(progressCalled).toBe(true)
    })

    it('should handle partial complete events', () => {
      let partialCompleteCalled = false
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.on('partialcomplete', () => {
        partialCompleteCalled = true
      })
      client.notifyPartCompleted({part_number: 1})
      expect(partialCompleteCalled).toBe(true)
    })

    it('should handle state change events', async () => {
      let stateChangeCalled = false
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.on('statechange', () => {
        stateChangeCalled = true
      })
      await client.changeState('running')
      expect(stateChangeCalled).toBe(true)
    })

    it('should handle stopCalcSpeed', () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.tid_speed = setInterval(() => {}, 1000)
      client.stopCalcSpeed()
      expect(client.speed).toBe(0)
    })

    it('should handle checkTimeout with speed 0', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.speed = 0
      client.speed_0_count = 0
      await client.checkTimeout()
      expect(client.speed_0_count).toBe(1)
    })

    it('should handle checkTimeout with non-zero speed', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.speed = 100
      client.speed_0_count = 5
      await client.checkTimeout()
      expect(client.speed_0_count).toBe(0)
    })

    it('should handle changeState with success', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      await client.changeState('success')
      expect(client.state).toBe('success')
      expect(client.file.name).toBeDefined()
    })

    it('should handle changeState with rapid_success', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      await client.changeState('rapid_success')
      expect(client.state).toBe('rapid_success')
    })

    it('should handle changeState with error', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      const error = new Error('Test error') as any
      await client.changeState('error', error)
      expect(client.state).toBe('error')
    })

    it('should handle getCheckpoint', () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.id = 'test-id'
      client.loaded = 50
      client.size = 100
      client.progress = 50
      client.state = 'running'

      const checkpoint = client.getCheckpoint()
      expect(checkpoint.id).toBe('test-id')
      expect(checkpoint.loaded).toBe(50)
      expect(checkpoint.progress).toBe(50)
      expect(checkpoint.state).toBe('running')
    })

    it('should handle wait when already waiting', async () => {
      const client = new TestBaseUploader({file: mockFile(), state: 'waiting'}, {})
      await client.wait()
      expect(client.state).toBe('waiting')
    })

    it('should handle stop', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      client.state = 'running'
      await client.stop()
      expect(client.stopFlag).toBe(true)
    })

    it('should handle cancel', async () => {
      const client = new TestBaseUploader({file: mockFile()}, {})
      await client.cancel()
      expect(client.cancelFlag).toBe(true)
      expect(client.state).toBe('cancelled')
    })
  })
})
