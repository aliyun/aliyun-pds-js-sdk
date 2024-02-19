// const PDSError = require('../utils/PDSError').PDSError

import {
  IContextExt,
  IClientParams,
  IFile,
  IUpPartInfo,
  IDownPartInfo,
  IUpConfig,
  IUpCheckpoint,
  UploadState,
  IPDSRequestConfig,
} from '../Types'
import {PDSError} from '../utils/PDSError'
import {StandardParallelUploadTask} from '../tasks/StandardParallelUploadTask'
import {StandardSerialUploadTask} from '../tasks/StandardSerialUploadTask'

import {UploadAPIClient} from '../http/UploadAPIClient'

import {PDSUserApiClient} from './api_user'

export interface IUploadOptions extends IUpConfig {
  onReady?: (task: UploadTask) => void
  onProgress?: (state: UploadState, progress: number) => void
  onStateChange?: (cp: IUpCheckpoint, state: UploadState, error?: PDSError) => void
  onPartComplete?: (cp: IUpCheckpoint, part: IUpPartInfo) => void
}

export type UploadTask = StandardSerialUploadTask | StandardParallelUploadTask

export class PDSUploadAPIClient extends PDSUserApiClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  /**
   * 上传文件便捷方法。
        await 会等待上传完成。
        state 为 stopped, cancelled 和 error 时，会 throw PDSError。
   * @param file {IFile|string} 要上传的文件。浏览器：HTML File 对象。node.js: 本地文件路径，或者本地文件信息。
   * @param upload_to 
   * @param upload_options 
   * @param request_config 
   * @returns
   */
  uploadFile(
    file: string | IFile,
    upload_to: IUpCheckpoint,
    upload_options: IUploadOptions = {},
    request_config?: IPDSRequestConfig,
  ): Promise<IUpCheckpoint> {
    let {
      onReady = (): void => {},
      onProgress = (): void => {},
      onStateChange = (): void => {},
      onPartComplete = (): void => {},

      ...configs
    } = upload_options

    upload_to.file = this.contextExt.parseUploadIFile(file)

    return new Promise<IUpCheckpoint>((resolve, reject) => {
      var task = this.createUploadTask(
        {
          // file: _file,
          path_type: this.path_type,

          parent_file_id: 'root',

          ...upload_to,
        },
        {
          ...configs,
        },
        request_config,
      )
      task.on('statechange', (cp: IUpCheckpoint, state: UploadState, error?: PDSError) => {
        onStateChange(cp, state, error)
        if (cp.state == 'error') {
          reject(new PDSError(error || 'unknown'))
        } else if (cp.state == 'stopped') {
          reject(new PDSError('stopped', 'stopped'))
        } else if (cp.state == 'cancelled') {
          reject(new PDSError('cancelled', 'cancelled'))
        } else if (cp.state == 'success' || cp.state == 'rapid_success') {
          resolve(cp)
        }
      })
      task.on('progress', (state: UploadState, progress: number) => {
        onProgress(state, progress)
      })
      task.on('partialcomplete', (cp: IUpCheckpoint, part: IDownPartInfo) => {
        onPartComplete(cp, part)
      })
      onReady(task)
      task.start()
    })
  }

  /**
   * 创建一个上传任务。 可以通过 on 方法监听 progress 和 state 变化。
   * @param checkpoint
   * @param configs
   * @param request_config
   * @returns
   */
  createUploadTask(
    checkpoint: IUpCheckpoint,
    configs: IUpConfig = {parallel_upload: false},
    request_config?: IPDSRequestConfig,
  ): UploadTask {
    let UploadTask = configs.parallel_upload ? StandardParallelUploadTask : StandardSerialUploadTask

    return new UploadTask(
      {
        path_type: this.path_type,
        parent_file_id: 'root',
        ...checkpoint,
      },
      {
        limit_part_num: 9000,
        max_chunk_size: 10 * 1024 * 1024, //每片10MB
        init_chunk_con: 5,
        chunk_con_auto: true,
        ignore_rapid: false, //忽略秒传，测试时使用。

        verbose: this.verbose, //显示详细日志

        ...configs,
      },
      new UploadAPIClient(this),
      this.contextExt,
      request_config,
    )
  }
}
