/** @format */
import {crc64, ready} from './crc64/wasm/index.js'
import {readBlock, readStream} from './StreamUtil.js'
import {nodeProcessCalc} from './ForkUtil'

const CHUNK_SIZE = 256 * 1024 //前端分块大小 500KB
const PROGRESS_EMIT_STEP = 0.1 // 进度超过多少,回调onProgress

export {
  ready, // wasm是异步载入的， await ready() 后才能使用 crc64 方法。
  crc64,
  crc64File, // for browser js
  crc64FileNode, // for node.js
  crc64FileNodeProcess,
}

/**
 * 前端 js 计算crc64
 * @param {File} file  HTML File 对象 
 * @param {Function} onProgress  进度回调方法， onProgress(prog:int) prog 取值 0-100
 * @param {Function} getStopFlag  返回 stopFlag 的值，用于暂停计算。 注意: stopFlag 为true，会 throw new Error('stopped')
 * @param {object} 其他参数 
 
 * @returns {string} 返回文件的 crc64 值，应为 bigint 的 string 类型
 */
/* istanbul ignore next */
async function crc64File(file, onProgress, getStopFlag, {chunkSize = CHUNK_SIZE} = {}) {
  await ready()

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let total = file.size
  // var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
  var chunksNum = Math.ceil(total / chunkSize)

  let loaded = 0
  let last = '0'
  let progress = 0
  let last_progress = 0

  for (let i = 0; i < chunksNum; i++) {
    var start = i * chunkSize
    var end = start + chunkSize
    end = Math.min(end, total)

    await readBlock(file.slice(start, end), chunkSize, buf => {
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
    })
  }

  return last
}

/**
 * node.js 计算crc64
 * @param {string} file_path 本地文件路径
 * @param {Function} onProgress  进度回调方法， onProgress(prog:int) prog 取值 0-100
 * @param {Function} getStopFlag  返回 stopFlag 的值，用于暂停计算。 注意: stopFlag 为true，会 throw new Error('stopped')
 * @param {*} param3  可以为空
 * @returns {string} 返回文件的 crc64 值，应为 bigint 的 string 类型
 */
async function crc64FileNode(file_path, onProgress, getStopFlag, context = {}) {
  let {highWaterMark, fs} = context

  await ready()
  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  if (total == 0) return '0'

  let stream = fs.createReadStream(file_path, {highWaterMark}) //opt
  let last = '0'
  let loaded = 0
  let progress = 0
  let last_progress = 0
  await readStream(
    stream,
    chunk => {
      loaded += chunk.length
      last = crc64(chunk, last + '')

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

  return last
}

// 启动子进程
/* istanbul ignore next */
async function crc64FileNodeProcess(file_path, onProgress, getStopFlag, context = {}) {
  const {path, highWaterMark = 64 * 1024} = context

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let obj = {
    highWaterMark,
    file_path,
    progress_emit_step: PROGRESS_EMIT_STEP,
  }

  return await nodeProcessCalc(
    path.join(__dirname, 'crc64/node-process-crc64.js'),
    obj,
    onProgress,
    getStopFlag,
    context,
  )
}
