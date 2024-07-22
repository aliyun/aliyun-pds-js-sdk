import {ready as sha1Ready, sha1 as calc_sha1, createSha1} from '../utils/sha1/js-sha1-origin'
import {ready as sha256Ready, sha256 as calc_sha256, createSha256} from '../utils/sha256/js-sha256-origin'
import {ready as crc64Ready, crc64} from '../utils/crc64/wasm/index-browser'
import {PDSError} from '../utils/PDSError'

const CHUNK_SIZE = 512 * 1024 // 512KB
const PROGRESS_EMIT_STEP = 0.2 // 进度超过多少,回调onProgress

export {
  calc_crc64,
  calc_file_crc64,
  calc_sha1,
  calc_file_sha1,
  calc_file_parts_sha1,
  calc_sha256,
  calc_file_sha256,
  calc_file_parts_sha256,
  does_file_exist,

  // for test
  slice_file,
  get_arraybuffer_from_blob,
  read_block,
}
function calc_crc64(buf, last) {
  return crc64(buf, last)
}

async function calc_file_crc64(file, onProgress, getStopFlag, opt) {
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
      buf => {
        // 计算
        last = crc64(buf, last + '')
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

function does_file_exist(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onerror = function () {
      // 文件可能已经被删除
      if (fr.error.message.indexOf('A requested file or directory could not be found') === 0) rej(fr.error)
      else res()
    }
    fr.onabort = fr.onerror
    fr.onload = function () {
      res()
    }
    if (file.size > 0) {
      // 不需要全部load，太占内存
      fr.readAsArrayBuffer(slice_file(file, 0, 1))
    } else {
      fr.readAsArrayBuffer(file)
    }
  })
}

/**
 * 浏览器中计算文件的 sha1
 * @param {*} file  HTML File 对象
 * @param {array} parts
 * @param {Function} onProgress 进度回调: (prog)=>{}  prog 0-1
 * @param {Function} getStopFlag 获取暂停flag，如果返回true
 */
async function calc_file_parts_sha1(file, parts, onProgress, getStopFlag) {
  return await _calc_file_parts_sha('sha1', file, parts, onProgress, getStopFlag)
}
/**
 * 浏览器中计算文件的 sha256
 * @param {*} file  HTML File 对象
 * @param {array} parts
 * @param {Function} onProgress 进度回调: (prog)=>{}  prog 0-1
 * @param {Function} getStopFlag 获取暂停flag，如果返回true
 */
async function calc_file_parts_sha256(file, parts, onProgress, getStopFlag) {
  return await _calc_file_parts_sha('sha256', file, parts, onProgress, getStopFlag)
}

async function _calc_file_parts_sha(type, file, parts, onProgress, getStopFlag) {
  type == 'sha1' ? await sha1Ready() : await sha256Ready()

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let hash = type == 'sha1' ? createSha1() : createSha256()

  let total = file.size

  let loaded = 0
  let lastH = []
  let progress = 0
  let last_progress = 0

  for (let n of parts) {
    if (getStopFlag()) {
      throw new PDSError('stopped', 'stopped')
    }
    // 中间值
    n[`parallel_${type}_ctx`] = {
      h: [...lastH],
      part_offset: n.from,
    }

    await read_block(
      slice_file(file, n.from, n.to),
      CHUNK_SIZE,
      buf => {
        hash.update(buf)
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
    lastH = hash.getH()
  }

  onProgress(100)
  return {
    part_info_list: parts,
    content_hash: hash.hex().toUpperCase(),
    content_hash_name: type,
  }
}

/**
 * 浏览器中计算文件的 sha1
 * @param {*} file  HTML File 对象
 * @param {number} preSize 只计算前面 0-preSize， 如果preSize为0，则计算整个文件
 * @param {Function} onProgress 进度回调: (prog)=>{}  prog 0-1
 * @param {Function} getStopFlag 获取暂停flag，如果返回true
 */
async function calc_file_sha1(file, preSize, onProgress, getStopFlag) {
  return await _calc_file_sha('sha1', file, preSize, onProgress, getStopFlag)
}
/**
 * 浏览器中计算文件的 sha256
 * @param {*} file  HTML File 对象
 * @param {number} preSize 只计算前面 0-preSize， 如果preSize为0，则计算整个文件
 * @param {Function} onProgress 进度回调: (prog)=>{}  prog 0-1
 * @param {Function} getStopFlag 获取暂停flag，如果返回true
 */
async function calc_file_sha256(file, preSize, onProgress, getStopFlag) {
  return await _calc_file_sha('sha256', file, preSize, onProgress, getStopFlag)
}
async function _calc_file_sha(type, file, preSize, onProgress, getStopFlag) {
  type == 'sha1' ? await sha1Ready() : await sha256Ready()

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let hash = type == 'sha1' ? createSha1() : createSha256()

  let blob

  if (preSize) {
    // 预秒传只需计算前1000KB
    blob = slice_file(file, 0, preSize)
  } else {
    //计算整个文件的
    blob = file
  }

  let progress = 0
  let last_progress = 0
  await read_block(
    blob,
    CHUNK_SIZE,
    (buf, loaded, total) => {
      hash.update(buf)

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
  onProgress(100)

  return hash.hex().toUpperCase()
}

function slice_file(file, start, end) {
  var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
  return blobSlice.call(file, start, end)
}

async function read_block(blob, chunkSize, onChunkData, getStopFlag) {
  getStopFlag = getStopFlag || (() => false)

  let size = blob.size
  let len = Math.ceil(size / chunkSize)
  let start = 0
  let end
  var fileReader = new FileReader()
  for (let i = 0; i < len; i++) {
    if (getStopFlag()) {
      throw new PDSError('stopped', 'stopped')
    }
    start = i * chunkSize
    end = Math.min(start + chunkSize, size)
    let buf = await get_arraybuffer_from_blob(blob.slice(start, end), fileReader)
    await onChunkData(new Uint8Array(buf), end, size)
  }
}

function get_arraybuffer_from_blob(blob, fileReader) {
  return new Promise((a, b) => {
    // var fileReader = new FileReader()
    fileReader.onload = e => a(e.target.result)
    fileReader.onerror = e => b(e.target.error)
    fileReader.readAsArrayBuffer(blob)
  })
}
