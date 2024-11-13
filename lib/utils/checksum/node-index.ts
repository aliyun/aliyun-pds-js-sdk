import {
  createSha1 as wasmCreateSha1,
  createSha256 as wasmCreateSha256,
  crc64,
  createCrc64 as wasmCreateCrc64,
} from './wasm/index-node.js'
// import {ready as crc64Ready, crc64} from '../utils/crc64/wasm/index'
// import {parseSize} from '../Formatter'
// import * as NodeContext from './NodeContext'
import {PDSError} from '../PDSError'

const CHUNK_SIZE = 512 * 1024 // 512KB
const PROGRESS_EMIT_STEP = 0.2 // 进度超过多少,回调onProgress
const STREAM_HIGH_WATER_MARK = 512 * 1024 // 512KB

export {
  // sha1, sha256
  calc_hash,
  calc_file_hash, // 串行
  calc_file_parts_hash, // 并行，按part计算中间值
  // crc64
  calc_crc64,
  calc_file_crc64,
  catchOnProgress,
}

function calc_hash(algorithm, str, context) {
  const {crypto} = context
  return crypto.createHash(algorithm).update(Buffer.from(str)).digest('hex').toUpperCase()
}
async function calc_crc64(str, last) {
  return await crc64(Buffer.from(str), last)
}

/**
 * node.js 计算crc64
 * @param {string} file_path 本地文件路径
 * @param {Function} onProgress  进度回调方法， onProgress(prog:int) prog 取值 0-100
 * @param {Function} getStopFlag  返回 stopFlag 的值，用于暂停计算。 注意: stopFlag 为true，会 throw new PDSError('stopped', 'stopped')
 * @returns {string} 返回文件的 crc64 值，应为 bigint 的 string 类型
 */
async function calc_file_crc64(file_path, onProgress, getStopFlag, context) {
  let {fs} = context

  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  if (total == 0) {
    catchOnProgress(onProgress, 100)
    return '0'
  }

  let hash = await wasmCreateCrc64()
  let stream = fs.createReadStream(file_path, {
    highWaterMark: STREAM_HIGH_WATER_MARK,
  })
  // let last = '0'
  let loaded = 0
  let progress = 0
  let last_progress = 0

  await read_stream(
    stream,
    async chunk => {
      loaded += chunk.length
      hash.update(chunk)
      // last = await crc64(chunk, last + '')

      // 进度
      progress = (loaded * 100) / total
      if (progress - last_progress >= PROGRESS_EMIT_STEP) {
        catchOnProgress(onProgress, progress)

        last_progress = progress
      }
    },
    getStopFlag,
  )
  catchOnProgress(onProgress, 100)
  // return last
  return hash.end()
}

async function calc_file_hash(algorithm, file_path, size, onProgress, getStopFlag, context) {
  // await ready()
  const {fs, crypto} = context
  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  // 如果不需要中间值，直接使用内置模块crypto效率更高。
  let hash = crypto.createHash(algorithm)
  // let hash = createSha1()

  const opt = {
    highWaterMark: STREAM_HIGH_WATER_MARK,
  }
  if (size) {
    Object.assign(opt, {start: 0, end: size - 1})
  }

  let loaded = 0
  let progress = 0
  let last_progress = 0
  const input = fs.createReadStream(file_path, opt)

  await read_stream(
    input,
    chunk => {
      loaded += Buffer.byteLength(chunk)
      hash.update(chunk)

      // 进度
      progress = (loaded * 100) / total
      if (progress - last_progress >= PROGRESS_EMIT_STEP) {
        catchOnProgress(onProgress, progress)
        last_progress = progress
      }
    },
    getStopFlag,
  )
  catchOnProgress(onProgress, 100)
  return hash.digest('hex').toUpperCase()
}

function catchOnProgress(onProgress, progress) {
  try {
    onProgress(progress)
  } catch (e) {
    console.error(e)
  }
}

async function calc_file_parts_hash(algorithm, file_path, parts, onProgress, getStopFlag, context) {
  const {fs} = context
  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let hash = algorithm == 'sha1' ? await wasmCreateSha1() : await wasmCreateSha256()

  let loaded = 0
  let stream
  let lastH: number[] = []
  var buf = Buffer.from('')
  let progress = 0
  let last_progress = 0

  for (let n of parts) {
    if (getStopFlag()) {
      throw new PDSError('stopped', 'stopped')
    }
    // 中间值
    n[`parallel_${algorithm}_ctx`] = {
      h: [...lastH],
      part_offset: n.from,
    }

    if (n.part_size == 0) hash.update('')
    else {
      stream = fs.createReadStream(file_path, {
        start: n.from,
        end: n.to - 1,
        highWaterMark: STREAM_HIGH_WATER_MARK,
      })

      await read_stream(
        stream,
        chunk => {
          buf = Buffer.concat([buf, chunk], buf.length + chunk.length)

          // 减少js和wasm交互： 攒够 chunkSize 才 update
          if (buf.length >= CHUNK_SIZE) {
            hash.update(buf)
            buf = Buffer.from('')
          }

          loaded += chunk.length

          // 进度
          progress = (loaded * 100) / total
          if (progress - last_progress >= PROGRESS_EMIT_STEP) {
            catchOnProgress(onProgress, progress)
            last_progress = progress
          }
        },
        getStopFlag,
      )

      if (buf && buf.length > 0) {
        hash.update(buf)

        buf = Buffer.from('')
      }

      // 获取中间值
      lastH = hash.getH() as number[]
    }
  }
  catchOnProgress(onProgress, 100)

  buf = Buffer.from('')

  return {
    part_info_list: parts,
    content_hash: hash.hex(),
    content_hash_name: algorithm,
  }
}

async function read_stream(readable, onData, getStopFlag) {
  // let errored = false
  for await (const chunk of readable) {
    if (getStopFlag()) {
      readable.destroy()
      throw new PDSError('stopped', 'stopped')
    }
    try {
      await onData(chunk)
    } catch (e) {
      readable.destroy()
      throw e
    }
  }
}
