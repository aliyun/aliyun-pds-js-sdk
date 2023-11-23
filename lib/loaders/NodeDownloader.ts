import {BaseDownloader} from './BaseDownloader'
import {calc_downloaded} from '../utils/ChunkUtil'
import {isNetworkError} from '../utils/HttpUtil'
import {PDSError} from '../utils/PDSError'
import {IDownPartInfo} from '../Types'

// const STREAM_HIGH_WATER_MARK = 512 * 1024 // 512KB
// import Debug from 'debug'
// const debug = Debug('PDSJS:BaseUploader')

// 分片并发下载逻辑
export class NodeDownloader extends BaseDownloader {
  private _done_part_loaded = 0
  private getNextPart() {
    let allDone = true
    // let allRunning = true
    let nextPart: IDownPartInfo = {part_number: 0, part_size: 0}
    let hasNext = false

    if (!this.part_info_list || this.part_info_list.length == 0) {
      // 异步，已完成，有可能会清空 this.part_info_list 以做垃圾回收
      hasNext = false
      return {allDone, nextPart, hasNext}
    }

    for (const n of this.part_info_list) {
      if (!n.done) {
        allDone = false
        if (!n.running) {
          nextPart = n
          hasNext = true
          // allRunning = false
          break
        }
      }
    }
    return {allDone, nextPart, hasNext}
  }
  async download() {
    this._done_part_loaded = calc_downloaded(this.part_info_list)
    this.start_done_part_loaded = this._done_part_loaded // 用于计算平均速度
    this.loaded = this._done_part_loaded

    let con = 0
    this.maxConcurrency = this.init_chunk_con

    const running_parts = {}

    const last_prog = 0

    let keep_going = (v?) => {}
    let should_going = false
    let hasError: Error | null = null
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.stopFlag) {
        throw new PDSError('stopped', 'stopped')
      }
      if (hasError) {
        throw hasError
      }
      let {allDone, nextPart: partInfo, hasNext} = this.getNextPart()
      if (allDone) {
        //所有分片都完成
        break
      }

      if (hasNext && con < this.maxConcurrency) {
        if (this.verbose)
          console.log('并发: ', con + 1, '/', this.maxConcurrency)

          // 异步执行
        ;(async () => {
          if (this.stopFlag) {
            return
          }

          con++
          running_parts[partInfo.part_number] = 0
          try {
            await this.down_part(partInfo, running_parts, {last_prog})
          } catch (e) {
            console.error(e)
            // 异步的，不要 throw 了
            hasError = e
          }
          con--

          // 通知有下一个了
          if (should_going) {
            keep_going()
            should_going = false
          }
        })()
      } else {
        // 等待下一个
        await new Promise(a => {
          keep_going = a
          should_going = true
        })
      }
    }
    // 最后
    this.notifyProgress(this.state, 100)
  }

  private async down_part(partInfo, running_parts, last_opt) {
    partInfo.start_time = Date.now()
    this.timeLogStart('part-' + partInfo.part_number, Date.now())

    // 暂停后，再次从0开始
    partInfo.loaded = 0
    // partInfo.loaded = partInfo.loaded || 0
    partInfo.running = true
    partInfo.done = false

    try {
      await this.downloadPartRetry(partInfo, {
        method: 'get',
        url: this.download_url,
        headers: {
          Range: `bytes=${partInfo.from + partInfo.loaded}-${partInfo.to - 1}`,
        },
        responseType: 'stream',
        maxContentLength: Infinity,
        maxRedirects: 5,

        // node 下增加扩展字段
        xOptions: {
          start: partInfo.from + partInfo.loaded, // 从上次断点开始
          loaded: partInfo.loaded,
          total: partInfo.part_size,

          downloadPath: this.file.temp_path,

          getStopFlag: () => {
            return this.stopFlag
          },
        },

        onDownloadProgress: ({loaded}) => {
          partInfo.loaded = loaded
          running_parts[partInfo.part_number] = loaded || 0

          let running_part_loaded = 0
          for (const k in running_parts) running_part_loaded += running_parts[k]

          this.loaded = this._done_part_loaded + running_part_loaded
          // 回调太频繁，需要缓冲，不然会影响下载速度
          // this.updateProgressThrottle()
          this.updateProgressStep(last_opt)
        },
      })

      // 成功后
      partInfo.loaded = partInfo.part_size
      partInfo.done = true
      delete partInfo.running

      partInfo.end_time = Date.now()
      this.timeLogEnd('part-' + partInfo.part_number, Date.now())

      delete running_parts[partInfo.part_number]
      this._done_part_loaded += partInfo.part_size

      if (this.verbose) {
        console.log(
          `[${this.file.name}] download part[${partInfo.part_number}/${this.part_info_list.length}] complete, elapse:${
            partInfo.end_time - partInfo.start_time
          }ms`,
        )
      }

      this.notifyPartCompleted(partInfo)
    } catch (e) {
      await this.handlePartError(e, partInfo)
    }
  }
  async handlePartError(e, partInfo) {
    delete partInfo.done
    delete partInfo.running
    partInfo.loaded = 0

    if (this.verbose && e.message !== 'stopped' && e.code !== 'stopped') {
      console.warn(
        `[${this.file.name}] download part[${partInfo.part_number}/${this.part_info_list.length}] error: ${e.message}`,
      )
    }

    /* istanbul ignore next */
    /* istanbul ignore if */
    if (e.response) {
      if (e.response.status == 404) {
        if (e.response.data.indexOf('The specified download_url does not exist') != -1) {
          // 清空，报错，重来
          delete this.download_id
          this.part_info_list.forEach(n => {
            delete n.crc64
            delete n.crc64_st
            delete n.running
            delete n.loaded
            delete n.done
          })
        }
        // should throw anyway
      } else if (e.response.status == 504 || isNetworkError(e)) {
        // 重试, 海外连国内，可能会504
        return
      }
    }

    if (e.message == 'LengthNotMatchError') {
      // pass
      return
    }
    throw e
  }
}
