/** @format */

import assert = require('assert')
import sinon from 'sinon'
import os = require('os')

import {Downloader} from '../../src/loaders/Downloader'
describe('Downloader', function () { 
  var ctx = {os}
  describe('handleError', function () {
    it('handleError', async () => {
      let client = new Downloader({file: {}}, {}, {}, ctx)
      let e = await client.handleError(new Error('test'))
      assert(e.message == 'test')
    })

    it('cancelFlag', async () => {
      let client = new Downloader({file: {}}, {}, {}, ctx)
      client.cancel()
      let e = await client.handleError(new Error('test'))
      assert(client.state == 'error')
      assert(e.message == 'test')
    })

    it('stop', async () => {
      let client = new Downloader({file: {}}, {}, {}, ctx)

      let e = await client.handleError(new Error('stopped'))
      assert(client.state == 'stopped')
      assert(e.message == 'stopped')
    })
  })
})
