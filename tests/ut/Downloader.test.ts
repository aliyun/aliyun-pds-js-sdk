/** @format */

import assert = require('assert')
import sinon from 'sinon'

import {Downloader} from '../../src/loaders/Downloader'
describe('Downloader', function () {
  describe('handleError', function () {
    it('handleError', async () => {
      let client = new Downloader({file: {}}, {})
      let e = await client.handleError(new Error('test'))
      assert(e.message == 'test')
    })

    it('cancelFlag', async () => {
      let client = new Downloader({file: {}}, {})
      client.cancel()
      let e = await client.handleError(new Error('test'))
      assert(client.state == 'error')
      assert(e.message == 'test')
    })

    it('stop', async () => {
      let client = new Downloader({file: {}}, {})

      let e = await client.handleError(new Error('stopped'))
      assert(client.state == 'stopped')
      assert(e.message == 'stopped')
    })
  })
})
