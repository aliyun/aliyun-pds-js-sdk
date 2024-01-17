// const PDSError = require('../utils/PDSError').PDSError

import {
  IContextExt,
  IClientParams,
  IFile,
  IDownPartInfo,
  IDownCheckpoint,
  IDownConfig,
  DownloadState,
  IPDSRequestConfig,
} from '../Types'
import {PDSError} from '../utils/PDSError'

import {NodeDownloadTask} from '../tasks/NodeDownloadTask'
import {WebDownloadTask} from '../tasks/WebDownloadTask'
import {DownloadAPIClient} from '../http/DownloadAPIClient'
import {PDSUploadAPIClient} from './api_x_upload'

export type DownloadTask = NodeDownloadTask | WebDownloadTask

export interface IDownloadOptions extends IDownConfig {
  onReady?: (task: DownloadTask) => void
  onProgress?: (state: DownloadState, progress: number) => void
  onStateChange?: (cp: IDownCheckpoint, state: DownloadState, error?: PDSError) => void
  onPartComplete?: (cp: IDownCheckpoint, part: IDownPartInfo) => void
}

export class PDSDownloadApiClient extends PDSUploadAPIClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  async downloadFile(
    pds_file: Partial<IDownCheckpoint>,
    download_to: string,
    download_options: IDownloadOptions = {},
    request_config?: IPDSRequestConfig,
  ): Promise<IDownCheckpoint> {
    let {
      onReady = (): void => {},
      onProgress = (): void => {},
      onStateChange = (): void => {},
      onPartComplete = (): void => {},
      ...configs
    } = download_options

    if (typeof download_to !== 'string')
      throw new PDSError('Invalid download_to, it must be a string', 'InvalidParameter')

    pds_file.file = this.contextExt.parseDownloadTo(download_to, pds_file)
    return await new Promise<IDownCheckpoint>((resolve, reject) => {
      var task = this.createDownloadTask(
        {
          //from
          path_type: this.path_type,
          ...pds_file,
        } as IDownCheckpoint,
        {
          ...configs,
        },
        request_config,
      )
      task.on('statechange', (cp: IDownCheckpoint, state: DownloadState, error?: PDSError) => {
        onStateChange(cp, state, error)
        if (cp.state == 'error') {
          reject(new PDSError(error || 'unknown'))
        } else if (cp.state == 'stopped') {
          reject(new PDSError('stopped', 'stopped'))
        } else if (cp.state == 'cancelled') {
          reject(new PDSError('cancelled', 'cancelled'))
        } else if (cp.state == 'success') {
          resolve(cp)
        }
      })
      task.on('progress', (state: DownloadState, progress: number) => {
        onProgress(state, progress)
      })
      task.on('partialcomplete', (cp: IDownCheckpoint, part: IDownPartInfo) => {
        onPartComplete(cp, part)
      })

      onReady(task)
      task.start()
    })
  }
  createDownloadTask(
    checkpoint: IDownCheckpoint,
    configs: IDownConfig,
    request_config?: IPDSRequestConfig,
  ): DownloadTask {
    if (typeof window == 'object') {
      // for web browser
      return new WebDownloadTask(
        {
          path_type: this.path_type,
          ...checkpoint,
        },
        {
          checking_crc: true,
          init_chunk_con: 1,
          chunk_con_auto: false,
          verbose: this.verbose, //显示详细日志

          ...configs,
        },
        new DownloadAPIClient(this),
        this.contextExt,
        request_config,
      )
    }

    // for desktop client
    return new NodeDownloadTask(
      {
        path_type: this.path_type,
        ...checkpoint,
      },
      {
        checking_crc: true,
        limit_part_num: 9000,
        max_chunk_size: 10 * 1024 * 1024, //每片10MB
        init_chunk_con: 5,
        chunk_con_auto: true,
        verbose: this.verbose, //显示详细日志

        ...configs,
      },
      new DownloadAPIClient(this),
      this.contextExt,
      request_config,
    )
  }
}
