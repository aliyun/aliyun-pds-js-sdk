import {PDSError} from './PDSError'
export {
  read_block,
  slice_file,
  does_file_exist,
  // for test
  get_arraybuffer_from_blob,
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

function slice_file(file, start, end) {
  var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
  return blobSlice.call(file, start, end)
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
