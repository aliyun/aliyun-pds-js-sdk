import {
  wasm_calc_file_hash,
  wasm_calc_file_hash_parts,
  wasm_calc_hash,
  wasm_calc_crc64,
  wasm_calc_file_crc64,
} from './browser-wasm-hash'
import {worker_calc_file_hash, worker_calc_file_parts_hash, worker_calc_file_crc64} from './browser-worker-hash'
import {PDSError} from '../PDSError'

function getCalcType() {
  return (window as any).PDS_CALC_HASH_TYPE || 'worker' //  'worker' | 'wasm'
}
type TAlgorithm = 'sha1' | 'sha256'

export {calc_hash, calc_file_hash, calc_file_parts_hash, calc_crc64, calc_file_crc64}

async function calc_crc64(u8arr: Uint8Array | string | ArrayBuffer, last: string = '0') {
  if (u8arr instanceof Uint8Array) return await wasm_calc_crc64(u8arr, last)
  else if (u8arr instanceof ArrayBuffer) return await wasm_calc_crc64(new Uint8Array(u8arr), last)
  else if (typeof u8arr == 'string') {
    return await wasm_calc_crc64(new TextEncoder().encode(u8arr), last)
  } else {
    throw new PDSError('Invalid input', 'Invalid')
  }
}

async function calc_hash(algorithm: TAlgorithm, u8arr: Uint8Array | string | ArrayBuffer) {
  if (u8arr instanceof Uint8Array) return await wasm_calc_hash(algorithm, u8arr)
  else if (u8arr instanceof ArrayBuffer) return await wasm_calc_hash(algorithm, new Uint8Array(u8arr))
  else if (typeof u8arr == 'string') {
    return await wasm_calc_hash(algorithm, new TextEncoder().encode(u8arr))
  } else {
    throw new PDSError('Invalid input', 'Invalid')
  }
}
async function calc_file_crc64(file, onProgress, getStopFlag) {
  const calc_type = getCalcType()
  if (calc_type === 'worker') {
    if (typeof Worker !== 'undefined') {
      // 当前浏览器支持worker
      console.debug('[worker_calc_file_crc64]:')
      return await worker_calc_file_crc64(file, onProgress, getStopFlag)
    } else {
      // 降级wasm
      // wasm
      console.debug('[wasm_calc_file_crc64]:')
      return await wasm_calc_file_crc64(file, onProgress, getStopFlag)
    }
  } else {
    // wasm
    console.debug('[wasm_calc_file_crc64]:')
    return await wasm_calc_file_crc64(file, onProgress, getStopFlag)
  }
}

async function calc_file_hash(algorithm: TAlgorithm, file, pre_size, onProgress, getStopFlag) {
  const calc_type = getCalcType()
  if (calc_type === 'worker') {
    if (typeof Worker !== 'undefined') {
      // 当前浏览器支持worker
      console.debug('[worker_calc_file_hash]:', algorithm)
      return await worker_calc_file_hash(algorithm, file, pre_size, onProgress, getStopFlag)
    } else {
      // 降级wasm
      // wasm
      console.debug('[wasm_calc_file_hash]:', algorithm)
      return await wasm_calc_file_hash(algorithm, file, pre_size, onProgress, getStopFlag)
    }
  } else {
    // wasm
    console.debug('[wasm_calc_file_hash]:', algorithm)

    return await wasm_calc_file_hash(algorithm, file, pre_size, onProgress, getStopFlag)
  }
}

async function calc_file_parts_hash(algorithm: TAlgorithm, file, parts, onProgress, getStopFlag) {
  const calc_type = getCalcType()

  if (calc_type === 'worker') {
    if (typeof Worker !== 'undefined') {
      // 当前浏览器支持worker
      console.debug('[worker_calc_file_parts_hash]:', algorithm)
      return await worker_calc_file_parts_hash(algorithm, file, parts, onProgress, getStopFlag)
    } else {
      // 降级wasm
      // wasm
      console.debug('[wasm_calc_file_hash_parts]:', algorithm)

      return await wasm_calc_file_hash_parts(algorithm, file, parts, onProgress, getStopFlag)
    }
  } else {
    // wasm
    console.debug('[wasm_calc_file_hash_parts]:', algorithm)

    return await wasm_calc_file_hash_parts(algorithm, file, parts, onProgress, getStopFlag)
  }
}
