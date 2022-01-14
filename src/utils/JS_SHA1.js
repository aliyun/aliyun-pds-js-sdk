/** @format */

import * as jsSha1 from 'js-sha1'

const CHUNK_SIZE = 500 * 1024 //500KB

export {
  sha1,
  calcSha1,
  calcSha1Multi,
  // for node.js
  calcSha1Node,
  calcSha1MultiNode,
}
function sha1(str) {
  let hash = jsSha1.create()
  hash.update(str)
  return hash.hex().toUpperCase()
}

async function calcSha1MultiNode(file, parts, onProgress, getStopFlag, context) {
  const {fs, highWaterMark} = context

  let hash = jsSha1.create()

  let lastH = []
  let loadedSize = 0
  for (let n of parts) {
    n.parallel_sha1_ctx = {
      h: [...lastH],
      part_offset: n.from,
    }

    let stream
    if (n.part_size == 0) {
      hash.update('')
    } else {
      stream = fs.createReadStream(file.path, {start: n.from, end: n.to - 1, highWaterMark})
      lastH = await update(stream, onProgress, getStopFlag)
    }
  }
  return {
    part_info_list: parts,

    content_hash: hash.hex().toUpperCase(),
    content_hash_name: 'sha1',
  }

  function update(input, onProgress, getStopFlag) {
    return new Promise((resolve, reject) => {
      input.on('data', chunk => {
        if (getStopFlag && getStopFlag() === true) {
          input.destroy()
          reject(new Error('stopped'))
          return
        }
        if (chunk) {
          loadedSize += Buffer.byteLength(chunk)
          hash.update(chunk)

          onProgress && onProgress((loadedSize * 100) / file.size)
        }
      })
      input.on('end', () => {
        onProgress && onProgress(100)

        lastH = []
        for (let i = 0; i < 5; i++) {
          const val = hash[`h${i}`] >>> 0
          lastH.push(val)
        }
        resolve(lastH)
      })
      input.on('error', e => {
        reject(e)
      })
    })
  }
}

function calcSha1Node(file, size, onProgress, getStopFlag, context) {
  const {crypto, fs, highWaterMark} = context

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1')
    const opt = {
      highWaterMark,
    }
    if (size) {
      Object.assign(opt, {start: 0, end: size - 1})
    }
    let loadedSize = 0
    const input = fs.createReadStream(file.path, opt)
    input.on('data', chunk => {
      if (getStopFlag && getStopFlag() === true) {
        input.destroy()
        reject(new Error('stopped'))
        return
      }
      if (chunk) {
        loadedSize += Buffer.byteLength(chunk)
        hash.update(chunk)
        onProgress && onProgress((loadedSize * 100) / file.size)
      }
    })
    input.on('end', () => {
      onProgress && onProgress(100)
      resolve(hash.digest('hex').toUpperCase())
    })
    input.on('error', e => {
      reject(e)
    })
  })
}

/* istanbul ignore next */
async function calcSha1Multi(file, parts, onProgress, getStopFlag) {
  const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice

  const cipher = jsSha1.create()

  const partList = []
  let lastH = []
  for (let n of parts) {
    if (getStopFlag && getStopFlag() === true) {
      throw new Error('stopped')
    }
    onProgress && onProgress(+((100 * n.to) / file.size).toFixed(2))
    let part = await update(blobSlice.call(file, n.from, n.to), n)
    partList.push(part)
  }
  onProgress && onProgress(100)
  return {
    part_info_list: partList,
    content_hash: cipher.hex().toUpperCase(),
    content_hash_name: 'sha1',
  }

  async function update(blob, part) {
    part.parallel_sha1_ctx = {
      h: [...lastH],
      part_offset: part.from,
    }

    try {
      const arrayBuffer = await blob.arrayBuffer()
      cipher.update(arrayBuffer)

      lastH = []
      for (let i = 0; i < 5; i++) {
        const val = cipher[`h${i}`] >>> 0
        lastH.push(val)
      }

      return part
    } catch (e) {
      return e
    }
  }
}
/* istanbul ignore next */
function calcSha1(file, preSize, onProgress, getStopFlag) {
  return new Promise((resolve, reject) => {
    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
    var chunkSize = CHUNK_SIZE
    var chunksNum = Math.ceil(file.size / chunkSize)
    var currentChunk = 0

    var sha1 = jsSha1.create()

    var frOnload = function (e) {
      sha1.update(new Uint8Array(e.target.result))

      if (preSize) {
        resolve(sha1.hex())
        return
      }

      currentChunk++
      if (currentChunk < chunksNum) {
        onProgress ? onProgress((currentChunk * 100) / chunksNum) : null
        loadNext()
      } else {
        onProgress ? onProgress(100) : null
        resolve(sha1.hex().toUpperCase())
      }
    }
    var frOnerror = function () {
      console.error('读取文件失败')
      reject('读取文件失败')
    }

    function loadNext() {
      if (getStopFlag && getStopFlag() === true) {
        reject(new Error('stopped'))
        return
      }

      var fileReader = new FileReader()
      fileReader.onload = frOnload
      fileReader.onerror = frOnerror

      var start = currentChunk * chunkSize,
        end = start + chunkSize >= file.size ? file.size : start + chunkSize
      var blobPacket = blobSlice.call(file, start, end)
      fileReader.readAsArrayBuffer(blobPacket)
    }

    function loadPreSize(preSize) {
      if (preSize > file.size) {
        reject(new Error('preSize is bigger than file.size'))
        return
      }
      var fileReader = new FileReader()
      fileReader.onload = frOnload
      fileReader.onerror = frOnerror
      var blobPacket = blobSlice.call(file, 0, preSize)
      fileReader.readAsArrayBuffer(blobPacket)
    }

    preSize ? loadPreSize(preSize) : loadNext()
  })
}
