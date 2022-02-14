/** @format */

export {nodeProcessCalc, nodeWorkerCalc}

/* istanbul ignore next */
async function nodeProcessCalc(script_path, params, onProgress, getStopFlag, context) {
  const {cp} = context
  let base64Str = Buffer.from(JSON.stringify(params)).toString('base64')

  const child = cp.fork(script_path, [base64Str], {stdio: 'inherit'})

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
          b(typeof data.error == 'string' ? new Error(data.error) : data.error)
          break
      }
    })
  })
}
/* istanbul ignore next */
async function nodeWorkerCalc(script_path, params, onProgress, getStopFlag, context) {
  const {worker_threads} = context
  const {Worker} = worker_threads
  return await new Promise((resolve, reject) => {
    const worker = new Worker(script_path, {workerData: params})

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
          reject(typeof data.error == 'string' ? new Error(data.error) : data.error)
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
