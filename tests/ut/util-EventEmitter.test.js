import {EventEmitter} from '../../lib/utils/EventEmitter'
import {describe, expect, it} from 'vitest'

describe('EventEmitter', function () {
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

    expect(t.length).toBe(4)
    expect(t.join(',')).toEqual('1:1,2:1,1:2,2:2')

    console.log('------off')

    t = []
    ev.off('test', fn1)
    ev.emit('test', '1')

    await new Promise(a => setTimeout(a, 1000))

    expect(t.length).toBe(1)
    expect(t[0]).toEqual('2:1')

    console.log('-----off all')

    t = []
    ev.off('test')
    ev.emit('test', '1')

    await new Promise(a => setTimeout(a, 1000))
    expect(t.length).toBe(0)
  })

  it('error', () => {
    let ev = new EventEmitter()

    expect(() => ev.on('test')).toThrowError('callback is not a function')

    ev.on('test2', () => {}) // 没报错

    ev.on('test', () => {})

    expect(() => ev.off('test', 1)).toThrowError('callback is not a function')
  })
})
