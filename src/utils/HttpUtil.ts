/** @format */

import {ReadStream} from 'fs'

interface ICallRetryOptions {
  retryTimes?: number
  dur?: number
  verbose?: boolean
  getStopFlagFun?: Function
}

// retryTimes=1 表示请求1次
// retryTimes=2 表示请求2次
async function callRetry(func: Function, binding: any, arr: Array<any>, opt?: ICallRetryOptions) {
  let {retryTimes = 10, dur = 2000, verbose = false, getStopFlagFun = null} = opt

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await func.apply(binding, arr)
    } catch (e) {
      if (e.message == 'stopped' || (typeof getStopFlagFun == 'function' && getStopFlagFun() === true)) {
        throw e
      }

      //比如: getaddrinfo ENOTFOUND pds-daily-hz65-hz-1564648220.oss-cn-hangzhou.aliyuncs.com
      if (isNetworkError(e)) {
        retryTimes--
        if (retryTimes <= 0) throw e
        else {
          if (verbose) console.warn(`retry call [${func.name}]:`, retryTimes)
          await delay(dur)
          continue
        }
      } else {
        if (e.response && e.response.data && e.response.data.message) {
          e.message = e.response.data.message
        }
        throw e
      }
    }
  }
}
function delay(ms: number): Promise<void> {
  return new Promise<void>(a => setTimeout(a, ms))
}

function getStreamBody(stream: ReadStream | string) {
  if (typeof stream == 'string') return stream
  return new Promise<string>((resolve, reject) => {
    var a = ''
    stream.on('data', chunk => {
      a += chunk
    })
    stream.on('end', () => {
      resolve(a)
    })
    stream.on('error', e => {
      reject(e)
    })
  })
}

function isNetworkError(e: Error): boolean {
  return (
    e.message == 'Network Error' ||
    e.message.indexOf('socket hang up') != -1 ||
    e.message.indexOf('getaddrinfo ENOTFOUND') != -1 ||
    e.message.indexOf('timeout of') != -1 ||
    e.message.indexOf('connect ECONNRESET') != -1 ||
    e.message.indexOf('connect ETIMEDOUT') != -1
  )
}
export {callRetry, delay, getStreamBody, isNetworkError}
