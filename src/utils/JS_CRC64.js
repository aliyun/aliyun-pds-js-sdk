/** @format */

import x, * as x2 from './crc64-wasm'

const binding = x || x2

const CHUNK_SIZE = 500 * 1024 //前端分块大小 500KB

const raw = {
  crc64: binding.cwrap('crc64', 'null', ['number', 'number', 'number']),
  crc64Init: binding.cwrap('crc64_init', 'null', []),
  strToUint64Ptr: binding.cwrap('str_to_uint64', 'null', ['number', 'number']),
  uint64PtrToStr: binding.cwrap('uint64_to_str', 'null', ['number', 'number']),
}
raw.crc64Init()

function strToUint64Ptr(str) {
  const strPtr = binding._malloc(str.length + 1)
  binding.stringToUTF8(str, strPtr, str.length + 1)

  const uint64Ptr = binding._malloc(8)
  raw.strToUint64Ptr(strPtr, uint64Ptr)
  binding._free(strPtr)

  return uint64Ptr
}

function uint64PtrToStr(uint64Ptr) {
  const strPtr = binding._malloc(32)
  raw.uint64PtrToStr(strPtr, uint64Ptr)
  const str = binding.UTF8ToString(strPtr)
  binding._free(strPtr)
  return str
}
/* istanbul ignore next */
function stringToUint8Array(str) {
  var arr = []
  for (var i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i))
  }

  var tmpUint8Array = new Uint8Array(arr)
  return tmpUint8Array
}

function buffToPtr(buff) {
  if (typeof window == 'object') {
    /* istanbul ignore next */
    if (typeof buff === 'string') {
      buff = stringToUint8Array(buff)
    } else if (!(buff instanceof Uint8Array)) {
      throw new Error('Invalid buffer type.')
    }
  } else {
    if (typeof buff === 'string') {
      buff = Buffer.from(buff)
    } else if (!Buffer.isBuffer(buff)) {
      throw new Error('Invalid buffer type.')
    }
  }

  const buffPtr = binding._malloc(buff.length)
  binding.writeArrayToMemory(buff, buffPtr)

  return buffPtr
}

export {
  crc64,
  crc64File, // for js in browser
  crc64FileNode, // for node.js
}

/**
 *
 * @param {Buffer|string} buff  要计算的 buffer或者string
 * @param {string} prev  上一次的 crc64 结果, 值应为 bigint 的 string
 * @returns
 */
function crc64(buff, prev = '0') {
  const prevPtr = strToUint64Ptr(prev)
  const buffPtr = buffToPtr(buff)

  raw.crc64(prevPtr, buffPtr, buff.length)
  const ret = uint64PtrToStr(prevPtr)

  binding._free(prevPtr)
  binding._free(buffPtr)

  return ret
}

/**
 * 前端 js 计算crc64
 * @param {File} file  HTML File 对象
 * @param {Function} onProgress  进度回调方法， onProgress(prog:int) prog 取值 0-100
 * @param {Function} getStopFlag  返回 stopFlag 的值，用于暂停计算。 注意: stopFlag 为true，会 throw new Error('stopped')
 * @param {*} param3  可以为空
 * @returns {string} 返回文件的 crc64 值，应为 bigint 的 string 类型
 */
/* istanbul ignore next */
async function crc64File(file, onProgress, getStopFlag, {chunkSize = CHUNK_SIZE} = {}) {
  var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
  var chunksNum = Math.ceil(file.size / chunkSize)

  let c = 0
  let total = file.size
  let last = '0'
  let chunk

  for (let i = 0; i < chunksNum; i++) {
    var start = i * chunkSize
    var end = start + chunkSize >= total ? total : start + chunkSize

    chunk = await loadFileBuffer(file, start, end)

    // 计算
    try {
      last = crc64(chunk, last + '')
    } catch (e) {
      console.error(e)
      throw e
    }
    c += chunk.length

    // 进度
    try {
      onProgress((c / total) * 100)
    } catch (e) {
      console.error(e)
      return
    }

    if (getStopFlag()) {
      console.log(`stop crc64File`)
      throw new Error('stopped')
    }
  }

  return last

  function loadFileBuffer(file, start, end) {
    return new Promise((resolve, reject) => {
      let fileReader = new FileReader()
      fileReader.onload = e => {
        let buf = new Uint8Array(e.target.result)
        resolve(buf)
      }
      fileReader.onerror = e => {
        console.error('读取文件失败', e)
        reject('读取文件失败')
      }
      let blobPacket = blobSlice.call(file, start, end)
      fileReader.readAsArrayBuffer(blobPacket)
    })
  }
}

/**
 * node.js 计算crc64
 * @param {string} file_path 本地文件路径
 * @param {Function} onProgress  进度回调方法， onProgress(prog:int) prog 取值 0-100
 * @param {Function} getStopFlag  返回 stopFlag 的值，用于暂停计算。 注意: stopFlag 为true，会 throw new Error('stopped')
 * @param {*} param3  可以为空
 * @returns {string} 返回文件的 crc64 值，应为 bigint 的 string 类型
 */
async function crc64FileNode(file_path, onProgress, getStopFlag, {start, end, highWaterMark, fs} = {}) {
  var total = end != null ? end - start : fs.statSync(file_path).size

  if (total == 0) return '0'

  return await new Promise((resolve, reject) => {
    let errored = false
    let stream = fs.createReadStream(file_path, {end, start, highWaterMark}) //opt
    let last = '0'
    let c = 0
    /* istanbul ignore next */
    stream.on('error', function (err) {
      errored = true
      stream.destroy()

      return reject(err)
    })

    stream.on('data', function (chunk) {
      try {
        last = crc64(chunk, last + '')
      } catch (e) {
        console.error(e)
        reject(e)
        return
      }

      c += chunk.length

      try {
        onProgress((c / total) * 100)
      } catch (e) {
        reject(e)
        return
      }

      if (getStopFlag()) {
        console.log(`stop crc64FileNode`)

        stream.destroy()
        stream = null

        reject(new Error('stopped'))
      }
    })
    stream.on('end', function () {
      if (errored) return

      resolve(last)
    })
  })
}
