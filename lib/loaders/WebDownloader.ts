import {IDownCheckpoint, IDownConfig} from '../Types'
import {BaseDownloader} from './BaseDownloader'
import {randomHex} from '../utils/Formatter'
import {init_chunks_web_download} from '../utils/ChunkUtil'
import {PDSError} from '../utils/PDSError'

import Debug from 'debug'
const debug = Debug('PDSJS:WebDownloader')

console.timeLog = console.timeLog || console.timeEnd

export class WebDownloader extends BaseDownloader {
  private aborters: AbortController[]
  private waitUntilResume: Function | null = null
  private waitUntilDone: Function | null = null
  private stream: ReadableStream | null = null
  private response: Response | null = null
  private last_crc64: string = ''
  private _reader: ReadableStreamDefaultReader<Uint8Array> | null = null

  constructor(
    checkpoint: IDownCheckpoint,
    configs: IDownConfig = {},
    vendors = {},
    context_ext = {},
    axios_options = {},
  ) {
    // web
    configs.max_chunk_size = checkpoint.file.size
    configs.init_chunk_con = 1
    configs.chunk_con_auto = false

    super(checkpoint, configs, vendors, context_ext, axios_options)

    this.aborters = []
  }

  // for archive files
  async prepare() {
    this.changeState('prepare')

    await this.getArchiveDownloadUrl()

    // 获取 size
    let {crc64, size} = await this.getArchiveFileInfo(this.download_url)
    this.crc64_hash = crc64
    this.file.size = size
  }
  // 打包，获取 download_url
  async getArchiveDownloadUrl() {
    if (!this.archive_async_task_id) {
      let res1 = await this.vendors.http_util.callRetry(this.doArchiveFiles, this, [], {
        verbose: this.verbose,
        getStopFlag: () => {
          return this.stopFlag
        },
      })
      this.archive_async_task_id = res1.async_task_id

      if (res1.state == 'Succeed') {
        this.download_url = res1.url || this.download_url
        return res1
      }
      if (res1.state == 'Failed') {
        throw new Error('Failed to archive files, async task id:' + res1.async_task_id)
      }
    }

    if (this.cancelFlag || this.stopFlag) return

    // 服务端打包下载, 轮询直到返回
    while (true) {
      let res2 = await this.vendors.http_util.callRetry(this.doGetAsyncTaskInfo, this, [], {
        verbose: this.verbose,
        getStopFlag: () => {
          return this.stopFlag
        },
      })
      if (res2.state == 'Succeed') {
        this.download_url = res2.url || this.download_url
        return res2
      }
      if (res2.state == 'Failed') {
        throw new Error('Failed to archive files, async task id:' + res2.async_task_id)
      }

      if (this.cancelFlag || this.stopFlag) return
      await new Promise(a => setTimeout(a, 5000)) // wait 5 seconds
      if (this.cancelFlag || this.stopFlag) return
    }
  }
  // 通过 get url 的 response headers， 获取信息
  async getArchiveFileInfo(url) {
    let aborter = new AbortController()
    this.aborters.push(aborter)

    // 没有 head 方法， 先 get 再 abort
    let {size, crc64} = await new Promise<{size: number; crc64: string}>((resolve, reject) => {
      fetch(url, {
        method: 'GET',
        signal: aborter.signal,
      })
        .then(r => {
          resolve({
            crc64: r.headers.get('X-Oss-Hash-Crc64ecma') || '',
            size: parseInt(r.headers.get('Content-Length') || '0'),
          })
          aborter.abort()
        })
        .catch(e => {
          console.warn('abort', e)
        })
    })
    return {size, crc64}
  }
  async doArchiveFiles() {
    const result = await this.http_client_call(
      'archiveFiles',
      {
        drive_id: this.loc_type == 'drive' ? this.loc_id : undefined,
        share_id: this.loc_type == 'share' ? this.loc_id : undefined,
        name: this.file.name,
        files: this.archive_file_ids.map(n => {
          return {
            file_id: n,
          }
        }),
      },
      this.axios_options,
    )
    return result
  }
  async doGetAsyncTaskInfo() {
    const result = await this.http_client_call(
      'getAsyncTaskInfo',
      {
        async_task_id: this.archive_async_task_id,
      },
      this.axios_options,
    )
    this.download_url = result.url || this.download_url
    return result
  }
  initChunks() {
    // web 分块策略: 目前仅支持1片
    let [part_info_list, chunk_size] = init_chunks_web_download(this.file.size)
    this.part_info_list = part_info_list
  }
  destroy() {
    // 释放
    this.stream = null
    this.response = null
    this._reader = null
  }

  cancelAllDownloadRequests() {
    if (this.verbose) console.warn('cancel all download request')

    if (this.aborters && this.aborters.length > 0) {
      this.aborters.forEach(n => {
        try {
          n.abort()
        } catch (e) {}
      })
      this.aborters = []
    }
  }

  async checkLocalDiskSize() {
    // web 版无需
    if (this.verbose) console.warn('not need to checkLocalDiskSize')
  }

  async create() {
    // const p = this.file.temp_path

    if (!this.download_id) {
      // await this.context_ext.createFile.call(this.context_ext, p, '')
      this.download_id = randomHex()
      await this.changeState('created')
    } else {
      // await this.context_ext.createFileIfNotExists.call(this.context_ext, p, '')
    }
  }

  async download() {
    let partInfo = this.part_info_list[0]
    await this.downloadStream(partInfo)
  }

  // web download stream
  async downloadStream(partInfo) {
    let aborter = new AbortController()
    this.aborters.push(aborter)
    const {headers = {}} = this.axios_options
    const reqOpt = {
      ...this.axios_options,
      headers: {
        ...headers,
        ...(this.loaded
          ? {
              Range: `bytes=${this.loaded}-`,
            }
          : false),
      },
      signal: aborter.signal,
    }

    try {
      let request = fetch(this.download_url, reqOpt)
      let res = await request

      let res_headers = {}
      res.headers.forEach((v, k) => {
        res_headers[k] = v
      })

      // this.contentType = res_headers['content-type']

      let that = this
      let last_prog = 0

      this._reader = res.body?.getReader() || null

      if (!this.stream) {
        // start
        let st = Date.now()
        this.timeLogStart('crc64', st)

        partInfo.start_time = st
        partInfo.to = this.size
        partInfo.loaded = 0
        partInfo.crc64_st = st
        this.timeLogStart('part-' + partInfo.part_number, st)

        this.last_crc64 = '0'

        this.stream = new ReadableStream({
          // start 方法不要用 async/await (会造成内存泄露)
          start(controller) {
            return push()
            function push() {
              return that._reader
                ?.read()
                .then(res => {
                  const {done, value} = res

                  if (done) {
                    controller.close()
                  }

                  if (that.checking_crc) {
                    that.last_crc64 = that.context_ext.calcCrc64.call(that.context_ext, value, that.last_crc64)
                  }

                  // 在这里根据 value 统计进度
                  that.loaded += value?.length
                  partInfo.loaded += value?.length

                  that.updateProgressStep({last_prog})

                  controller.enqueue(value)
                  return push()
                })
                .catch(err => {
                  if (err.name == 'AbortError') {
                    // 暂停，等待
                    return new Promise(a => (that.waitUntilResume = a)).then(() => {
                      push()
                    })
                  } else return err
                })
            }
          },
        })

        // ------------------>
      } else {
        this.waitUntilResume?.()
      }

      if (!this.response) {
        this.response = new Response(this.stream, {
          headers: res_headers,
        })

        const b = await this.response.blob()

        const objUrl = URL.createObjectURL(b)

        const tmp = document.createElement('a')
        tmp.href = objUrl
        tmp.download = this.file.name
        document.body.appendChild(tmp)
        tmp.click()

        document.body.removeChild(tmp)
        URL.revokeObjectURL(objUrl)
        this.waitUntilDone?.()
      } else {
        await new Promise(a => (this.waitUntilDone = a))
      }

      // end
      let et = Date.now()
      partInfo.crc64_et = et
      partInfo.crc64 = this.last_crc64
      partInfo.end_time = et
      partInfo.done = true
      this.timeLogEnd('part-' + partInfo.part_number, et)
    } catch (err) {
      console.error(err)

      if ((err as Error).name == 'AbortError') {
        throw new PDSError('stopped', 'stopped')
      } else {
        this.cancelAllDownloadRequests()
        throw err
      }
    }
  }

  async complete() {
    await this.changeState('complete')
  }

  async checkFileHash() {
    const timeKey = `crc64[${this.file.name}](${Math.random()}) elapse:`
    if (this.verbose) console.time(timeKey)

    await this.changeState('checking')
    if (!this.crc64_hash) {
      this.crc64_hash = await this.headCRC64()
    }

    this.timeLogEnd('crc64', Date.now())

    this.calc_crc64 = this.last_crc64

    if (this.calc_crc64 != this.crc64_hash) {
      throw new Error(`crc64_hash not match: ${this.calc_crc64} != ${this.crc64_hash}`)
    }
  }
}
