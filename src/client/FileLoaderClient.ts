/** @format */

// const PDSError = require('../utils/PDSError').PDSError

import {
  IContext,
  IClientParams,
  IFile,
  IUpPartInfo,
  IDownPartInfo,
  IUpConfig,
  IUpCheckpoint,
  IDownCheckpoint,
  IDownConfig,
  UploadState,
  DownloadState,
  AxiosRequestConfig,
} from '../Types'
import {PDSError} from '../utils/PDSError'
import {StandardParallelUploadTask} from '../tasks/StandardParallelUploadTask.js'
import {StandardSerialUploadTask} from '../tasks/StandardSerialUploadTask'
import {HostingUploadTask} from '../tasks/HostingUploadTask.js'
import {UploadHttpClient} from '../http/UploadHttpClient'
import {DownloadTask} from '../tasks/DownloadTask.js'
import {DownloadHttpClient} from '../http/DownloadHttpClient'
import {PDSUserApiClient} from './api_user'

interface IUploadOptions extends IUpConfig {
  onReady?: (task: UploadTask) => void
  onProgress?: (state: UploadState, progress: number) => void
  onStateChange?: (cp: IUpCheckpoint, state: UploadState, error?: PDSError) => void
  onPartComplete?: (cp: IUpCheckpoint, part: IUpPartInfo) => void
}

interface IDownloadOptions extends IDownConfig {
  onReady?: (task: DownloadTask) => void
  onProgress?: (state: DownloadState, progress: number) => void
  onStateChange?: (cp: IDownCheckpoint, state: DownloadState, error?: PDSError) => void
  onPartComplete?: (cp: IDownCheckpoint, part: IDownPartInfo) => void
}

type UploadTask = StandardSerialUploadTask | StandardParallelUploadTask | HostingUploadTask

class FileLoaderClient extends PDSUserApiClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  uploadFile(
    file: string | IFile,
    upload_to: IUpCheckpoint,
    upload_options: IUploadOptions = {},
    axios_options?: AxiosRequestConfig,
  ): Promise<IUpCheckpoint> {
    let {
      onReady = (): void => {},
      onProgress = (): void => {},
      onStateChange = (): void => {},
      onPartComplete = (): void => {},

      ...configs
    } = upload_options

    let _file: IFile
    if (typeof file == 'string') {
      // node 才支持

      if (this.context.isNode) {
        let {size} = this.context.fs.statSync(file)

        _file = {
          size,
          path: file,
          name: this.context.path.basename(file),
          type: '',
        }
      } else {
        throw new PDSError('Invalid file, it should be a HTML File Object', 'InvalidParameter')
      }
    } else {
      _file = file
    }

    return new Promise<IUpCheckpoint>((resolve, reject) => {
      var task = this.createUploadTask(
        {
          file: _file,
          path_type: this.path_type,

          parent_file_id: this.path_type == 'StandardMode' ? 'root' : undefined,
          parent_file_path: this.path_type == 'HostingMode' ? '/' : undefined,

          ...upload_to,
        },
        {
          ...configs,
        },
        axios_options,
      )
      task.on('statechange', (cp: IUpCheckpoint, state: UploadState, error?: PDSError) => {
        onStateChange(cp, state, error)
        if (cp.state == 'error') {
          reject(new PDSError(error))
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

  async downloadFile(
    pds_file: IDownCheckpoint,
    download_to: string,
    download_options: IDownloadOptions = {},
    axios_options?: AxiosRequestConfig,
  ): Promise<IDownCheckpoint> {
    let {
      onReady = (): void => {},
      onProgress = (): void => {},
      onStateChange = (): void => {},
      onPartComplete = (): void => {},
      ...configs
    } = download_options

    let file: IFile
    if (typeof download_to == 'string') {
      let {size} = pds_file
      file = {
        size,
        name: this.context.path.basename(download_to),
        path: this.context.path.resolve(download_to),
      }
    } else {
      throw new PDSError('Invalid download_to, it must be a string', 'InvalidParameter')
    }

    return await new Promise<IDownCheckpoint>((resolve, reject) => {
      var task = this.createDownloadTask(
        {
          //to
          file,
          //from
          path_type: this.path_type,

          ...pds_file,
        },
        {
          ...configs,
        },
        axios_options,
      )
      task.on('statechange', (cp: IDownCheckpoint, state: DownloadState, error?: PDSError) => {
        onStateChange(cp, state, error)
        if (cp.state == 'error') {
          reject(new PDSError(error))
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
  createUploadTask(
    checkpoint: IUpCheckpoint,
    configs: IUpConfig = {parallel_upload: false},
    axios_options?: AxiosRequestConfig,
  ): UploadTask {
    let UploadTask =
      this.path_type == 'StandardMode'
        ? configs.parallel_upload
          ? StandardParallelUploadTask
          : StandardSerialUploadTask
        : HostingUploadTask

    return new UploadTask(
      checkpoint,
      {
        limit_part_num: 9000,
        max_chunk_size: 10 * 1024 * 1024, //每片10MB
        init_chunk_con: 5,
        chunk_con_auto: true,
        ignore_rapid: false, //忽略秒传，测试时使用。

        verbose: true, //显示详细日志

        path_type: this.path_type,
        parent_file_id: this.path_type == 'StandardMode' ? 'root' : undefined,
        parent_file_path: this.path_type == 'HostingMode' ? '/' : undefined,

        ...configs,
      },
      new UploadHttpClient(this),
      this.context,
      axios_options,
    )
  }

  createDownloadTask(
    checkpoint: IDownCheckpoint,
    configs: IDownConfig,
    axios_options?: AxiosRequestConfig,
  ): DownloadTask {
    return new DownloadTask(
      checkpoint,
      {
        checking_crc: true,
        limit_part_num: 9000,
        max_chunk_size: 10 * 1024 * 1024, //每片10MB
        init_chunk_con: 5,
        chunk_con_auto: true,
        verbose: true, //显示详细日志

        path_type: this.path_type,

        ...configs,
      },
      new DownloadHttpClient(this),
      this.context,
      axios_options,
    )
  }
}

export {FileLoaderClient, IUploadOptions, IDownloadOptions, UploadTask}
