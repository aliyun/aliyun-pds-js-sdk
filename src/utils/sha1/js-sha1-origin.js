/** @format */

import * as Sha1 from 'js-sha1'

function ready() {}

export {ready, sha1, createSha1}

// 一次性计算
function sha1(buff) {
  return Sha1.create().update(buff).hex().toUpperCase()
}

function createSha1() {
  var hash = Sha1.create()

  return {
    update(buff) {
      hash.update(buff)
    },
    getH() {
      var h = []
      for (let i = 0; i < 5; i++) {
        const val = hash[`h${i}`] >>> 0
        h.push(val)
      }
      return h
    },
    hex() {
      return hash.hex().toUpperCase()
    },
  }
}
