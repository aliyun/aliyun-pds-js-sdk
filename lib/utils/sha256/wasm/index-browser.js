import {out as binding} from './sha256-wasm'

import {buffToPtr} from '../../BrowserWasmUtil'

const raw = {
  sha256: binding.cwrap('SHA256_Once', 'null', ['number', 'number', 'number']),
  sha256Init: binding.cwrap('SHA256_Init', 'null', ['number']),
  sha256Update: binding.cwrap('SHA256_Update', 'null', ['number', 'number', 'number']),
  sha256Final: binding.cwrap('SHA256_Final', 'null', ['number', 'number']),
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

export {ready, sha256, createSha256}

// 一次性计算
async function sha256(buff) {
  await ready()
  const prevPtr = binding._malloc(70)
  const buffPtr = buffToPtr(buff, binding)

  raw.sha256(prevPtr, buffPtr, buff.length)
  const ret = binding.UTF8ToString(prevPtr)

  safeFree(buffPtr)
  safeFree(prevPtr)

  return ret.toUpperCase()
}

function createSha256() {
  const prevPtr = binding._malloc(600)
  raw.sha256Init(prevPtr)
  let ret
  return {
    update(buff) {
      if (ret) throw Error('cannot call update() after hex()')
      const buffPtr = buffToPtr(buff, binding)
      raw.sha256Update(prevPtr, buffPtr, buff.length)
      safeFree(buffPtr)
    },
    getH() {
      /* 
      typedef struct {
          uint32_t hash[8];
          uint8_t  buf[64];
          uint32_t bits[2];
          uint32_t len;
          uint32_t rfu__;
          uint32_t W[64];
      } sha256_context;
      */
      // 根据结构体第一个变量内存地址取值
      let h0 = binding.HEAPU32[prevPtr / 4]
      let h1 = binding.HEAPU32[prevPtr / 4 + 1]
      let h2 = binding.HEAPU32[prevPtr / 4 + 2]
      let h3 = binding.HEAPU32[prevPtr / 4 + 3]
      let h4 = binding.HEAPU32[prevPtr / 4 + 4]
      let h5 = binding.HEAPU32[prevPtr / 4 + 5]
      let h6 = binding.HEAPU32[prevPtr / 4 + 6]
      let h7 = binding.HEAPU32[prevPtr / 4 + 7]
      return [h0, h1, h2, h3, h4, h5, h6, h7]
    },
    hex() {
      if (ret) {
        safeFree(prevPtr)
        return ret
      }

      const resultPtr = binding._malloc(70)
      raw.sha256Final(resultPtr, prevPtr)
      ret = binding.UTF8ToString(resultPtr)

      safeFree(resultPtr)
      safeFree(prevPtr)

      return ret.toUpperCase()
    },
    free(prevPtr) {
      safeFree(prevPtr)
    },
  }
}

function safeFree(prevPtr) {
  try {
    binding._free(prevPtr)
  } catch (e) {
    console.warn('wasm _free error:', e)
  }
}
