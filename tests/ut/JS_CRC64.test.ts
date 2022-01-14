/** @format */

import assert = require('assert')
import JS_CRC64 = require('../../src/utils/JS_CRC64')

import fs = require('fs')
import path = require('path')

describe('CRC64', function () {
  this.timeout(60 * 1000)

  describe('crc64', async () => {
    it('success', () => {
      let start = Date.now()
      const ret = JS_CRC64.crc64('abc')
      console.log('result', ret, Date.now() - start)
      assert('3231342946509354535' == ret)
    })
  })

  describe('crc64FileNode', () => {
    it('success', async () => {
      let p = path.join(__dirname, 'tmp/tmp-crc64-test.txt')
      fs.writeFileSync(p, 'abc')

      let start = Date.now()
      let result = await JS_CRC64.crc64FileNode(
        p,
        () => {},
        () => {},
        {fs},
      )
      console.log('result:', fs.statSync(p).size, result, Date.now() - start)
      assert('3231342946509354535' == result)
    })

    it('range', async () => {
      let p = path.join(__dirname, 'tmp/tmp-crc64-test-range.txt')
      fs.writeFileSync(p, 'abcdef')

      let start = Date.now()
      let result = await JS_CRC64.crc64FileNode(
        p,
        () => {},
        () => {},
        {fs, start: 0, end: 2},
      )
      console.log('result:', result, Date.now() - start)
      assert('3231342946509354535' == result)
    })

    it('stop', async () => {
      let p = path.join(__dirname, 'tmp/tmp-crc64-test-range.txt')
      fs.writeFileSync(p, 'abcdef')

      try {
        await JS_CRC64.crc64FileNode(
          p,
          (prog: any) => {
            console.log(prog)
          },
          () => {
            // stop 后，不要返回
            return true
          },
          {fs, highWaterMark: 3},
        )
        assert(false, 'should throw stopped')
      } catch (e) {
        if (e.message == 'stopped') {
          assert(true)
        } else assert(false, 'should throw stopped')
      }
    })
    it('prog error', async () => {
      let p = path.join(__dirname, 'tmp/tmp-crc64-test-error.txt')
      fs.writeFileSync(p, 'abcdef')

      try {
        await JS_CRC64.crc64FileNode(
          p,
          (prog: any) => {
            throw new Error('x')
          },
          () => {},
          {fs, highWaterMark: 3},
        )
        assert(false, 'should throw error')
      } catch (e) {
        assert(e.message === 'x')
      }
    })
  })
})
