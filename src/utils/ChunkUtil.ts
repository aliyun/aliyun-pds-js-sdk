/** @format */

import {IUpPartInfo, IPartMap} from '../Types'

const LIMIT_PART_NUM = 9000 // OSS分片数最多不能超过1w片，这里取值 9000, 预留buffer
const INIT_CHUNK_SIZE = 10 * 1024 * 1024 //推荐的分块大小 10MB

export {calc_uploaded, calc_downloaded, init_chunks_parallel, init_chunks_sha1, get_available_size}

/**
 * 计算已经上传或下载的大小，单位 Bytes
 * @param part_info_list
 * @returns
 */
function calc_uploaded(part_info_list: IUpPartInfo[]): number {
  let loaded = 0
  if (part_info_list) {
    part_info_list.forEach(n => {
      if (n.etag) {
        loaded += n.part_size || 0
      }
      if (n.running) delete n.running
    })
  }
  return loaded
}

function calc_downloaded(part_info_list: IUpPartInfo[], isInit: boolean = false): number {
  let loaded = 0
  if (part_info_list) {
    part_info_list.forEach(n => {
      if (n.done) {
        loaded += n.part_size || 0
      } else {
        loaded += n.loaded || 0
      }
      if (isInit && n.running) delete n.running
    })
  }
  return loaded
}

/**
 * 获取合理的分片大小和数量
 *
 * 1. oss 限制每片大小不超过 5GB，最小100KB，最多不能超过 10000 片, 理论支持最大单文件大小 48TB
 *
 * @param file_size
 * @param init_chunk_size
 * @param limit_part_num
 * @returns [num, chunk_size]
 */
function get_available_size(
  file_size: number,
  init_chunk_size: number,
  limit_part_num: number = LIMIT_PART_NUM,
): [number, number] {
  let chunk_size = init_chunk_size
  // 找最近的 64x
  chunk_size = chunk_size + (64 - (chunk_size % 64))

  let num = Math.ceil(file_size / chunk_size)
  if (num >= limit_part_num) {
    // 超过1w片，重新分片
    chunk_size = Math.ceil(file_size / limit_part_num)
    // 找最近的 64x
    chunk_size = chunk_size + (64 - (chunk_size % 64))
    num = Math.ceil(file_size / chunk_size)
  }
  return [num, chunk_size]
}

/**
 * 分片方法 (标准模式 sha1 串行上传)
 * StandardMode 启用 sha1，必须按照顺序upload parts，并发数只能设置为1。为了保证尽量占满带宽，chunk size要够大。
 * @param file_size        number  文件大小
 * @param parts            Array<IUpPartInfo> 从服务端已经上传的拉取的分片数组，之前上传的 parts
 * @param init_chunk_size  number 初始分块大小
 * @returns [ part_info_list, chunk_size ]
 */
function init_chunks_sha1(
  file_size: number,
  parts: IUpPartInfo[] = [],
  init_chunk_size: number = INIT_CHUNK_SIZE,
): [IUpPartInfo[], number] {
  // parts[i]= { etag, part_number, part_size, upload_url }

  if (file_size === 0) {
    return [
      [
        {
          part_number: 1,
          part_size: 0,
          from: 0,
          to: 0,
        },
      ],
      init_chunk_size,
    ]
  }

  let part_info_list = []

  let offset = 0
  let loaded = 0
  let part_number = 0
  for (const n of parts) {
    loaded = Math.min(offset + n.part_size, file_size)
    part_number = n.part_number
    part_info_list.push({
      part_number,
      part_size: n.part_size,
      from: offset,
      to: loaded,
      etag: n.etag,
      upload_url: n.upload_url,
    })
    offset = loaded
  }

  // 剩下的 size
  const leftSize = file_size - loaded
  let chunk_size
  let leftNum
  if (leftSize > 0) {
    // 计算 chunk_size
    ;[leftNum, chunk_size] = get_available_size(leftSize, init_chunk_size, LIMIT_PART_NUM - part_info_list.length)

    // 剩下 leftNum 片
    const len = leftNum - 1
    let i = 0
    for (; i < len; i++) {
      part_info_list.push({
        part_number: part_number + 1 + i,
        part_size: chunk_size,
        from: offset + i * chunk_size,
        to: offset + (i + 1) * chunk_size,
      })
    }

    // 最后一片
    const last_part_size = file_size - offset - i * chunk_size

    if (last_part_size > 0) {
      part_info_list.push({
        part_number: part_number + 1 + i,
        part_size: last_part_size,
        from: offset + i * chunk_size,
        to: file_size,
      })
    }
  }

  return [part_info_list, chunk_size]
}

/**
 * 分片方法 (并发上传)
 * 每片必须一样大，除了最后一片
 * 可以并发无序上传，chunk可以小一点，以保证断点续传的效率。为了保证尽量占满带宽，要动态调节并发数。
 * @param file_size        number  文件大小
 * @param parts            Array<IUpPartInfo> 从服务端已经上传的拉取的分片数组，之前上传的 parts
 * @param init_chunk_size  number 初始分块大小
 * @returns [ part_info_list, chunk_size ]
 *
 */
function init_chunks_parallel(
  file_size: number,
  parts: IUpPartInfo[] = [],
  init_chunk_size: number = INIT_CHUNK_SIZE,
): [IUpPartInfo[], number] {
  // parts[i]= { etag, part_number, part_size, upload_url }

  if (file_size === 0) {
    return [
      [
        {
          part_number: 1,
          part_size: 0,
          from: 0,
          to: 0,
        },
      ],
      init_chunk_size,
    ]
  }

  // 计算 chunk_size, 总片数 num
  let [num, chunk_size] = get_available_size(file_size, init_chunk_size, LIMIT_PART_NUM)

  let offset = 0
  let part_number = 0
  let part_info_list = []

  const partMap: IPartMap<IUpPartInfo> = {}
  parts.forEach((n, i) => {
    partMap[n.part_number] = n
  })

  const len = num - 1
  for (let i = 0; i < len; i++) {
    let etag
    if (partMap[i + 1] && partMap[i + 1].etag) {
      // 如果某一片大小不为 chunk_size, 则需要重新上传 (去掉etag)
      if (partMap[i + 1].part_size == chunk_size) {
        etag = partMap[i + 1].etag
      }
    }

    part_number = i + 1
    part_info_list.push({
      part_number,
      part_size: chunk_size,
      from: offset,
      to: offset + chunk_size,
      etag,
    })
    offset += chunk_size
  }

  // 最后一片
  const last_part_size = file_size - offset

  if (last_part_size > 0) {
    part_info_list.push({
      part_number: part_number + 1,
      part_size: last_part_size,
      from: offset,
      to: file_size,
    })
  }

  return [part_info_list, chunk_size]
}
