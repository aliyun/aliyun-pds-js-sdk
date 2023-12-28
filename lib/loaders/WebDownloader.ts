import {IDownCheckpoint, IDownConfig} from '../Types'
import {BaseDownloader} from './BaseDownloader'
import {randomHex} from '../utils/Formatter'
import {init_chunks_web_download} from '../utils/ChunkUtil'
import {PDSError, parseErrorXML} from '../utils/PDSError'
import {getArchiveTaskResult} from '../utils/LoadUtil'
import {isNetworkError} from '../utils/HttpUtil'
import Debug from 'debug'
const debug = Debug('PDSJS:WebDownloader')

console.timeLog = console.timeLog || console.timeEnd

export class WebDownloader extends BaseDownloader {
  private aborters: AbortController[]
  private waitUntilResume: Function | null = null
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

  // 为了获取 crc64_hash 和 size
  async prepare() {
    this.changeState('prepare')
    await this.prepareDownloadUrl()
  }
  async prepareDownloadUrl() {
    if (this.archive_file_ids?.length) {
      // for archive files
      await this.getArchiveDownloadUrl()

      if (this.crc64_hash == null || this.file.size == null) {
        await this.getArchiveFileInfo(this.download_url)
      }
    } else {
      // for single file download
      await this.getDownloadUrl()
    }
  }

  // 直接使用浏览器下载
  async downloadDirectlyUsingBrowser() {
    await this.prepareDownloadUrl()

    if (!this.download_url) return

    const tmp = document.createElement('a')
    tmp.href = this.download_url
    tmp.download = this.file.name
    tmp.target = '_blank'
    document.body.appendChild(tmp)
    tmp.click()
    document.body.removeChild(tmp)
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
        Object.assign(this, getArchiveTaskResult(res2))
        this.file.size = this.size
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
    let {size, crc64} = await new Promise<{size: number | null; crc64: string | null}>((resolve, reject) => {
      fetch(url, {
        method: 'GET',
        signal: aborter.signal,
      })
        .then(r => {
          resolve({
            crc64: r.headers.get('X-Oss-Hash-Crc64ecma'),
            size: r.headers.get('Content-Length') ? parseInt(r.headers.get('Content-Length') || '0') : null,
          })
          aborter.abort()
        })
        .catch(e => {
          console.warn('abort', e)
        })
    })

    if (crc64) this.crc64_hash = crc64
    if (size) {
      this.file.size = size
      this.size = size
    }
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
    // 取消时调用

    // error 时释放
    this.stream = null
    this.response = null
    this._reader?.releaseLock?.()
    this._reader = null
  }

  cancelAllDownloadRequests() {
    if (this.verbose) console.warn('cancel all download request')

    if (this.aborters && this.aborters.length > 0) {
      this.aborters.forEach(n => {
        try {
          n.abort()
        } catch (e) {
          console.error(e)
        }
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
      let res = await fetchOssPart(this.download_url, reqOpt, async () => {
        await this.prepareDownloadUrl()
        return this.download_url
      })

      let res_headers = {}
      res.headers.forEach((v, k) => {
        res_headers[k] = v
      })

      // this.contentType = res_headers['content-type']

      let that = this

      let last_opt = {
        last_prog: 0,
      }

      this._reader = res.body?.getReader() || null

      if (!this.stream) {
        // start
        let st = Date.now()
        this.timeLogStart('crc64', st)

        this.waitUntilResume = null

        partInfo.start_time = st
        partInfo.to = this.file.size
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
                  that.handlePush(partInfo, last_opt, controller, res, push)
                })
                .catch(err => {
                  return handleReadableStream(err, resumeFun => (that.waitUntilResume = resumeFun), push)
                })
            }
          },
        })
      } else {
        this.waitUntilResume?.()
      }

      await this.downloadResponse(this.stream, res_headers)

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
        // 失败时调用
        this.cancelAllDownloadRequests()
        this.stream = null
        this.response = null
        this._reader?.releaseLock?.()
        throw err
      }
    }
  }

  handlePush(partInfo, last_opt, controller, res, push) {
    const {done, value} = res

    if (done) {
      controller.close()
      return
    }

    if (this.cancelFlag || this.stopFlag) return

    if (this.checking_crc) {
      this.last_crc64 = this.context_ext.calcCrc64.call(this.context_ext, value, this.last_crc64)
    }

    // 在这里根据 value 统计进度
    this.loaded += value?.length
    partInfo.loaded += value?.length
    this.updateProgressStep(last_opt)

    controller.enqueue(value)
    return push()
  }

  async downloadResponse(stream, res_headers) {
    if (!this.response) {
      this.response = new Response(stream, {
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
    } else {
      // 终止。
      await new Promise(a => {})
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

export function handleReadableStream(err, setResumeFun, next) {
  if (err.name == 'AbortError') {
    // 暂停，等待
    return new Promise(a => setResumeFun(a)).then(() => {
      next()
    })
  } else if (isNetworkError(err)) {
    // should retry
    // // // 网络问题，不用太频繁
    setTimeout(() => {
      // 尝试 retry
      next()
    }, 600)
    // // 等待通过主流程 speed为0 判断 retry
  } else {
    return Promise.reject(err)
  }
}

export async function fetchOssPart(url, reqOpt, getUrlFun) {
  let request = fetch(url, reqOpt)
  let res = await request

  // 服务端错误处理
  if (res.status >= 400) {
    let xmlStr = await res.text()
    let xmlInfo = parseErrorXML(xmlStr)
    let err = new PDSError(xmlInfo.message, xmlInfo.code, res.status, xmlInfo.reqId)
    if (err.code == 'AccessDenied' && err.message.includes('expired')) {
      // 如果 url 过期
      // 需要重新获取 downloadUrl
      let url2 = await getUrlFun()
      // 重新 fetch
      res = await fetchOssPart(url2, reqOpt, getUrlFun)
    } else {
      // 其他错误, throw
      throw err
    }
  }

  return res
}
