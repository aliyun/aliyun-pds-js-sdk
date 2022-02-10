/** @format */

export {readBlock, readStream}

async function readStream(readable, onData, getStopFlag) {
  // let errored = false
  for await (const chunk of readable) {
    if (getStopFlag()) {
      readable.destroy()
      throw new Error('stopped')
    }
    try {
      await onData(chunk)
    } catch (e) {
      readable.destroy()
      throw e
    }
  }
}

/* istanbul ignore next */
async function readBlock(blob, chunkSize, onChunkData, getStopFlag) {
  getStopFlag = getStopFlag || (() => false)

  let size = blob.size
  let len = Math.ceil(size / chunkSize)
  let start = 0
  let end
  var fileReader = new FileReader()
  for (let i = 0; i < len; i++) {
    if (getStopFlag()) {
      throw new Error('stopped')
    }
    start = i * chunkSize
    end = Math.min(start + chunkSize, size)
    let buf = await getArrayBufferFromBlob(blob.slice(start, end), fileReader)
    await onChunkData(new Uint8Array(buf), end, size)
  }
}
/* istanbul ignore next */
function getArrayBufferFromBlob(blob, fileReader) {
  return new Promise((a, b) => {
    // var fileReader = new FileReader()
    fileReader.onload = e => a(e.target.result)
    fileReader.onerror = b
    fileReader.readAsArrayBuffer(blob)
  })
}
