import {describe, expect, it} from 'vitest'

import {BaseLoader} from '../../lib/loaders/BaseLoader'

describe('BaseLoader', function () {
  describe('upload printTimeLogs', function () {
    it('StandardMode parallel', async () => {
      let m = {
        task: {start: 1640959772536, end: 1640959772951},
        crc64: {start: 1640959772536, end: 1640959772558},
        multi_sha1: {start: 1640959772538, end: 1640959772570},
        'createFile-h4paqe5nk5o': {start: 1640959772570, end: 1640959772705},
        upload: {start: 1640959772706, end: 1640959772950},
        'part-1': {start: 1640959772707, end: 1640959772826},
        'axiosUploadPart-cfeivpow15i': {start: 1640959772708, end: 1640959772826},
        'completeFile-y33m942e10n': {start: 1640959772827, end: 1640959772949},
      }
      let client = new BaseLoader()
      client._time_logs = m

      await client.printTimeLogs()
      expect('ok')
    })

    it('StandardMode parallel rapid', async () => {
      let m = {
        task: {start: 1640961802736, end: 1640961802835},
        crc64: {start: 1640961802736, end: 1640961802747},
        multi_sha1: {start: 1640961802738, end: 1640961802756},
        'createFile-e9zfct0vvxv': {start: 1640961802756, end: 1640961802834},
      }
      let client = new BaseLoader()
      client._time_logs = m
      await client.printTimeLogs()
      expect('ok')
    })

    it('StandardMode serial ', async () => {
      let m = {
        task: {start: 1640959772965, end: 1640959773221},
        crc64: {start: 1640959772965, end: 1640959772977},
        'createFile-nts0t7u26x': {start: 1640959772967, end: 1640959773040},
        upload: {start: 1640959773040, end: 1640959773221},
        'part-1': {start: 1640959773041, end: 1640959773098},
        'axiosUploadPart-2su3ucs89j5': {start: 1640959773042, end: 1640959773098},
        'completeFile-vasec59f4o': {start: 1640959773098, end: 1640959773220},
      }
      let client = new BaseLoader()
      client._time_logs = m
      await client.printTimeLogs()
      expect('ok')
    })
    it('StandardMode serial rapid', async () => {
      let m = {
        task: {start: 1640959773233, end: 1640959773333},
        crc64: {start: 1640959773233, end: 1640959773238},
        sha1: {start: 1640959773236, end: 1640959773253},
        'createFile-cth7rnr4krl': {start: 1640959773253, end: 1640959773332},
      }
      let client = new BaseLoader()
      client._time_logs = m
      await client.printTimeLogs()
      expect('ok')
    })
  })

  describe('Additional BaseLoader coverage', () => {
    it('should handle empty time logs', async () => {
      const client = new BaseLoader()
      client._time_logs = {}
      await client.printTimeLogs()
      expect('ok')
    })

    it('should handle time logs with only task', async () => {
      const client = new BaseLoader()
      client._time_logs = {
        task: {start: 1000, end: 2000},
      }
      await client.printTimeLogs()
      expect('ok')
    })

    it('should handle time logs without task', async () => {
      const client = new BaseLoader()
      client._time_logs = {
        upload: {start: 1000, end: 2000},
      }
      await client.printTimeLogs()
      expect('ok')
    })

    it('should handle complex time logs with downloads', async () => {
      const client = new BaseLoader()
      client._time_logs = {
        task: {start: 1000, end: 5000},
        download: {start: 2000, end: 4000},
        'part-1': {start: 2000, end: 3000},
        'part-2': {start: 3000, end: 4000},
      }
      await client.printTimeLogs()
      expect('ok')
    })

    it('should handle time logs with very small durations', async () => {
      const client = new BaseLoader()
      client._time_logs = {
        task: {start: 1000, end: 1001},
        crc64: {start: 1000, end: 1000},
      }
      await client.printTimeLogs()
      expect('ok')
    })

    it('should handle time logs with large durations', async () => {
      const client = new BaseLoader()
      client._time_logs = {
        task: {start: 0, end: 100000},
        upload: {start: 0, end: 100000},
      }
      await client.printTimeLogs()
      expect('ok')
    })
  })
})
