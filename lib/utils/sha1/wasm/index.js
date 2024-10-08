import {out as binding} from './sha1-wasm'

import {buffToPtr} from '../../NodeWasmUtil'

const raw = {
  sha1: binding.cwrap('SHA1_Once', 'null', ['number', 'number', 'number']),
  sha1Init: binding.cwrap('SHA1_Init', 'null', ['number']),
  sha1Update: binding.cwrap('SHA1_Update', 'null', ['number', 'number', 'number']),
  sha1Final: binding.cwrap('SHA1_Final', 'null', ['number', 'number']),
}

let resolve_ready
let isReady
/* istanbul ignore next */
function ready() {
  if (isReady) return
  return new Promise(a => {
    resolve_ready = a
  })
}
binding.onRuntimeInitialized = function () {
  isReady = true
  /* istanbul ignore next */
  if (resolve_ready) resolve_ready()
}
// fix: node.js 下ut
binding.onRuntimeInitialized()

export {ready, sha1, createSha1}

// 一次性计算
/* istanbul ignore next  */
async function sha1(buff) {
  await ready()
  const prevPtr = binding._malloc(41)
  const buffPtr = buffToPtr(buff, binding)

  raw.sha1(prevPtr, buffPtr, buff.length)
  const ret = binding.UTF8ToString(prevPtr)

  safeFree(buffPtr)
  safeFree(prevPtr)

  return ret.toUpperCase()
}

function createSha1() {
  const prevPtr = binding._malloc(300)
  raw.sha1Init(prevPtr)
  let ret
  return {
    update(buff) {
      /* istanbul ignore next  */
      if (ret) throw Error('cannot call update() after hex()')
      const buffPtr = buffToPtr(buff, binding)
      raw.sha1Update(prevPtr, buffPtr, buff.length)
      safeFree(buffPtr)
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
      /* istanbul ignore next  */

      if (ret) {
        safeFree(prevPtr)
        return ret
      }

      const resultPtr = binding._malloc(30)
      raw.sha1Final(resultPtr, prevPtr)
      ret = binding.UTF8ToString(resultPtr)

      safeFree(resultPtr)
      safeFree(prevPtr)

      return ret.toUpperCase()
    },
    /* istanbul ignore next  */

    free(prevPtr) {
      safeFree(prevPtr)
    },
  }
}

function safeFree(prevPtr) {
  try {
    binding._free(prevPtr)
  } catch (e) {
    /* istanbul ignore next  */
    console.warn('wasm _free error:', e)
  }
}
