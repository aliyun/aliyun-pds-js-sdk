import {PDSError} from './PDSError'

export {readStream}

async function readStream(readable, onData, getStopFlag) {
  // let errored = false
  for await (const chunk of readable) {
    if (getStopFlag()) {
      readable.destroy()
      throw new PDSError('stopped', 'stopped')
    }
    try {
      await onData(chunk)
    } catch (e) {
      readable.destroy()
      throw e
    }
  }
}
