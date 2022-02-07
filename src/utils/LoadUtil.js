/** @format */
import {v4 as uuid_v4} from 'uuid'
export {
  throttleInTimes,
  formatProgress,
  randomHex,
  uuid,
  fixFileName4Windows,
  formatPercentsToFixed,
  removeItem,
  calcUploadMaxConcurrency,
  calcUploadHighWaterMark,
  calcDownloadHighWaterMark,
  calcDownloadMaxConcurrency,
}

function throttleInTimes(fn, ms = 10, times = 200) {
  let _cc = 0
  let _up_prog_tid

  let target = function (...argv) {
    // 缓冲修改 progress
    if (!_cc) _cc = 0
    _cc++

    if (_cc >= times) {
      fn(...argv)
      _cc = 0
      return
    }

    clearTimeout(_up_prog_tid)
    _up_prog_tid = setTimeout(() => {
      fn(...argv)
      _cc = 0
    }, ms)
  }
  target.cancel = function () {
    clearTimeout(_up_prog_tid)
  }
  return target
}

function formatProgress(process) {
  if (typeof process === 'number') {
    return Math.round(process * 10000) / 100
  }
  return 0
}

// windows下， 文件名不能包含： \/:*?"<>|
function fixFileName4Windows(p) {
  const arr = p.match(/([^\\/]+)$/)
  let name = arr && arr.length > 1 ? arr[1] : p
  const pp = p.substring(0, p.length - name.length)
  name = name.replace(/[\\/:*?"<>|]/g, '_')
  return pp + name
}

function randomHex() {
  return Math.random().toString(36).substring(2)
}
function uuid() {
  return uuid_v4()
}
function formatPercentsToFixed(process) {
  if (typeof process === 'number') {
    return Math.round(process * 10000) / 100
  }
  return 0
}

function removeItem(arr, item) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === item) {
      arr.splice(i, 1)
      break
    }
  }
}
function calcDownloadHighWaterMark() {
  // 不能超过 Number.MAX_SAFE_INTEGER   9007199254740991
  // 设置 stream 每次 onData chunk 的大小
  return 128 * 1024
}

// 根据网速调整下载并发量
function calcDownloadMaxConcurrency(speed, chunkSize, lastConcurrency) {
  const block = chunkSize * lastConcurrency
  if (speed > block * 0.9) {
    // 激进上涨
    return lastConcurrency + 5
  } else if (speed > block * 0.2) {
    // 保守下跌
    if (lastConcurrency > 5) return lastConcurrency - 1
    return 5
  } else {
    return lastConcurrency
  }
}

function calcUploadHighWaterMark() {
  // 不能超过 Number.MAX_SAFE_INTEGER   9007199254740991
  // 设置 stream 每次 onData chunk 的大小
  // return READ_STREAM_HIGH_WATER_MARK;
  return 1024 * 1024
}

// 根据网速调整上传并发量
// function calcMaxConcurrency(speed, chunkSize, lastConcurrency) {
//   let block = chunkSize * lastConcurrency
//   if (speed > block * 0.9) {
//     //激进上涨
//     return lastConcurrency + 5;
//   }
//   else {
//     //保守下跌
//     if (lastConcurrency > 5) return lastConcurrency - 1;
//     return 5;
//   }
// }
function calcUploadMaxConcurrency(speed, chunkSize, lastConcurrency) {
  const block = chunkSize * lastConcurrency
  if (speed > block * 0.9) {
    // 激进上涨
    return lastConcurrency + 5
  } else if (speed > block * 0.2) {
    // 保守下跌
    if (lastConcurrency > 5) return lastConcurrency - 1
    return 5
  } else {
    return lastConcurrency
  }
}
