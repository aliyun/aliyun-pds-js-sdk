import HashWorker from './worker/file-hash-worker.js?worker&inline'

export {worker_calc_file_hash, worker_calc_file_parts_hash}
async function worker_calc_file_hash(algorithm, file, preSize, onProgress, getStopFlag) {
  return await workerCalcFileHash({calcType: algorithm, file, preSize}, onProgress, getStopFlag)
}

async function worker_calc_file_parts_hash(algorithm, file, parts, onProgress, getStopFlag) {
  // 如果界面使用了 vue, parts 可能是 Proxy(Array)，无法通过 postMessage 传入 WebWorker 里。
  const partsClone = JSON.parse(JSON.stringify(parts))
  return await workerCalcFileHash({calcType: algorithm + '_parts', file, parts: partsClone}, onProgress, getStopFlag)
}

async function workerCalcFileHash({calcType, file, preSize, parts}, onProgress, getStopFlag) {
  let onReady, onResult, onError
  const worker = new HashWorker()
  worker.addEventListener('message', e => {
    if (e.data.code == 'ready') {
      onReady(true)
    } else if (e.data.code == 'progress') {
      onProgress(e.data.progress)
      if (getStopFlag?.()) {
        worker.terminate()
      }
    } else if (e.data.code == 'result') {
      onResult(e.data.result)
      worker.terminate()
    } else if (e.data.code == 'error') {
      onError(e.data.error)
      worker.terminate()
    }
  })

  await new Promise(a => {
    onReady = a
  })

  worker.postMessage({
    sid: Math.random(),
    code: calcType,
    file,
    parts,
    preSize,
  })

  return await new Promise((a, b) => {
    onResult = a
    onError = b
  })
}
