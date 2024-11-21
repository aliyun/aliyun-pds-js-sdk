import {out as binding} from './wasm.js'

import {buffToPtr} from '../../BrowserWasmUtil'

const raw = {
  sha1: binding.cwrap('SHA1_Once', 'null', ['number', 'number', 'number']),
  sha1Init: binding.cwrap('SHA1_Init', 'null', ['number']),
  sha1Update: binding.cwrap('SHA1_Update', 'null', ['number', 'number', 'number']),
  sha1Final: binding.cwrap('SHA1_Final', 'null', ['number', 'number']),

  sha256: binding.cwrap('SHA256_Once', 'null', ['number', 'number', 'number']),
  sha256Init: binding.cwrap('SHA256_Init', 'null', ['number']),
  sha256Update: binding.cwrap('SHA256_Update', 'null', ['number', 'number', 'number']),
  sha256Final: binding.cwrap('SHA256_Final', 'null', ['number', 'number']),

  crc64Init: binding.cwrap('CRC64_Init', 'null', []),
  crc64: binding.cwrap('CRC64', 'null', ['number', 'number', 'number']),
  strToUint64Ptr: binding.cwrap('Str_To_Uint64', 'null', ['number', 'number']),
  uint64PtrToStr: binding.cwrap('Uint64_To_Str', 'null', ['number', 'number']),
}

let resolve_ready
let isReady

/* istanbul ignore next */
async function ready() {
  if (isReady) return
  await new Promise(a => {
    resolve_ready = a
  })
}
binding.onRuntimeInitialized = function () {
  isReady = true
  /* istanbul ignore next */
  if (resolve_ready) resolve_ready()
}
// binding.onRuntimeInitialized()

let isCrc64Ready
function crc64Ready() {
  if (isCrc64Ready) return
  raw.crc64Init()
  isCrc64Ready = true
}

export {sha1, sha256, createSha1, createSha256, crc64, createCrc64}

// 一次性计算
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

async function createSha1() {
  await ready()
  const prevPtr = binding._malloc(300)
  raw.sha1Init(prevPtr)
  let ret
  return {
    update(buff) {
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
    free(prevPtr) {
      safeFree(prevPtr)
    },
  }
}

async function createSha256() {
  await ready()

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

/**
 *
 * @param {Buffer|string} buff  要计算的 buffer或者string
 * @param {string} prev  上一次的 crc64 结果, 值应为 bigint 的 string
 * @returns
 */
async function crc64(buff, prev = '0') {
  await ready()
  crc64Ready()

  const prevPtr = strToUint64Ptr(prev || '0')
  const buffPtr = buffToPtr(buff, binding)

  raw.crc64(prevPtr, buffPtr, buff.length)
  const ret = uint64PtrToStr(prevPtr)

  binding._free(prevPtr)
  binding._free(buffPtr)

  return ret
}

async function createCrc64() {
  await ready()
  crc64Ready()

  const crcPtr = strToUint64Ptr('0')
  let crcPtrFreed = false

  return {
    update(chunk) {
      const buffPtr = buffToPtr(chunk, binding)
      raw.crc64(crcPtr, buffPtr, chunk.length)
      binding._free(buffPtr)
      return this
    },
    end() {
      const ret = uint64PtrToStr(crcPtr)
      this.free()
      return ret
    },
    free() {
      try {
        if (!crcPtrFreed) {
          binding._free(crcPtr)
          crcPtrFreed = true
        }
      } catch (e) {
        console.warn('crc64File free pointor error:', e)
      }
    },
  }
}

function strToUint64Ptr(str) {
  const strPtr = binding._malloc(str.length + 1)
  binding.stringToUTF8(str, strPtr, str.length + 1)

  const uint64Ptr = binding._malloc(8)
  raw.strToUint64Ptr(strPtr, uint64Ptr)
  binding._free(strPtr)

  return uint64Ptr
}

function uint64PtrToStr(uint64Ptr) {
  const strPtr = binding._malloc(32)
  raw.uint64PtrToStr(strPtr, uint64Ptr)
  const str = binding.UTF8ToString(strPtr)
  binding._free(strPtr)
  return str
}
