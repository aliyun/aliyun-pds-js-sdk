/** @format */
const crypto = require('crypto')
const fs = require('fs')
const {readStream} = require('../StreamUtil.js')
const PROGRESS_EMIT_STEP = 0.1

module.exports = {
  run,
}

async function run(obj, sendMessage) {
  try {
    let {file_path, size, highWaterMark, progress_emit_step = PROGRESS_EMIT_STEP} = obj

    let total = fs.statSync(file_path).size
    let hash = crypto.createHash('sha1')

    let opt = {highWaterMark}
    if (size) {
      Object.assign(opt, {start: 0, end: size - 1})
    }

    let stream = fs.createReadStream(file_path, opt) //opt

    let loaded = 0
    let progress = 0
    let last_progress = 0
    await readStream(
      stream,
      chunk => {
        loaded += Buffer.byteLength(chunk)
        hash.update(chunk)

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
      result: hash.digest('hex').toUpperCase(),
    })
  } catch (e) {
    console.error(__filename + ' error:', e)
    sendMessage({type: 'error', error: e.stack})
  }
}
