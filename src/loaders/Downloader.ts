/** @format */

import {BaseDownloader} from './BaseDownloader'
import {calc_downloaded} from '../utils/ChunkUtil'
import {isNetworkError} from '../utils/HttpUtil'

// import Debug from 'debug'
// const debug = Debug('PDSJS:BaseUploader')

// 分片并发下载逻辑
export class Downloader extends BaseDownloader {
  private _done_part_loaded = 0
  getNextPart() {
    let allDone = true
    // let allRunning = true
    let nextPart = null
    for (const n of this.part_info_list) {
      if (!n.done) {
        allDone = false
        if (!n.running) {
          nextPart = n
          // allRunning = false
          break
        }
      }
    }
    return {allDone, nextPart}
  }
  async download() {
    this._done_part_loaded = calc_downloaded(this.part_info_list)
    this.start_done_part_loaded = this._done_part_loaded // 用于计算平均速度
    this.loaded = this._done_part_loaded

    let con = 0
    this.maxConcurrency = this.init_chunk_con

    const running_parts = {}

    const last_prog = 0

    let keep_going = null

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.stopFlag) {
        throw new Error('stopped')
      }
      let {allDone, nextPart: partInfo} = this.getNextPart()
      if (allDone) {
        //所有分片都完成
        break
      }

      if (partInfo && con < this.maxConcurrency) {
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
            // 异步的，不要 throw 了
            return this.handleError(e)
          }
          con--

          // 通知有下一个了
          if (keep_going) {
            keep_going()
            keep_going = false
          }
        })()
      } else {
        // 等待下一个
        await new Promise(a => {
          keep_going = a
        })
      }
    }
    // 最后
    this.notifyProgress(this.state, 100)
  }

  async down_part(partInfo, running_parts, last_opt) {
    partInfo.start_time = Date.now()
    this.timeLogStart('part-' + partInfo.part_number, Date.now())

    // 暂停后，再次从0开始
    partInfo.loaded = 0
    // partInfo.loaded = partInfo.loaded || 0
    partInfo.running = true
    partInfo.done = false

    if (this.verbose) {
      console.log(
        `[${this.file.name}] downloading part:`,
        partInfo.part_number,
        ` : ${this.part_info_list.length}`,
        partInfo.from,
        '~',
        partInfo.to,
        ', totol size:',
        this.file.size,
      )
    }

    try {
      let streamResult = await this.downloadPartRetry(partInfo, {
        method: 'get',
        url: this.download_url,
        headers: {
          Range: `bytes=${partInfo.from + partInfo.loaded}-${partInfo.to - 1}`,
        },
        responseType: 'stream',
        maxContentLength: Infinity,
        maxRedirects: 5,
      })

      let cache_block_size = Math.max(512 * 1024, Math.floor(this.file.size / 500))

      await this.pipeWS(streamResult.data, partInfo, cache_block_size, running_parts, ({loaded}) => {
        running_parts[partInfo.part_number] = loaded || 0

        let running_part_loaded = 0
        for (const k in running_parts) running_part_loaded += running_parts[k]

        this.loaded = this._done_part_loaded + running_part_loaded
        // 回调太频繁，需要缓冲，不然会影响下载速度
        // this.updateProgressThrottle()
        this.updateProgressStep(last_opt)
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
          `[${this.file.name}] download part complete: `,
          partInfo.part_number,
          ` : ${this.part_info_list.length}, elapse:${partInfo.end_time - partInfo.start_time}ms`,
        )
      }

      this.notifyPartCompleted(partInfo)
    } catch (e) {
      delete partInfo.done
      delete partInfo.running
      partInfo.loaded = 0

      if (this.verbose) {
        console.warn(`[${this.file.name}] download error part_number=${partInfo.part_number}: ${e.message}`)
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

      if (e.message == 'retry_download_part') {
        // pass
        return
      }
      throw e
    }
  }

  pipeWS(stream, partInfo, block_size, running_parts, onPartProgress) {
    const {fs} = this.context
    let c = 0

    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(this.file.temp_path, {
        // autoClose: true,
        flags: 'r+',
        start: partInfo.from + partInfo.loaded, // 从上次断点开始
      })

      stream.on('data', chunk => {
        if (this.stopFlag) {
          const stopErr = new Error('stopped')
          // 流要destroy掉
          stream.destroy(stopErr)
          ws.destroy(stopErr)

          reject(stopErr)
          return
        }

        partInfo.loaded += chunk.byteLength
        c += chunk.byteLength

        // fix： 一开始 speed == 0, 超过10次会重复暂停启动
        if (running_parts[partInfo.part_number] === 0) {
          onPartProgress(partInfo)
        }

        if (c >= block_size) {
          c = 0
          onPartProgress(partInfo)
        }
      })

      stream.pipe(ws)

      stream.on('error', e => {
        reject(e)
      })
      ws.on('finish', () => {
        if (partInfo.loaded != partInfo.part_size) {
          console.warn(
            '--------------------块下载失败(需重试)',
            partInfo.loaded,
            partInfo.part_size,
            'retry_download_part',
          )

          onPartProgress(partInfo)
          reject(new Error('retry_download_part'))
        } else {
          onPartProgress(partInfo)
          resolve(void 0)
        }
      })
      ws.on('error', e => {
        reject(e)
      })
    })
  }
}
