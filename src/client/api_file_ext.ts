/** @format */
import {IContext, IClientParams, AxiosRequestConfig} from '../Types'
import {PDSDriveAPIClient} from './api_drive'

// 增值服务: 需要开通才能调用
// todo: 需要支持 x-share-token
export class PDSFileExtAPIClient extends PDSDriveAPIClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  // 文档预览
  getOfficePreviewUrl(data: IOfficePreviewReq, options?: AxiosRequestConfig) {
    return this.postAPI<IOfficePreviewRes>('/file/get_office_preview_url', data, options)
  }
  // 文档编辑
  getOfficeEditUrl(data: IOfficeEditReq, options?: AxiosRequestConfig) {
    return this.postAPI<IOfficeEditRes>('/file/get_office_edit_url', data, options)
  }
  // 文档编辑刷新 入参和出参字段一致
  refreshOfficeEditToken(data: IOfficeRefreshReq, options?: AxiosRequestConfig) {
    return this.postAPI<IOfficeRefreshReq>('/file/refresh_office_edit_token', data, options)
  }

  // 视频转码
  // transcodeVideo(data: IFileKey, options?: AxiosRequestConfig) {
  //   return this.postAPI<any>('/file/video_transcode', data, options)
  // }

  // getVideoM3u8(data: IFileKey, options?: AxiosRequestConfig) {
  //   return this.postAPI<void>('/file/video_m3u8', data, options)
  // }

  // 离线视频转码
  protected getVideoPreviewUrl(data: IVideoPreviewUrlReq, options?: AxiosRequestConfig) {
    return this.postAPI<IVideoPreviewUrlRes>('/file/get_video_preview_url', data, options)
  }

  // 在线视频转码
  protected getVideoPreviewPlayInfo(data: IVideoPreviewPlayInfoReq, options?: AxiosRequestConfig) {
    return this.postAPI<IVideoPreviewPlayInfoRes>('/file/get_video_preview_play_info', data, options)
  }

  // 音频目前只支持离线转
  // 获取audio转码url，和视频的区别是，音频传入audio_template_id
  getAudioUrlFromDefinition(data: IVideoPreviewUrlReq, options?: AxiosRequestConfig) {
    const opt = {expire_sec: 3600, ...data}
    return this.getVideoPreviewUrl(opt, options)
  }
  // 根据清晰度获取url
  getVideoUrlFromDefinition(data: IVideoPreviewPlayInfoReq, options?: AxiosRequestConfig) {
    const opt = {
      category: 'live_transcoding',
      url_expire_sec: 3600,
      ...data,
    }
    return this.getVideoPreviewPlayInfo(opt, options)
  }

  // 服务端打包下载，返回 异步任务ID
  archiveFiles(data: IArchiveFileReq, options: AxiosRequestConfig = {}) {
    return this.postAPI<IArchiveFileRes>('/file/archive_files', data, options)
  }

  // 服务端打包下载, 轮询直到返回
  async pollingArchiveFiles(data: IArchiveFileReq, options: AxiosRequestConfig = {}) {
    const {async_task_id} = await this.archiveFiles(data, options)
    return await this.pollingAsyncTask(async_task_id, 5000, options)
  }
}
type TAsyncTaskStatus = 'finished' | 'running' | 'failed'

interface IFileKey {
  drive_id?: string
  share_id?: string
  file_path?: string
  file_id?: string

  // parent_file_id?: string
  // parent_file_path?: string
}

interface IOfficePreviewReq extends IFileKey {
  allow_copy: boolean
  referer?: string
}
interface IOfficeEditReq extends IFileKey {
  referer?: string
  option?: {
    readonly?: boolean
    copy?: boolean
  }
}
interface IOfficeRefreshReq {
  referer?: string
  // 文档刷新入参和出参共用
  office_access_token: string
  office_refresh_token: string
}
interface IOfficePreviewRes {
  access_token: string
  preview_url: string
}
interface IOfficeEditRes extends IOfficeRefreshReq {
  edit_url: string
}

interface IVideoPreviewUrlRes {
  preview_url: string
  [propName: string]: any
}
interface IVideoPreviewPlayInfoRes {
  domain_id: string
  drive_id: string
  file_id: string
  video_preview_play_info?: IVideoPreviewPlayInfo
  [propName: string]: any
}

interface IVideoPreviewPlayInfo {
  category: string
  meta?: IVideoPreviewMeta
  live_transcoding_subtitle_task_list?: LiveTranscodingSubtitleTask[]
  live_transcoding_task_list?: ILiveTranscodingTask[]
  [propName: string]: any
}
interface IVideoPreviewMeta {
  duration: number
  width: number
  height: number
}

interface ILiveTranscodingTask {
  template_id: string //模板id  LD
  template_name: string //模板文案id
  status: TAsyncTaskStatus
  url?: string //播放url status=finished时有效
  preview_url?: string //预览url  status=finished时有效
  [propName: string]: any
}
interface LiveTranscodingSubtitleTask {
  language: string
  status: TAsyncTaskStatus
  url?: string
  index?: number
  title?: string // 字幕语言自定义信息(当前不支持)
  [propName: string]: any
}

type TAudioTemplateId =
  | 'LQ' // 标准音质
  | 'HQ' // 高音质
interface IVideoPreviewUrlReq extends IFileKey {
  // audio 转码入参
  audio_template_id: TAudioTemplateId
  expire_sec?: number
  referer?: string
}
interface IVideoPreviewPlayInfoReq extends IFileKey {
  // video
  category?: string // live_transcoding
  template_id?: string
  get_without_url?: boolean
  get_preview_url?: boolean //是否获取preview_url  注: category=1有效
  url_expire_sec?: number
  referer?: string
  get_subtitle_info?: boolean
  subtitle_lang_list?: string[] //get_subtitle_info=true有效, chi: 中文  eng: 英文
}

interface IArchiveFileReq {
  files: {file_id: string}[]
  name: string
  drive_id: string
}
interface IArchiveFileRes {
  async_task_id: string
  state: TAsyncTaskStatus
  err_code?: number
  total_process?: number
  consumed_process?: number
  url?: string
  punished_file_count?: number
  [propName: string]: any
}

export {
  IFileKey,
  TAsyncTaskStatus,
  IOfficePreviewReq,
  IOfficeEditReq,
  IOfficeRefreshReq,
  IOfficePreviewRes,
  IOfficeEditRes,
  IVideoPreviewUrlRes,
  IVideoPreviewPlayInfoRes,
  IVideoPreviewUrlReq,
  IVideoPreviewPlayInfoReq,
  IArchiveFileReq,
  IArchiveFileRes,
}
