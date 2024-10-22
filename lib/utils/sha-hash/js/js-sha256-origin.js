import * as Sha256 from 'js-sha256'

function ready() {}

export {ready, sha256, createSha256}

// 一次性计算
function sha256(buff) {
  return Sha256.create().update(buff).hex().toUpperCase()
}

function createSha256() {
  var hash = Sha256.create()

  return {
    update(buff) {
      hash.update(buff)
    },
    getH() {
      var h = []
      for (let i = 0; i < 8; i++) {
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
