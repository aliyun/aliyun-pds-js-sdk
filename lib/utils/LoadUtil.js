export {
  getArchiveTaskResult,
  calcSmoothSpeed,
  throttleInTimes,
  removeItem,
  calcUploadMaxConcurrency,
  calcDownloadMaxConcurrency,
  getIfVpcUrl,
}

// 根据 use_vpc, 判断是否强制使用 internal_url
function getIfVpcUrl(use_vpc, url, internal_url) {
  return use_vpc && internal_url ? internal_url : url
}

function getArchiveTaskResult(res) {
  if (res.archive_file_result?.crc64_hash) {
    // 新版
    let {url: download_url, size, crc64_hash} = res.archive_file_result
    return {download_url, size, crc64_hash}
  } else {
    // 旧版
    return {download_url: res.url}
  }
}

function calcSmoothSpeed(speedList, smoothing = 0.05) {
  let average = speedList.reduce((a, b) => a + b) / speedList.length
  let lastSpeed = speedList[speedList.length - 1]
  return smoothing * lastSpeed + (1 - 0.05) * average
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
