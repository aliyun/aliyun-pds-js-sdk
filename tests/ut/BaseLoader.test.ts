/** @format */

import assert = require('assert')

import {BaseLoader} from '../../src/loaders/BaseLoader'
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
      assert('ok')
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
      assert('ok')
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
      assert('ok')
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
      assert('ok')
    })

    it('HostingMode', async () => {
      let m = {
        task: {start: 1640959773342, end: 1640959773739},
        crc64: {start: 1640959773342, end: 1640959773345},
        'createFile-q1furbbtij': {start: 1640959773343, end: 1640959773427},
        upload: {start: 1640959773427, end: 1640959773739},
        'part-1': {start: 1640959773428, end: 1640959773563},
        'axiosUploadPart-w24566umu8e': {start: 1640959773428, end: 1640959773563},
        'completeFile-n1xq4xecbis': {start: 1640959773563, end: 1640959773738},
      }
      let client = new BaseLoader()
      client._time_logs = m

      await client.printTimeLogs()
      assert('ok')
    })
  })
})
