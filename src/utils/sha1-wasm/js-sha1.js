/** @format */

import x, * as x2 from './sha1-wasm'

const binding = x || x2

const raw = {
  sha1: binding.cwrap('SHA1_Once', 'null', ['number', 'number', 'number']),
  sha1Init: binding.cwrap('SHA1_Init', 'null', ['number']),
  sha1Update: binding.cwrap('SHA1_Update', 'null', ['number', 'number', 'number']),
  sha1Final: binding.cwrap('SHA1_Final', 'null', ['number', 'number']),
}

let resolve_ready
let isReady
function ready() {
  if (isReady) return
  return new Promise(a => {
    resolve_ready = a
  })
}
binding.onRuntimeInitialized = function () {
  isReady = true
  if (resolve_ready) resolve_ready()
}

export {ready, sha1, createSha1}

// 一次性计算
function sha1(buff) {
  const prevPtr = binding._malloc(41)
  const buffPtr = buffToPtr(buff)

  raw.sha1(prevPtr, buffPtr, buff.length)
  const ret = binding.UTF8ToString(prevPtr)

  binding._free(buffPtr)
  binding._free(prevPtr)

  return ret
}

function createSha1() {
  const prevPtr = binding._malloc(300)
  const resultPtr = binding._malloc(21)
  raw.sha1Init(prevPtr)

  return {
    update(buff) {
      const buffPtr = buffToPtr(buff)
      raw.sha1Update(prevPtr, buffPtr, buff.length)
      binding._free(buffPtr)
    },
    getH() {
      /*
      
      typedef struct
      {
          uint32_t state[5];
          uint32_t count[2];
          unsigned char buffer[64];
      } SHA1_CTX;
      */

      let h0 = binding.HEAPU32[prevPtr / 4]
      let h1 = binding.HEAPU32[prevPtr / 4 + 1]
      let h2 = binding.HEAPU32[prevPtr / 4 + 2]
      let h3 = binding.HEAPU32[prevPtr / 4 + 3]
      let h4 = binding.HEAPU32[prevPtr / 4 + 4]
      return [h0, h1, h2, h3, h4]
      // let h = binding.HEAPU32.subarray(h4, h0 + h1 + h2 + h3 + h4 + 1);
      // return h;
    },
    hex() {
      raw.sha1Final(resultPtr, prevPtr)
      const ret = binding.UTF8ToString(resultPtr)

      binding._free(prevPtr)
      binding._free(resultPtr)
      return ret
    },
  }
}

function buffToPtr(buff) {
  if (
    typeof process === 'object' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node === 'string'
  ) {
    if (typeof buff === 'string') {
      buff = Buffer.from(buff)
    } else if (!Buffer.isBuffer(buff)) {
      throw new Error('Invalid buffer type.')
    }
  } else {
    if (typeof buff === 'string') {
      buff = stringToUint8Array(buff)
    } else if (!(buff instanceof Uint8Array)) {
      throw new Error('Invalid Uint8Array type.')
    }
  }

  const buffPtr = binding._malloc(buff.length + 1)
  binding.writeArrayToMemory(buff, buffPtr)
  return buffPtr
}

function stringToUint8Array(str) {
  var arr = []
  for (var i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i))
  }

  var tmpUint8Array = new Uint8Array(arr)
  return tmpUint8Array
}
