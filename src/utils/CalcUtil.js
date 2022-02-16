/** @format */
/* istanbul ignore file */
import * as JS_SHA1 from './JS_SHA1'
import * as JS_CRC64 from './JS_CRC64'

export {calcFileSha1, calcFilePartsSha1, calcFileCrc64, sha1}

async function calcFileSha1({
  file,
  file_path,
  verbose,
  pre_size,
  process_calc_sha1_size,
  onProgress,
  getStopFlagFun,
  context,
}) {
  if (context.isNode) {
    // 桌面端
    file_path = file_path || file.path
    let size = context.fs.statSync(file_path).size

    if (size > process_calc_sha1_size) {
      if (verbose) console.log(`使用 node 子进程计算 sha1`)
      return await JS_SHA1.calcFileSha1NodeProcess(file_path, pre_size, onProgress, getStopFlagFun, context)
    } else {
      return await JS_SHA1.calcFileSha1Node(file_path, pre_size, onProgress, getStopFlagFun, context)
    }
  } else {
    // 浏览器
    let size = pre_size || file.size
    if (size > process_calc_sha1_size) {
      if (verbose) console.log(`使用 web worker计算 sha1`)
      return await JS_SHA1.calcFileSha1Worker(file, pre_size, onProgress, getStopFlagFun)
    } else {
      return await JS_SHA1.calcFileSha1(file, pre_size, onProgress, getStopFlagFun)
    }
  }
}
async function calcFilePartsSha1({
  file,
  file_path,
  verbose,
  part_info_list,
  process_calc_sha1_size,
  onProgress,
  getStopFlagFun,
  context,
}) {
  if (context.isNode) {
    // 桌面端
    file_path = file_path || file.path
    let size = context.fs.statSync(file_path).size

    if (size > process_calc_sha1_size) {
      if (verbose) console.log(`使用 node 子进程计算 sha1`)
      return await JS_SHA1.calcFilePartsSha1NodeProcess(file_path, part_info_list, onProgress, getStopFlagFun, context)
    } else {
      return await JS_SHA1.calcFilePartsSha1Node(
        file_path || file.path,
        part_info_list,
        onProgress,
        getStopFlagFun,
        context,
      )
    }
  } else {
    // 浏览器
    let size = file.size
    if (size > process_calc_sha1_size) {
      if (verbose) console.log(`使用 web worker计算 sha1`)
      return await JS_SHA1.calcFilePartsSha1Worker(file, part_info_list, onProgress, getStopFlagFun)
    } else {
      return await JS_SHA1.calcFilePartsSha1(file, part_info_list, onProgress, getStopFlagFun)
    }
  }
}

async function calcFileCrc64({file, file_path, verbose, onProgress, getStopFlagFun, context, process_calc_crc64_size}) {
  if (context.isNode) {
    file_path = file_path || file.path
    let size = context.fs.statSync(file_path).size

    if (size > process_calc_crc64_size) {
      if (verbose) console.log(`使用 node 子进程计算 crc64`)

      return await JS_CRC64.crc64FileNodeProcess(file_path, onProgress, getStopFlagFun, context)
    } else {
      return await JS_CRC64.crc64FileNode(file_path, onProgress, getStopFlagFun, context)
    }
  } else {
    return await JS_CRC64.crc64File(file, onProgress, getStopFlagFun)
  }
}

/* istanbul ignore next */
function sha1(str) {
  return JS_SHA1.sha1(str)
}
