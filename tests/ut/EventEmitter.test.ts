/** @format */

import assert = require('assert')
import {EventEmitter} from '../../src/utils/EventEmitter'

describe('EventEmitter', function () {
  this.timeout(60000)
  it('test', async () => {
    let ev = new EventEmitter()
    let t = []

    let fn1 = w => {
      t.push('1:' + w)
    }
    ev.on('test', fn1)
    ev.on('test', w => {
      t.push('2:' + w)
    })

    ev.emit('test', '1')
    ev.emit('test', '2')

    await new Promise(a => setTimeout(a, 1000))

    assert(t.length == 4)
    assert(t.join(',') == '1:1,2:1,1:2,2:2')

    console.log('------off')

    t = []
    ev.off('test', fn1)
    ev.emit('test', '1')

    await new Promise(a => setTimeout(a, 1000))

    assert(t.length == 1)
    assert(t[0] == '2:1')

    console.log('-----off all')

    t = []
    ev.off('test')
    ev.emit('test', '1')

    await new Promise(a => setTimeout(a, 1000))
    assert(t.length == 0)
  })

  it('error', () => {
    let ev = new EventEmitter()
    try {
      ev.on('test')
      assert.fail('should throw')
    } catch (e) {
      assert(e.message == 'callback is not a function')
    }

    ev.on('test2', () => {}) // 没报错

    ev.on('test', () => {})

    try {
      ev.off('test', 1)
      assert.fail('should throw')
    } catch (e) {
      assert(e.message == 'callback is not a function')
    }
  })
})
