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

  describe('Additional EventEmitter coverage', () => {
    it('should handle multiple events', () => {
      const ev = new EventEmitter()
      let results = []

      ev.on('event1', data => results.push('e1:' + data))
      ev.on('event2', data => results.push('e2:' + data))

      ev.emit('event1', 'a')
      ev.emit('event2', 'b')

      expect(results).toEqual(['e1:a', 'e2:b'])
    })

    it('should handle removing nonexistent listener', () => {
      const ev = new EventEmitter()
      const fn = () => {}

      expect(() => ev.off('nonexistent', fn)).not.toThrow()
    })

    it('should handle multiple arguments in emit', () => {
      const ev = new EventEmitter()
      let result = null

      ev.on('test', (a, b, c) => {
        result = {a, b, c}
      })

      ev.emit('test', 1, 2, 3)
      expect(result).toEqual({a: 1, b: 2, c: 3})
    })

    it('should handle same callback registered multiple times', () => {
      const ev = new EventEmitter()
      let count = 0
      const fn = () => count++

      ev.on('test', fn)
      ev.on('test', fn)
      ev.emit('test')

      expect(count).toBe(2)
    })

    it('should handle off with nonexistent event', () => {
      const ev = new EventEmitter()
      expect(() => ev.off('nonexistent')).not.toThrow()
    })

    it('should handle emit with no listeners', () => {
      const ev = new EventEmitter()
      expect(() => ev.emit('nonexistent', 'data')).not.toThrow()
    })

    it('should handle listener throwing error', () => {
      const ev = new EventEmitter()
      ev.on('test', () => {
        throw new Error('listener error')
      })

      expect(() => ev.emit('test')).toThrow('listener error')
    })
  })
})
