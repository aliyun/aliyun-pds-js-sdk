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
        n.abort()
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
    this.crc64_hash = await this.headCRC64()

    this.timeLogEnd('crc64', Date.now())

    this.calc_crc64 = this.last_crc64

    if (this.calc_crc64 != this.crc64_hash) {
      throw new Error(`crc64_hash not match: ${this.calc_crc64} != ${this.crc64_hash}`)
    }
  }
}
