import {ready as wasmReady, createSha1} from './wasm/index.js'
import {readStream} from '../StreamUtil.js'
import {statSync, createReadStream} from 'fs'

const CHUNK_SIZE = 1024 * 1024
const PROGRESS_EMIT_STEP = 0.1

export {run}

async function run(obj, sendMessage) {
  await wasmReady()
  let hash
  try {
    let {file_path, highWaterMark, parts} = obj

    let total = statSync(file_path).size

    hash = createSha1()
    let loaded = 0
    let stream
    let lastH = []
    var buf = Buffer.allocUnsafe(0)
    let progress = 0
    let last_progress = 0

    for (let n of parts) {
      // 中间值
      n.parallel_sha1_ctx = {
        h: [...lastH],
        part_offset: n.from,
      }

      if (n.part_size == 0) hash.update('')
      else {
        stream = createReadStream(file_path, {start: n.from, end: n.to - 1, highWaterMark})

        await readStream(
          stream,
          chunk => {
            buf = Buffer.concat([buf, chunk], buf.length + chunk.length)
            // 减少js和wasm交互： 攒够 chunkSize 才 update
            if (buf.length >= CHUNK_SIZE) {
              hash.update(buf)
              buf = Buffer.allocUnsafe(0)
            }

            loaded += chunk.length

            // 进度
            progress = (loaded * 100) / total
            if (progress - last_progress >= PROGRESS_EMIT_STEP) {
              sendMessage({type: 'progress', progress})
              last_progress = progress
            }
          },
          () => false,
        )
        // 遗留片
        if (buf.length > 0) {
          hash.update(buf)
          buf = Buffer.allocUnsafe(0)
        }

        // 获取中间值
        lastH = hash.getH()
      }
    }

    buf = null
    // sendMessage({type: 'progress', progress: 100})

    // result
    sendMessage({
      type: 'result',
      result: {
        part_info_list: parts,
        content_hash: hash.hex().toUpperCase(),
        content_hash_name: 'sha1',
      },
    })
  } catch (e) {
    console.error(__filename + ' error:', e)
    sendMessage({type: 'error', error: e.stack})
  } finally {
    if (hash) hash.free()
  }
}
