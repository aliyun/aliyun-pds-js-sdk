import {ready, crc64} from './wasm/index.js'
import {readStream} from '../StreamUtil.js'
import {statSync, createReadStream} from 'fs'

const PROGRESS_EMIT_STEP = 0.1

export {run}

async function run(obj, sendMessage) {
  await ready()
  try {
    let {file_path, highWaterMark, progress_emit_step = PROGRESS_EMIT_STEP} = obj

    let total = statSync(file_path).size

    if (total == 0) {
      // result
      sendMessage({
        type: 'result',
        result: '0',
      })
      return
    }

    let stream = createReadStream(file_path, {highWaterMark}) //opt
    let last = '0'
    let loaded = 0
    let progress = 0
    let last_progress = 0
    await readStream(
      stream,
      chunk => {
        loaded += chunk.length
        last = crc64(chunk, last + '')

        // 进度
        progress = (loaded * 100) / total
        if (progress - last_progress >= progress_emit_step) {
          sendMessage({
            type: 'progress',
            progress: progress,
          })
          last_progress = progress
        }
      },
      () => false,
    )

    // result
    sendMessage({
      type: 'result',
      result: last,
    })
  } catch (e) {
    console.error(__filename + ' error:', e)
    sendMessage({type: 'error', error: e.stack})
  }
}
