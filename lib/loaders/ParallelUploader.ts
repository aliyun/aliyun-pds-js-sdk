import {BaseUploader} from './BaseUploader'
import {calc_uploaded} from '../utils/ChunkUtil'
import {isNetworkError} from '../utils/HttpUtil'
import {PDSError} from '../utils/PDSError'
import {IUpPartInfo} from '../Types'

// 分片并发上传逻辑
export class ParallelUploader extends BaseUploader {
  private _done_part_loaded = 0
  private getNextPart() {
    let hasNext = false
    let allDone = true
    // let allRunning = true
    let nextPart: IUpPartInfo = {part_number: 0, part_size: 0}

    if (!this.part_info_list || this.part_info_list.length == 0) {
      // 异步，已完成，有可能会清空 this.part_info_list 以做垃圾回收
      hasNext = false
      return {allDone, nextPart, hasNext}
    }

    for (const n of this.part_info_list) {
      if (!n.etag) {
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
  // 并发上传
  async upload() {
    this._done_part_loaded = calc_uploaded(this.part_info_list)
    this.start_done_part_loaded = this._done_part_loaded // 用于计算平均速度
    this.loaded = this._done_part_loaded

    let con = 0

    this.maxConcurrency = this.init_chunk_con

    const running_parts = {}
    let last_prog = 0

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
            await this.up_part(partInfo, running_parts, {last_prog})
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

  private async up_part(partInfo, running_parts, last_opt) {
    partInfo.start_time = Date.now()
    this.timeLogStart('part-' + partInfo.part_number, Date.now())
    // 暂停后，再次从0开始
    partInfo.loaded = 0
    partInfo.running = true
    delete partInfo.etag

    let keep_part_loaded = 0
    try {
      const reqHeaders = {
        'Content-Type': partInfo.content_type || '',
      }

      if (this.context_ext.context.isNode) {
        reqHeaders['Content-Length'] = partInfo.part_size
      }

      const result = await this.uploadPartRetry(partInfo, {
        method: 'put',
        url: partInfo.upload_url,
        headers: reqHeaders,
        maxContentLength: Infinity,
        maxRedirects: 5,

        data: this.sliceFilePart(partInfo),
        onUploadProgress: ({loaded}) => {
          keep_part_loaded = loaded

          running_parts[partInfo.part_number] = loaded || 0

          let running_part_loaded = 0
          for (const k in running_parts) running_part_loaded += running_parts[k]
          this.loaded = this._done_part_loaded + running_part_loaded

          // 更新进度，缓冲
          // this.updateProgressThrottle()
          this.updateProgressStep(last_opt)
        },
      })

      if (this.file.size == 0) {
        // fix size=0 的情况
        this.progress = 100
        this.notifyProgress(this.state, this.progress)
      }

      if ((keep_part_loaded || 0) != partInfo.part_size) {
        console.warn('--------------------块上传失败(需重试)', keep_part_loaded, partInfo.part_size)
        throw new Error('LengthNotMatchError')
      }

      partInfo.etag = result.headers.etag
      if (!partInfo.etag) {
        throw new Error('请确定Bucket是否配置了正确的跨域设置')
      }

      // 成功后
      partInfo.loaded = partInfo.part_size
      delete partInfo.running

      partInfo.end_time = Date.now()
      this.timeLogEnd('part-' + partInfo.part_number, Date.now())

      delete running_parts[partInfo.part_number]
      this._done_part_loaded += partInfo.part_size

      if (this.verbose) {
        console.log(
          `[${this.file.name}] upload part[${partInfo.part_number}/${this.part_info_list.length}] complete, elapse:${
            partInfo.end_time - partInfo.start_time
          }ms`,
        )
      }

      this.notifyPartCompleted(partInfo)
    } catch (e) {
      this.handleUpPartError(e, partInfo, running_parts)
    }
  }
  handleUpPartError(e, partInfo, running_parts) {
    delete partInfo.loaded
    delete partInfo.running
    delete partInfo.etag

    running_parts[partInfo.part_number] = 0

    if (this.verbose && e.message !== 'stopped' && e.code !== 'stopped') {
      console.log(
        `[${this.file.name}] upload part[${partInfo.part_number}/${this.part_info_list.length}] errror: ${e.message}`,
      )
    }

    if (e.response) {
      if (e.response.status == 404) {
        if (e.response.data && e.response.data.indexOf('The specified upload does not exist') != -1) {
          delete this.upload_id
          this.part_info_list.forEach(n => {
            delete n.etag
            delete n.loaded
            delete n.running
          })
        }
        // should throw anyway
      } else if (e.response.status == 504 || isNetworkError(e)) {
        // 重试, 海外连国内，可能会504
        return
      }
    }

    if (e.message == 'LengthNotMatchError') {
      // 重试
      return
    }

    throw e
  }
}
