/** @format */

export {nodeProcessCalc, inProcess}

/* istanbul ignore next */
async function inProcess(run) {
  process.on('message', async data => {
    if (!data) return
    switch (data.type) {
      case 'params':
        await run(data.params, data => process.send(data))
        break
      case 'end':
        process.exit(0)
    }
  })
  process.send({
    type: 'ready',
  })
}
/* istanbul ignore next */
async function nodeProcessCalc(script_path, params, onProgress, getStopFlag, context) {
  const {cp} = context
  // let base64Str = Buffer.from(JSON.stringify(params)).toString('base64')

  const child = cp.fork(script_path, [], {stdio: 'inherit'})

  return await new Promise((a, b) => {
    child.on('message', data => {
      switch (data.type) {
        case 'ready':
          child.send({
            type: 'params',
            params,
          })
          break
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
          child.send({
            type: 'end',
          })
          break
        case 'error':
          b(typeof data.error == 'string' ? new Error(data.error) : data.error)
          try {
            child.kill(2)
          } catch (e) {
            console.warn(e)
          }
          break
      }
    })
  })
}
