import {AxiosError} from 'axios'
interface ICallRetryOptions {
  retryTimes?: number
  dur?: number
  verbose?: boolean
  getStopFlag?: Function
}

// retryTimes=1 表示请求1次
// retryTimes=2 表示请求2次
async function callRetry(func: Function, binding: any, arr: Array<any>, opt: ICallRetryOptions = {}) {
  let {retryTimes = 10, dur = 2000, verbose = false, getStopFlag = null} = opt

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await func.apply(binding, arr)
    } catch (e) {
      if (
        e.message == 'stopped' ||
        e.code == 'stopped' ||
        (typeof getStopFlag == 'function' && getStopFlag() === true)
      ) {
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
        throw e
      }
    }
  }
}
function delay(ms: number): Promise<void> {
  return new Promise<void>(a => setTimeout(a, ms))
}
async function delayRandom(ms = 3000) {
  return await delay(Math.ceil(Math.random() * ms))
}

// 这些错误，不需要重试，暂停，下次可以断点续传
function isStoppableError(e: Error): boolean {
  return /Access denied by IP Control Policy|Access denied by bucket policy/i.test(e.message)
}

// 这些错误，重试多次后，暂停，下次可以断点续传
function isNetworkError(e: Error): boolean {
  if (e.message == 'Network Error') return true
  if (e.message?.startsWith?.('getaddrinfo ENOTFOUND')) return true
  return /socket|timeout ECONNRESET| ETIMEDOUT|EPIPE/i.test(e.message || '')
}

function isOssUrlExpired(e: AxiosError): boolean {
  return (
    !!e.response &&
    e.response.status == 403 &&
    !!e.response.data &&
    (e.response.data as string).includes('AccessDenied') &&
    (e.response.data as string).includes('expired')
  )
}

export {callRetry, delay, delayRandom, isStoppableError, isNetworkError, isOssUrlExpired}
