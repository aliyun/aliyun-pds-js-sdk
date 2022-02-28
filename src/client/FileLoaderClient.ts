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

  uploadFile(file: string | IFile, uploadTo: IUpCheckpoint, options: IUploadOptions = {}): Promise<IUpCheckpoint> {
    let {
      onReady = (): void => {},
      onProgress = (): void => {},
      onStateChange = (): void => {},
      onPartComplete = (): void => {},

      ...configs
    } = options

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
        throw new PDSError('Invalid fromFile')
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

          ...uploadTo,
        },
        {
          ...configs,
        },
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
    pdsFile: IDownCheckpoint,
    downloadTo: string,
    options: IDownloadOptions = {},
  ): Promise<IDownCheckpoint> {
    let {
      onReady = (): void => {},
      onProgress = (): void => {},
      onStateChange = (): void => {},
      onPartComplete = (): void => {},
      ...configs
    } = options

    let file: IFile
    if (typeof downloadTo == 'string') {
      let {size} = pdsFile
      file = {
        size,
        name: this.context.path.basename(downloadTo),
        path: this.context.path.resolve(downloadTo),
      }
    } else {
      throw new PDSError('Invalid downloadTo', 'InvalidParameter')
    }

    return await new Promise<IDownCheckpoint>((resolve, reject) => {
      var task = this.createDownloadTask(
        {
          //to
          file,
          //from
          path_type: this.path_type,

          ...pdsFile,
        },
        {
          ...configs,
        },
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
  createUploadTask(checkpoint: IUpCheckpoint, configs: IUpConfig = {parallel_upload: false}): UploadTask {
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

        verbose: false, //显示详细日志

        path_type: this.path_type,
        parent_file_id: this.path_type == 'StandardMode' ? 'root' : undefined,
        parent_file_path: this.path_type == 'HostingMode' ? '/' : undefined,

        ...configs,
      },
      new UploadHttpClient(this),
      this.context,
    )
  }

  createDownloadTask(checkpoint: IDownCheckpoint, configs: IDownConfig): DownloadTask {
    return new DownloadTask(
      checkpoint,
      {
        checking_crc: true,
        limit_part_num: 9000,
        max_chunk_size: 10 * 1024 * 1024, //每片10MB
        init_chunk_con: 5,
        chunk_con_auto: true,
        verbose: false, //显示详细日志

        path_type: this.path_type,

        ...configs,
      },
      new DownloadHttpClient(this),
      this.context,
    )
  }
}

export {FileLoaderClient, IUploadOptions, IDownloadOptions, UploadTask}
