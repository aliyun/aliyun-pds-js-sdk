import {
  ready as shaReady,
  createSha1 as wasmCreateSha1,
  createSha256 as wasmCreateSha256,
} from '../utils/sha-hash/wasm/index'
import {ready as crc64Ready, crc64} from '../utils/crc64/wasm/index'
import {parseSize} from '../utils/Formatter'
import * as NodeContext from './NodeContext'
import {PDSError} from '../utils/PDSError'

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
  get_free_disk_size,

  // deprecated
  calc_sha1,
  calc_sha256,
  calc_file_sha1,
  calc_file_sha256,
  calc_file_parts_sha1,
  calc_file_parts_sha256,

  // for test
  _parse_free_size_unix,
  _parse_free_size_windows,
  catchOnProgress,
}

function calc_hash(algorithm, str, context) {
  const {crypto} = context || NodeContext
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
  let {fs} = context || NodeContext

  await crc64Ready()
  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  if (total == 0) {
    catchOnProgress(onProgress, 100)
    return '0'
  }

  let stream = fs.createReadStream(file_path, {
    highWaterMark: STREAM_HIGH_WATER_MARK,
  })
  let last = '0'
  let loaded = 0
  let progress = 0
  let last_progress = 0

  await read_stream(
    stream,
    async chunk => {
      loaded += chunk.length
      last = await crc64(chunk, last + '')

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
  return last
}

async function calc_file_hash(algorithm, file_path, size, onProgress, getStopFlag, context) {
  // await ready()
  const {fs, crypto} = context || NodeContext
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
  algorithm == (await shaReady())
  const {fs} = context || NodeContext
  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let hash = algorithm == 'sha1' ? wasmCreateSha1() : wasmCreateSha256()

  let loaded = 0
  let stream
  let lastH = []
  var buf = null
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
          if (buf) {
            buf = Buffer.concat([buf, chunk], buf.length + chunk.length)
          } else {
            buf = chunk
          }

          // 减少js和wasm交互： 攒够 chunkSize 才 update
          if (buf.length >= CHUNK_SIZE) {
            hash.update(buf)
            buf = null
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
        buf = null
      }

      // 获取中间值
      lastH = hash.getH()
    }
  }
  catchOnProgress(onProgress, 100)

  buf = null

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
/* istanbul ignore next  */
async function get_free_disk_size(p, context) {
  var {os, cp} = context

  if (!cp) {
    //兼容 老的客户端没有cp
    return Number.POSITIVE_INFINITY
  }

  if (os.platform() == 'win32') {
    //windows
    return await getFreeDiskSize_win(p, context)
  } else {
    //linux or mac
    return await getFreeDiskSize_unix(p, context)
  }
}
/* istanbul ignore next  */
async function getFreeDiskSize_unix(p, context) {
  var {cp} = context
  try {
    let {stdout} = await cp_exec(cp, 'df -hl')
    let num = _parse_free_size_unix(stdout.trim(), p)
    return num
  } catch (e) {
    console.warn(e)
    // throw new Error('Failed to get free disk size, path=' + p)
    return Infinity
  }
}
/* istanbul ignore next  */
async function getFreeDiskSize_win(p, context) {
  var {path, cp} = context
  try {
    // 挂载盘格式： \\Client\$e\abc\
    // 正常驱动格式:  C:\\Users\\zb\\
    if (!/^[a-z]:/i.test(p)) return Infinity

    var driver = path.parse(p).root.substring(0, 2)
    let {stdout} = await cp_exec(cp, driver + ' && cd / && dir')
    let num = _parse_free_size_windows(stdout.trim())
    return num
  } catch (e) {
    console.warn(e)
    // throw new Error('Failed to get free disk size, path=' + p)
    return Infinity
  }
}
/* istanbul ignore next  */
function cp_exec(cp, str) {
  return new Promise((resolve, reject) => {
    cp.exec(str, function (err, stdout, stderr) {
      // console.log(err, '--stdout:', stdout, '--stderr:', stderr)
      if (err) reject(err)
      else resolve({stdout, stderr})
    })
  })
}

function _parse_free_size_windows(str) {
  var num
  var arr = str.trim().split('\n')
  var lastLine = arr.slice(arr.length - 1)
  lastLine = (lastLine + '').trim()

  num = lastLine.match(/\s+([\d,]+)\s+/)[1]
  num = parseInt(num.replace(/,/g, ''))
  /* istanbul ignore else */
  if (num != null) return num
  else throw new Error('Failed to get free disk size')
}

function _parse_free_size_unix(str, p) {
  var size

  var arr = str.trim().split('\n')
  arr.splice(0, 1)

  var t = []
  for (let n of arr) {
    var arr2 = n.split(/\s+/)
    t.push({
      pre: arr2[arr2.length - 1],
      freeSize: arr2[3],
      deep: arr2[arr2.length - 1].split('/').length,
    })
  }

  t.sort((a, b) => {
    if (a.deep < b.deep) return 1
    else return -1
  })

  for (let n of t) {
    if (p.startsWith(n.pre)) {
      size = parseSize(n.freeSize)
      break
    }
  }
  /* istanbul ignore else */
  if (size != null) return size
  else throw new Error('Failed to get free disk size')
}

/**
 * @deprecated please use calc_hash instead
 */
async function calc_sha1(buf, context) {
  return await calc_hash('sha1', buf, context)
}
/**
 * @deprecated please use calc_hash instead
 */
async function calc_file_sha1(file, preSize, onProgress, getStopFlag, context) {
  return await calc_file_hash('sha1', file, preSize, onProgress, getStopFlag, context) // 串行
}
/**
 * @deprecated please use calc_file_parts_hash instead
 */
async function calc_file_parts_sha1(file, parts, onProgress, getStopFlag, context) {
  return await calc_file_parts_hash('sha1', file, parts, onProgress, getStopFlag, context) // 并行，按part计算中间值
}
/**
 * @deprecated please use calc_hash instead
 */
async function calc_sha256(buf, context) {
  return await calc_hash('sha256', buf, context)
}

/**
 * @deprecated please use calc_file_hash instead
 */
async function calc_file_sha256(file, preSize, onProgress, getStopFlag, context) {
  return await calc_file_hash('sha256', file, preSize, onProgress, getStopFlag, context) // 串行
}
/**
 * @deprecated please use calc_file_parts_hash instead
 */
async function calc_file_parts_sha256(file, parts, onProgress, getStopFlag, context) {
  return await calc_file_parts_hash('sha256', file, parts, onProgress, getStopFlag, context) // 并行，按part计算中间值
}
