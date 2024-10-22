import {calc_hash, calc_file_hash, calc_file_parts_hash} from '../utils/sha-hash/browser-index'
import {calc_crc64, calc_file_crc64} from '../utils/crc64/browser-index'

export {
  // crc64
  calc_crc64,
  calc_file_crc64,

  // sha1, sha256
  calc_hash,
  calc_file_hash,
  calc_file_parts_hash,

  // deprecated
  calc_sha1,
  calc_sha256,
  calc_file_sha1,
  calc_file_sha256,
  calc_file_parts_sha1,
  calc_file_parts_sha256,
}

/**
 * @deprecated please use calc_hash instead
 */
async function calc_sha1(buf) {
  return await calc_hash('sha1', buf)
}
/**
 * @deprecated please use calc_hash instead
 */
async function calc_file_sha1(file, preSize, onProgress, getStopFlag) {
  return await calc_file_hash('sha1', file, preSize, onProgress, getStopFlag) // 串行
}
/**
 * @deprecated please use calc_file_parts_hash instead
 */
async function calc_file_parts_sha1(file, parts, onProgress, getStopFlag) {
  return await calc_file_parts_hash('sha1', file, parts, onProgress, getStopFlag) // 并行，按part计算中间值
}
/**
 * @deprecated please use calc_hash instead
 */
async function calc_sha256(buf) {
  return await calc_hash('sha256', buf)
}

/**
 * @deprecated please use calc_file_hash instead
 */
async function calc_file_sha256(file, preSize, onProgress, getStopFlag) {
  return await calc_file_hash('sha256', file, preSize, onProgress, getStopFlag) // 串行
}
/**
 * @deprecated please use calc_file_parts_hash instead
 */
async function calc_file_parts_sha256(file, parts, onProgress, getStopFlag) {
  return await calc_file_parts_hash('sha256', file, parts, onProgress, getStopFlag) // 并行，按part计算中间值
}
