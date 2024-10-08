import {ready as crc64Ready, crc64} from './wasm/index-browser'
import {read_block, slice_file} from '../FileReaderUtil'

const CHUNK_SIZE = 512 * 1024 // 512KB
const PROGRESS_EMIT_STEP = 0.2 // 进度超过多少,回调onProgress

export {calc_crc64, calc_file_crc64}
async function calc_crc64(buf, last = '0') {
  return await crc64(buf, last)
}

async function calc_file_crc64(file, onProgress, getStopFlag, opt?: {chunkSize: number}) {
  await crc64Ready()

  let {chunkSize = CHUNK_SIZE} = opt || {}

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let total = file.size

  var chunksNum = Math.ceil(total / chunkSize)

  let loaded = 0
  let last = '0'
  let progress = 0
  let last_progress = 0

  for (let i = 0; i < chunksNum; i++) {
    var start = i * chunkSize
    var end = start + chunkSize
    end = Math.min(end, total)

    await read_block(
      slice_file(file, start, end),
      chunkSize,
      async buf => {
        // 计算
        last = await crc64(buf, last + '')
        loaded += buf.length

        // 进度
        progress = (loaded * 100) / total
        if (progress - last_progress >= PROGRESS_EMIT_STEP) {
          try {
            onProgress(progress)
          } catch (e) {
            console.error(e)
          }
          last_progress = progress
        }
      },
      getStopFlag,
    )
  }
  onProgress(100)
  return last
}
