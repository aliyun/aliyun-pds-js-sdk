import {IDownCheckpoint, IDownConfig} from '../Types'
import {BaseDownloader} from './BaseDownloader'
import {randomHex} from '../utils/Formatter'
import {init_chunks_web_download} from '../utils/ChunkUtil'
import {PDSError, parseErrorXML} from '../utils/PDSError'
import {getArchiveTaskResult} from '../utils/LoadUtil'
import {isNetworkError} from '../utils/HttpUtil'

console.timeLog = console.timeLog || console.timeEnd
// Using readable streams: https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API/Using_readable_streams
// Blob: https://chromium.googlesource.com/chromium/src/+/HEAD/storage/browser/blob/README.md
export class WebDownloader extends BaseDownloader {
  private aborters: AbortController[]
  private waitUntilSuccess: Function | null = null
  private stream: ReadableStream | null = null
  private response: Response | null = null
  private last_crc64: string = ''
  private _reader: ReadableStreamDefaultReader<Uint8Array> | null = null

  private controller

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
    console.debug('prepare DownloadUrl: ', this.download_url)
  }

  // 直接使用浏览器下载
  async downloadDirectlyUsingBrowser() {
    await this.prepareDownloadUrl()

    if (!this.download_url) return

    downloadLink(this.download_url, this.file.name)
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
    this._reader?.cancel?.()
    // this._reader?.releaseLock?.()
    this._reader = null
  }

  cancelAllDownloadRequests() {
    if (this.verbose) console.warn('cancel all download request')

    if (this.aborters && this.aborters.length > 0) {
      this.aborters.forEach(n => {
        if (!n?.signal?.aborted) n?.abort?.()
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

    let res_headers = {}
    let res

    try {
      res = await fetchOssPart(this.download_url, reqOpt, async () => {
        await this.prepareDownloadUrl()
        return this.download_url
      })

      res.headers.forEach((v, k) => {
        res_headers[k] = v
      })

      // this.contentType = res_headers['content-type']

      let that = this

      let last_opt = {
        last_prog: 0,
      }

      this._reader = res.body?.getReader() || null

      let promFun = {resolve: (v: unknown) => {}, reject: (v: unknown) => {}}

      let url = await new Promise((a, b) => {
        promFun.resolve = a
        promFun.reject = b

        if (!this.stream) {
          // start
          let st = Date.now()
          this.timeLogStart('crc64', st)

          partInfo.start_time = st
          partInfo.to = this.file.size
          partInfo.loaded = 0
          partInfo.crc64_st = st
          this.timeLogStart('part-' + partInfo.part_number, st)

          this.last_crc64 = '0'

          this.stream = new ReadableStream({
            // start 方法不要用 async/await (会造成内存泄露)
            start(ctrl) {
              that.controller = ctrl
              that.pushStream(promFun, partInfo, last_opt)
            },
          })
        } else {
          // resume
          that.pushStream(promFun, partInfo, last_opt)
        }

        if (!this.response) {
          this.response = new Response(this.stream, {
            headers: res_headers,
          })

          this.response
            .blob()
            .then(r => this.mockResponseError(r))
            .then(b => {
              return URL.createObjectURL(b)
            })
            .then(url => {
              this.waitUntilSuccess?.(url)
              promFun.resolve(url)
            })

            .catch(err => {
              console.debug('------blob error', err)
              if (err.name == 'TypeError' && err.message.includes('Failed to fetch')) {
                // 浏览器缓存空间不足
                promFun.reject(new PDSError('The browser cache space is insufficient', 'InsufficientBrowserCacheSpace'))
              } else {
                promFun.reject(err)
              }
            })
        } else {
          new Promise(a => (this.waitUntilSuccess = a)).then(url => {
            promFun.resolve(url)
          })
        }
      })

      downloadLink(url, this.file.name)

      // end
      let et = Date.now()
      partInfo.crc64_et = et
      partInfo.crc64 = this.last_crc64
      partInfo.end_time = et
      partInfo.done = true
      this.timeLogEnd('part-' + partInfo.part_number, et)
    } catch (err) {
      await this.handleDownloadError(err)
    }
  }
  protected mockResponseError(r) {
    return r
  }
  protected mockPushStreamError(r) {
    return r
  }
  pushStream(promFun, partInfo, last_opt) {
    return this._reader
      ?.read()
      .then(res => {
        this.handlePush(partInfo, last_opt, this.controller, res, () => {
          this.pushStream(promFun, partInfo, last_opt)
        })
      })
      .then(r => this.mockPushStreamError(r))
      .catch(err => {
        console.debug('=======stream catch error', err)
        if (isNetworkError(err)) {
          // 无网络, 重试 push
          setTimeout(() => {
            if (this.stopFlag || this.cancelFlag) {
              promFun.reject(new PDSError('stopped', 'stopped'))
              return
            }
            this.pushStream(promFun, partInfo, last_opt)
          }, 1000)
        } else if (err.message.includes(`Failed to execute 'enqueue' on 'ReadableStreamDefaultController'`)) {
          // 浏览器缓存空间不足 引起的
          promFun.reject(new PDSError('The browser cache space is insufficient', 'InsufficientBrowserCacheSpace'))
        } else {
          promFun.reject(err)
        }
      })
  }
  async handleDownloadError(err) {
    const errorName = (err as Error)?.name
    console.debug('handleDownloadError', err, ', Error name:', errorName)
    console.debug('stream is locked:', this.stream?.locked, ', reader:', this._reader)

    if (errorName == 'AbortError') {
      throw new PDSError('stopped', 'stopped')
    } else if (err.message == 'stopped') {
      throw new PDSError('stopped', 'stopped')
    } else if (err.message == 'BodyStreamBuffer was aborted') {
      throw new PDSError('stopped', 'stopped')
      // } else if (err.name == 'TypeError' && err.message == 'Failed to fetch') {
      //   console.warn(err)

      //   // 其他情况的 Failed to fetch,  停止
      //   console.warn('should retry')

      //   setTimeout(() => {
      //     this.retryAllDownloadRequest()
      //   }, 1000)
      //   throw new PDSError('stopped', 'stopped')
    } else {
      console.error('Download failed:', `[${errorName}]`, err)
      // 失败
      try {
        this.cancelAllDownloadRequests()
      } catch (e2) {
        console.warn('cancelAllDownloadRequests error:', e2)
      }
      this.stream = null
      this.response = null
      this._reader?.cancel()
      this._reader = null
      // this._reader?.releaseLock?.() // 暂停

      throw err
    }
  }

  handlePush(partInfo, last_opt, controller, res, push) {
    const {done, value} = res

    if (done) {
      console.debug('done: controller.close()', this.loaded, '/', this.file.size)
      controller.close()
      return
    }

    if (this.cancelFlag || this.stopFlag) {
      return
    }

    // 先push
    controller.enqueue(value)

    // 再计算
    if (this.checking_crc) {
      this.last_crc64 = this.context_ext.calcCrc64.call(this.context_ext, value, this.last_crc64)
    }

    // 在这里根据 value 统计进度
    this.loaded += value?.length
    partInfo.loaded += value?.length
    this.updateProgressStep(last_opt)

    return push()
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

// 单个文件:  a link
export async function downloadLink(url, fileName) {
  console.debug('downloadLink:', url, fileName)
  const tmp = document.createElement('a')
  tmp.href = url
  tmp.download = fileName
  tmp.target = '_blank' //_blank:会打开很多个tab，然后消失掉，有点影响体验。如果没有此项，同时下载多次该方法，可能仅下载一次。

  document.body.appendChild(tmp)
  tmp.click()

  setTimeout(() => {
    document.body.removeChild(tmp)
    URL.revokeObjectURL(url)
  }, 10)
}

// 单个文件:  iframe 可连续下载（无法指定 fileName, 废弃）
export function downloadLink2(url, fileName) {
  console.debug('downloadLink:', url, fileName)
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none' // 防止影响页面
  iframe.style.height = '0px' // 防止影响页面
  iframe.src = url
  document.body.appendChild(iframe) // 这一行必须，iframe挂在到dom树上才会发请求

  // 无法触发onload事件，10s 之后删除
  setTimeout(() => {
    iframe.remove()
  }, 10 * 1000)

  URL.revokeObjectURL(url)
}
