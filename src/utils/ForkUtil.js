/** @format */

export {nodeProcessCalc}

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
