import {
  // sha1, sha256
  calc_hash,
  calc_file_hash, // 串行
  calc_file_parts_hash, // 并行，按part计算中间值
  // crc64
  calc_crc64,
  calc_file_crc64,

  // util
  catchOnProgress,
} from '../utils/checksum/node-index.ts'
import {parseSize} from '../utils/Formatter'
import * as NodeContext from './NodeContext'

export {
  // sha1, sha256
  calc_hash,
  calc_file_hash, // 串行
  calc_file_parts_hash, // 并行，按part计算中间值
  // crc64
  calc_crc64,
  calc_file_crc64,
  get_free_disk_size,

  // deprecated
  calc_sha1,
  calc_sha256,
  calc_file_sha1,
  calc_file_sha256,
  calc_file_parts_sha1,
  calc_file_parts_sha256,

  // for test
  _parse_free_size_unix,
  _parse_free_size_windows,
  catchOnProgress,
}

/* istanbul ignore next  */
async function get_free_disk_size(p, context) {
  var {os, cp} = context || NodeContext

  if (!cp) {
    //兼容 老的客户端没有cp
    return Number.POSITIVE_INFINITY
  }

  if (os.platform() == 'win32') {
    //windows
    return await getFreeDiskSize_win(p, context)
  } else {
    //linux or mac
    return await getFreeDiskSize_unix(p, context)
  }
}
/* istanbul ignore next  */
async function getFreeDiskSize_unix(p, context) {
  var {cp} = context
  try {
    let {stdout} = await cp_exec(cp, 'df -hl')
    let num = _parse_free_size_unix(stdout.trim(), p)
    return num
  } catch (e) {
    console.warn(e)
    // throw new Error('Failed to get free disk size, path=' + p)
    return Infinity
  }
}
/* istanbul ignore next  */
async function getFreeDiskSize_win(p, context) {
  var {path, cp} = context
  try {
    // 挂载盘格式： \\Client\$e\abc\
    // 正常驱动格式:  C:\\Users\\zb\\
    if (!/^[a-z]:/i.test(p)) return Infinity

    var driver = path.parse(p).root.substring(0, 2)
    let {stdout} = await cp_exec(cp, driver + ' && cd / && dir')
    let num = _parse_free_size_windows(stdout.trim())
    return num
  } catch (e) {
    console.warn(e)
    // throw new Error('Failed to get free disk size, path=' + p)
    return Infinity
  }
}
/* istanbul ignore next  */
function cp_exec(cp, str) {
  return new Promise((resolve, reject) => {
    cp.exec(str, function (err, stdout, stderr) {
      // console.log(err, '--stdout:', stdout, '--stderr:', stderr)
      if (err) reject(err)
      else resolve({stdout, stderr})
    })
  })
}

function _parse_free_size_windows(str) {
  var num
  var arr = str.trim().split('\n')
  var lastLine = arr.slice(arr.length - 1)
  lastLine = (lastLine + '').trim()

  num = lastLine.match(/\s+([\d,]+)\s+/)[1]
  num = parseInt(num.replace(/,/g, ''))
  /* istanbul ignore else */
  if (num != null) return num
  else throw new Error('Failed to get free disk size')
}

function _parse_free_size_unix(str, p) {
  var size

  var arr = str.trim().split('\n')
  arr.splice(0, 1)

  var t = []
  for (let n of arr) {
    var arr2 = n.split(/\s+/)
    t.push({
      pre: arr2[arr2.length - 1],
      freeSize: arr2[3],
      deep: arr2[arr2.length - 1].split('/').length,
    })
  }

  t.sort((a, b) => {
    if (a.deep < b.deep) return 1
    else return -1
  })

  for (let n of t) {
    if (p.startsWith(n.pre)) {
      size = parseSize(n.freeSize)
      break
    }
  }
  /* istanbul ignore else */
  if (size != null) return size
  else throw new Error('Failed to get free disk size')
}

/**
 * @deprecated please use calc_hash instead
 */
async function calc_sha1(buf, context) {
  return await calc_hash('sha1', buf, context || NodeContext)
}
/**
 * @deprecated please use calc_hash instead
 */
async function calc_file_sha1(file, preSize, onProgress, getStopFlag, context) {
  return await calc_file_hash('sha1', file, preSize, onProgress, getStopFlag, context || NodeContext) // 串行
}
/**
 * @deprecated please use calc_file_parts_hash instead
 */
async function calc_file_parts_sha1(file, parts, onProgress, getStopFlag, context) {
  return await calc_file_parts_hash('sha1', file, parts, onProgress, getStopFlag, context || NodeContext) // 并行，按part计算中间值
}
/**
 * @deprecated please use calc_hash instead
 */
async function calc_sha256(buf, context) {
  return await calc_hash('sha256', buf, context || NodeContext)
}

/**
 * @deprecated please use calc_file_hash instead
 */
async function calc_file_sha256(file, preSize, onProgress, getStopFlag, context) {
  return await calc_file_hash('sha256', file, preSize, onProgress, getStopFlag, context || NodeContext) // 串行
}
/**
 * @deprecated please use calc_file_parts_hash instead
 */
async function calc_file_parts_sha256(file, parts, onProgress, getStopFlag, context) {
  return await calc_file_parts_hash('sha256', file, parts, onProgress, getStopFlag, context || NodeContext) // 并行，按part计算中间值
}
