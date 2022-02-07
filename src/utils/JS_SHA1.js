/** @format */

import {ready, sha1, createSha1} from './sha1-wasm/js-sha1'
import {throttleInTimes} from './LoadUtil'

const CHUNK_SIZE = 1024 * 1024 //500KB

/**
 * onProgress 截流
 * @param {*} fn
 * @param {*} file_size   文件大小
 * @param {*} chunk_size  node.js 的 64KB， 浏览器的 CHUNK_SIZE
 * @param {*} expect_times  期望 fn 被调用次数。默认200次，即 0.5% 调用一次。（100/200）=> 0.5
 * @returns
 */
function createThrottleProgressFn(fn, file_size, chunk_size = 64 * 1024, expect_times = 200) {
  return throttleInTimes(fn, 10, file_size / chunk_size / expect_times)
}

export {
  ready,
  sha1,
  createSha1,
  // 下面4个方法才有 ready
  calcFileSha1,
  calcFilePartsSha1,
  // for node.js
  calcFileSha1Node,
  calcFilePartsSha1Node,
}

/**
 * 浏览器中计算文件的 sha1
 * @param {*} file  HTML File 对象
 * @param {number} preSize 只计算前面 0-preSize， 如果preSize为0，则计算整个文件
 * @param {Function} onProgress 进度回调: (prog)=>{}  prog 0-1
 * @param {Function} getStopFlag 获取暂停flag，如果返回true
 */
/* istanbul ignore next */
async function calcFileSha1(file, preSize, onProgress, getStopFlag) {
  await ready()
  onProgress = onProgress || (prog => {})
  onProgress = createThrottleProgressFn(onProgress, file.size, CHUNK_SIZE)
  getStopFlag = getStopFlag || (() => false)

  let hash = createSha1()

  let blob

  if (preSize) {
    // 预秒传只需计算前1000KB
    blob = file.slice(0, preSize)
  } else {
    //计算整个文件的
    blob = file
  }

  await readBlock(
    blob,
    async (buf, loaded, total) => {
      await hash.update(buf)

      onProgress((loaded * 100) / total)

      if (loaded == total) onProgress.cancel()
    },
    getStopFlag,
  )
  return hash.hex().toUpperCase()
}

/* istanbul ignore next */
async function calcFilePartsSha1(file, parts, onProgress, getStopFlag) {
  await ready()

  onProgress = onProgress || (prog => {})
  onProgress = createThrottleProgressFn(onProgress, file.size, CHUNK_SIZE)

  getStopFlag = getStopFlag || (() => false)

  let hash = createSha1()

  let total = file.size

  let loaded = 0

  for (let n of parts) {
    if (getStopFlag()) {
      throw new Error('stopped')
    }

    await readBlock(
      file.slice(n.from, n.to),
      async buf => {
        await hash.update(buf)
        loaded += buf.length

        onProgress((loaded * 100) / total)
        if (loaded == total) onProgress.cancel()
      },
      getStopFlag,
    )

    // 中间值
    n.parallel_sha1_ctx = {
      h: [...hash.getH()],
      part_offset: n.from,
    }
  }
  return {
    part_info_list: parts,
    content_hash: hash.hex().toUpperCase(),
    content_hash_name: 'sha1',
  }
}
/* istanbul ignore next */
async function readBlock(blob, onChunkData, getStopFlag) {
  getStopFlag = getStopFlag || (() => false)

  let size = blob.size
  let len = Math.ceil(size / CHUNK_SIZE)
  let start = 0
  let end
  for (let i = 0; i < len; i++) {
    if (getStopFlag()) {
      throw new Error('stopped')
    }
    start = i * CHUNK_SIZE
    end = Math.min(start + CHUNK_SIZE, size)
    let buf = await getArrayBufferFromBlob(blob.slice(start, end))
    await onChunkData(buf, end, size)
  }
}
async function getArrayBufferFromBlob(blob) {
  return new Promise((a, b) => {
    var fileReader = new FileReader()
    fileReader.onload = e => a(new Uint8Array(e.target.result))
    fileReader.onerror = b
    fileReader.readAsArrayBuffer(blob)
  })
}

/// for node.js
async function calcFileSha1Node(file, size, onProgress, getStopFlag, context) {
  await ready()

  onProgress = onProgress || (prog => {})
  onProgress = createThrottleProgressFn(onProgress, file.size)

  getStopFlag = getStopFlag || (() => false)

  const {fs, highWaterMark} = context
  let hash = createSha1()

  return await new Promise((resolve, reject) => {
    const opt = {
      highWaterMark,
    }
    if (size) {
      Object.assign(opt, {start: 0, end: size - 1})
    }
    let loadedSize = 0
    const input = fs.createReadStream(file.path, opt)
    input.on('data', chunk => {
      if (getStopFlag() === true) {
        input.destroy()
        reject(new Error('stopped'))
        return
      }
      if (chunk) {
        loadedSize += Buffer.byteLength(chunk)
        hash.update(chunk)

        onProgress((loadedSize * 100) / file.size)
        if (loadedSize == file.size) onProgress.cancel()
      }
    })
    input.on('end', () => {
      resolve(hash.hex().toUpperCase())
    })
    input.on('error', e => {
      reject(e)
    })
  })
}

async function calcFilePartsSha1Node(file, parts, onProgress, getStopFlag, context) {
  await ready()
  onProgress = onProgress || (prog => {})
  onProgress = createThrottleProgressFn(onProgress, file.size)

  getStopFlag = getStopFlag || (() => false)
  const {fs, highWaterMark} = context
  let hash = createSha1()
  let total = file.size
  let loaded = 0
  let stream
  for (let n of parts) {
    if (getStopFlag()) {
      throw new Error('stopped')
    }
    if (n.part_size == 0) hash.update('')
    else {
      stream = fs.createReadStream(file.path, {start: n.from, end: n.to - 1, highWaterMark})
      await readStream(stream, chunk => {
        hash.update(chunk)
        loaded += chunk.length

        onProgress((loaded * 100) / total)
        if (loaded == total) onProgress.cancel()
      })

      // 中间值
      n.parallel_sha1_ctx = {
        h: [...hash.getH()],
        part_offset: n.from,
      }
    }
  }

  return {
    part_info_list: parts,
    content_hash: hash.hex().toUpperCase(),
    content_hash_name: 'sha1',
  }
}

function readStream(stream, onData) {
  return new Promise((a, b) => {
    stream.on('data', onData)
    stream.on('end', a)
    stream.on('error', err => b(err))
  })
}
