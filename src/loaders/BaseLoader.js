/** @format */

import {EventEmitter} from '../utils/EventEmitter'

export class BaseLoader extends EventEmitter {
  // 甘特图数据
  _time_logs = {}

  timeLogStart(key, time) {
    this._time_logs[key] = {
      start: time,
    }
  }
  timeLogEnd(key, time) {
    if (this._time_logs[key])
      Object.assign(this._time_logs[key], {
        end: time,
      })
  }
  printTimeLogs() {
    let m = this._time_logs
    // console.log(JSON.stringify(m))
    let parts_len = 0
    let arr = Object.keys(m)
      .map(key => {
        let k = key.replace(/-.*/g, '')
        if (k == 'part') parts_len++
        return {...m[key], k, key}
      })
      .sort((a, b) => (a.start > b.start ? 1 : -1))
    // console.log('timeLogs:', arr)

    let action = m['download'] ? 'download' : 'upload'
    let load_item = m['download'] || m['upload']
    let task_item = m['task'] || {}
    let crc64_item = m['crc64']
    const pre_end = load_item?.start || task_item?.end

    const elapsed = task_item.end - task_item.start
    const pre_elapsed = pre_end - task_item.start

    const load_elapsed = load_item ? load_item.end - pre_end : 0
    const post_elapsed = load_item ? task_item.end - load_item.end : 0

    console.log(`pre: ${pre_elapsed}ms -- ${action}: ${load_elapsed}ms (parts:${parts_len}) -- post: ${post_elapsed}ms`)

    if (parts_len > 1000) {
      console.log(`parts[${parts_len}]太多，不展示甘特图`)
      return
    }

    const w = 600 // px

    // pre
    this.printBar(0, ((pre_end - task_item.start) * w) / elapsed, '#409EFF', `pre,${pre_end - task_item.start}ms`)

    let colorM = {
      // 'pre':'#409EFF',
      sha1: '#0066ff',
      pre_sha1: '#00ddff',
      multi_sha1: '#0088ff',
      part: '#67C23A',
      // upload: 'red',
      // download: 'red',
      // axiosUploadPart: 'green',
      // axiosDownloadPart: 'green',
      createFile: '#673AB7',
      completeFile: '#3F51B5',
      getFileUploadUrl: '#26C6DA',
      getDownloadUrl: '#26C6DA',
      listFileUploadedParts: '#26C6DA',
      deleteFile: 'red',
      // 'crc64': '#E6A23C'
    }

    // arr (colorM 中有颜色的，才打印)
    arr
      .filter(n => {
        let k = n.key.replace(/-.*/g, '')
        n.color = colorM[k]
        return n.color ? true : false
      })
      .forEach(n => {
        const left = ((n.start - task_item.start) * w) / elapsed
        const width = ((n.end - n.start) * w) / elapsed
        this.printBar(left, width, n.color, `${n.key}: ${n.end - n.start}ms`)
      })

    // crc64
    if (crc64_item) {
      this.printBar(
        ((crc64_item.start - task_item.start) * w) / elapsed,
        ((crc64_item.end - crc64_item.start) * w) / elapsed,
        '#E6A23C',
        `crc64: ${crc64_item.end - crc64_item.start}ms`,
      )
    }
  }
  printBar(left, width, color, msg = '') {
    width = width > 7 ? width - 7 : 0
    console.log('%c ', `background:${color};margin-left:${left}px;padding-left:${width}px;`, msg)
  }
}
