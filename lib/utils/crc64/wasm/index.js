import {out as binding} from './crc64-wasm'

import {buffToPtr} from '../../NodeWasmUtil'

const raw = {
  crc64Init: binding.cwrap('crc64_init', 'null', []),
  crc64: binding.cwrap('crc64', 'null', ['number', 'number', 'number']),
  strToUint64Ptr: binding.cwrap('str_to_uint64', 'null', ['number', 'number']),
  uint64PtrToStr: binding.cwrap('uint64_to_str', 'null', ['number', 'number']),
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
  raw.crc64Init()
  /* istanbul ignore next */
  if (resolve_ready) resolve_ready()
}

function strToUint64Ptr(str) {
  const strPtr = binding._malloc(str.length + 1)
  binding.stringToUTF8(str, strPtr, str.length + 1)

  const uint64Ptr = binding._malloc(8)
  raw.strToUint64Ptr(strPtr, uint64Ptr)
  safeFree(strPtr)

  return uint64Ptr
}

function uint64PtrToStr(uint64Ptr) {
  const strPtr = binding._malloc(32)
  raw.uint64PtrToStr(strPtr, uint64Ptr)
  const str = binding.UTF8ToString(strPtr)
  safeFree(strPtr)
  return str
}
/**
 *
 * @param {Buffer|string} buff  要计算的 buffer或者string
 * @param {string} prev  上一次的 crc64 结果, 值应为 bigint 的 string
 * @returns
 */
function crc64(buff, prev = '0') {
  const prevPtr = strToUint64Ptr(prev)
  const buffPtr = buffToPtr(buff, binding)

  raw.crc64(prevPtr, buffPtr, buff.length)
  const ret = uint64PtrToStr(prevPtr)

  safeFree(prevPtr)
  safeFree(buffPtr)

  return ret
}

function safeFree(prevPtr) {
  try {
    binding._free(prevPtr)
  } catch (e) {
    /* istanbul ignore next */
    console.warn('wasm _free error:', e)
  }
}

export {ready, crc64}
