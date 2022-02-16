/** @format */

import assert = require('assert')

import WASM_SHA1 = require('../../src/utils/sha1/wasm')

describe('utils/sha1/wasm/', function () {
  this.timeout(60 * 1000)

  describe('sha1', () => {
    it('sha1', async () => {
      let result = await WASM_SHA1.sha1('abc')
      assert(result == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
  })

  describe('createSha1', () => {
    it('createSha1', async () => {
      let hash = await WASM_SHA1.createSha1()
      hash.update('abc')
      let h = hash.getH()
      assert(h[0] == 1732584193)
      assert(h[1] == 4023233417)
      assert(h[2] == 2562383102)
      assert(h[3] == 271733878)
      assert(h[4] == 3285377520)
      let result = hash.hex()
      assert(result == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
  })
})
