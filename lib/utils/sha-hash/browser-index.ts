import {js_calc_file_hash, js_calc_file_hash_parts, js_calc_hash} from './browser-js-hash'
import {wasm_calc_file_hash, wasm_calc_file_hash_parts, wasm_calc_hash} from './browser-wasm-hash'
import {worker_calc_file_hash, worker_calc_file_parts_hash} from './browser-worker-hash'
import {PDSError} from '../PDSError'

function getCalcType() {
  return (window as any).PDS_CALC_HASH_TYPE || 'worker' //  'worker' | 'js' | 'wasm'
}
type TAlgorithm = 'sha1' | 'sha256'

export {calc_hash, calc_file_hash, calc_file_parts_hash}
async function calc_hash(algorithm: TAlgorithm, u8arr: Uint8Array | string | ArrayBuffer) {
  if (u8arr instanceof Uint8Array) return await wasm_calc_hash(algorithm, u8arr)
  else if (u8arr instanceof ArrayBuffer) return await wasm_calc_hash(algorithm, new Uint8Array(u8arr))
  else if (typeof u8arr == 'string') {
    return await wasm_calc_hash(algorithm, new TextEncoder().encode(u8arr))
  } else {
    throw new PDSError('Invalid input', 'Invalid')
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
  } else if (calc_type == 'wasm') {
    // wasm
    console.debug('[wasm_calc_file_hash]:', algorithm)

    return await wasm_calc_file_hash(algorithm, file, pre_size, onProgress, getStopFlag)
  } else if (calc_type == 'js') {
    // js
    console.debug('[js_calc_file_hash]:', algorithm)
    return await js_calc_file_hash(algorithm, file, pre_size, onProgress, getStopFlag)
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

      return await wasm_calc_file_hash_parts(algorithm, file, onProgress, getStopFlag)
    }
  } else if (calc_type == 'wasm') {
    // wasm
    console.debug('[wasm_calc_file_hash_parts]:', algorithm)

    return await wasm_calc_file_hash_parts(algorithm, file, parts, onProgress, getStopFlag)
  } else if (calc_type == 'js') {
    // js
    console.debug('[js_calc_file_hash_parts]:', algorithm)

    return await js_calc_file_hash_parts(algorithm, file, parts, onProgress, getStopFlag)
  }
}
