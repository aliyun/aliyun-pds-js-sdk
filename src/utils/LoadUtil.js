/** @format */
import {v4 as uuid_v4} from 'uuid'
export {
  throttleInTimes,
  formatProgress,
  randomHex,
  uuid,
  fixFileName4Windows,
  formatPercents,
  removeItem,
  calcUploadMaxConcurrency,
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
  return p
    .split(/\\|\//)
    .map(name => (/^[a-z]:$/i.test(name) ? name : name.replace(/[/:*?"<>|]/g, '_')))
    .join('\\')
}

function randomHex() {
  return Math.random().toString(36).substring(2)
}
function uuid() {
  return uuid_v4()
}
function formatPercents(progress) {
  if (typeof progress === 'number') {
    return Math.round(progress * 100) / 100.0
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

// 根据网速调整下载并发量
function calcDownloadMaxConcurrency(speed, chunkSize, lastConcurrency, init_chunk_con = 5) {
  const block = chunkSize * lastConcurrency
  if (speed > block * 0.9) {
    // 激进上涨
    return Math.min(lastConcurrency + 5, 15)
  } else if (speed > block * 0.2) {
    // 保守下跌
    if (lastConcurrency > 5) return lastConcurrency - 1
    return init_chunk_con
  } else {
    return lastConcurrency
  }
}

function calcUploadMaxConcurrency(speed, chunkSize, lastConcurrency, init_chunk_con = 5) {
  const block = chunkSize * lastConcurrency
  if (speed > block * 0.9) {
    // 激进上涨
    return Math.min(lastConcurrency + 5, 15)
  } else if (speed > block * 0.2) {
    // 保守下跌
    if (lastConcurrency > 5) return lastConcurrency - 1
    return init_chunk_con
  } else {
    return lastConcurrency
  }
}
