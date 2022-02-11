/** @format */

import {ready, sha1, createSha1} from './sha1/js-sha1-origin'
import {readBlock, readStream} from './StreamUtil'

const CHUNK_SIZE = 1024 * 1024 //1MB
const PROGRESS_EMIT_VALVE = 0.1 // 进度超过多少,回调onProgress
const NODE_PROCESS_CALC_SIZE = 50 * 1024 * 1024 // node.js: 超过 50MB，就用子进程 (Electron 渲染进程目前不支持 worker_threads)

export {
  ready, // wasm是异步载入的， await ready() 后才能使用 crc64 方法。
  sha1,
  createSha1,
  // 下面几个个方法会自动调用 await ready()
  calcFileSha1,
  calcFilePartsSha1,
  // for node.js
  calcFileSha1Node, // 串行
  calcFilePartsSha1Node, // 并行，按part计算中间值
  calcFilePartsSha1NodeProcess,
  calcFilePartsSha1NodeWorker,
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

  let progress = 0
  let last_progress = 0
  await readBlock(
    blob,
    CHUNK_SIZE,
    (buf, loaded, total) => {
      hash.update(buf)

      // 进度
      progress = (loaded * 100) / total
      if (progress - last_progress >= PROGRESS_EMIT_VALVE) {
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
  return hash.hex().toUpperCase()
}

/* istanbul ignore next */
async function calcFilePartsSha1(file, parts, onProgress, getStopFlag) {
  await ready()

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let hash = createSha1()

  let total = file.size

  let loaded = 0
  let lastH = []
  let progress = 0
  let last_progress = 0

  for (let n of parts) {
    if (getStopFlag()) {
      throw new Error('stopped')
    }
    // 中间值
    n.parallel_sha1_ctx = {
      h: [...lastH],
      part_offset: n.from,
    }

    await readBlock(
      file.slice(n.from, n.to),
      CHUNK_SIZE,
      buf => {
        hash.update(buf)
        loaded += buf.length

        // 进度
        progress = (loaded * 100) / total
        if (progress - last_progress >= PROGRESS_EMIT_VALVE) {
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
  return {
    part_info_list: parts,
    content_hash: hash.hex().toUpperCase(),
    content_hash_name: 'sha1',
  }
}

/// for node.js
async function calcFileSha1Node(file_path, size, onProgress, getStopFlag, context) {
  await ready()
  const {fs, crypto, highWaterMark} = context
  let total = fs.statSync(file_path).size

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  // 如果不需要中间值，直接使用内置模块crypto效率更高。
  let hash = crypto.createHash('sha1')
  // let hash = createSha1()

  const opt = {
    highWaterMark,
  }
  if (size) {
    Object.assign(opt, {start: 0, end: size - 1})
  }

  let loaded = 0
  let progress = 0
  let last_progress = 0
  const input = fs.createReadStream(file_path, opt)

  await readStream(
    input,
    chunk => {
      loaded += Buffer.byteLength(chunk)
      hash.update(chunk)

      // 进度
      progress = (loaded * 100) / total
      if (progress - last_progress >= PROGRESS_EMIT_VALVE) {
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
  // return (hash.hex().toUpperCase())
  return hash.digest('hex').toUpperCase()
}

async function calcFilePartsSha1Node(file_path, parts, onProgress, getStopFlag, context) {
  await ready()
  const {fs, worker_threads, highWaterMark, process_calc_size = NODE_PROCESS_CALC_SIZE} = context
  let total = fs.statSync(file_path).size

  if (total > process_calc_size) {
    // if (typeof worker_threads == 'object') {
    //   // 使用 worker 计算
    //   console.log('使用 worker 计算')
    //   return await calcFilePartsSha1NodeWorker(file_path, parts, onProgress, getStopFlag, context)
    // } else {
      // 使用子进程计算
      console.log('使用子进程计算')
      return await calcFilePartsSha1NodeProcess(file_path, parts, onProgress, getStopFlag, context)
    // }
  }

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let hash = createSha1()
  let loaded = 0
  let stream
  let lastH = []
  var buf = Buffer.allocUnsafe(0)
  let progress = 0
  let last_progress = 0

  for (let n of parts) {
    if (getStopFlag()) {
      throw new Error('stopped')
    }
    // 中间值
    n.parallel_sha1_ctx = {
      h: [...lastH],
      part_offset: n.from,
    }

    if (n.part_size == 0) hash.update('')
    else {
      stream = fs.createReadStream(file_path, {start: n.from, end: n.to - 1, highWaterMark})

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
          if (progress - last_progress >= PROGRESS_EMIT_VALVE) {
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

      // 获取中间值
      lastH = hash.getH()
    }
  }
  // 最后遗留片
  if (buf && buf.length > 0) {
    hash.update(buf)
    buf = null
    try {
      onProgress(100)
    } catch (e) {
      console.error(e)
    }
  }

  return {
    part_info_list: parts,
    content_hash: hash.hex().toUpperCase(),
    content_hash_name: 'sha1',
  }
}

// 启动子进程
async function calcFilePartsSha1NodeProcess(file_path, parts, onProgress, getStopFlag, context) {
  const {cp, path, highWaterMark = 64 * 1024} = context

  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let obj = {
    highWaterMark,
    file_path,
    parts,
  }

  let base64Str = Buffer.from(JSON.stringify(obj)).toString('base64')

  const child = cp.fork(path.join(__dirname, 'sha1/node-process-sha1.js'), [base64Str], {stdio: 'inherit'})

  return await new Promise((a, b) => {
    child.on('message', data => {
      switch (data.type) {
        case 'progress':
          if (getStopFlag()) {
            child.kill(2)
            b(new Error('stopped'))
            return
          }
          onProgress(data.progress)
          break

        case 'result':
          a(data.result)
          break
        case 'error':
          let err = data.error
          b(typeof err == 'string' ? new Error(err) : err)
          break
      }
    })
  })
}
// 启动 worker_threads
async function calcFilePartsSha1NodeWorker(file_path, parts, onProgress, getStopFlag, context) {
  const {cp, path, worker_threads, highWaterMark = 64 * 1024} = context
  const {Worker} = worker_threads
  onProgress = onProgress || (prog => {})
  getStopFlag = getStopFlag || (() => false)

  let obj = {
    highWaterMark,
    file_path,
    parts,
  }

  return await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'sha1/node-worker-sha1.js'), {workerData: obj})

    worker.on('message', data => {
      switch (data.type) {
        case 'progress':
          if (getStopFlag()) {
            worker.terminate()
            reject(new Error('stopped'))
            return
          }
          onProgress(data.progress)
          break
        case 'result':
          resolve(data.result)
          break
        case 'error':
          let err = data.error
          reject(typeof err == 'string' ? new Error(err) : err)
          break
      }
    })
    worker.on('error', err => {
      reject(err)
    })
    worker.on('exit', code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
}
