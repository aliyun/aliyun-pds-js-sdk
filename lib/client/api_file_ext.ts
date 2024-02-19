import {IContextExt, IClientParams, IPDSRequestConfig, IFileKey} from '../Types'
import {PDSDriveAPIClient} from './api_drive'

// 增值服务: 需要开通才能调用
// todo: 需要支持 x-share-token
export class PDSFileExtAPIClient extends PDSDriveAPIClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  // 文档预览
  getOfficePreviewUrl(data: IOfficePreviewReq, options?: IPDSRequestConfig) {
    return this.postAPI<IOfficePreviewRes>('/file/get_office_preview_url', data, options)
  }
  // 文档编辑
  getOfficeEditUrl(data: IOfficeEditReq, options?: IPDSRequestConfig) {
    return this.postAPI<IOfficeEditRes>('/file/get_office_edit_url', data, options)
  }
  // 文档编辑刷新 入参和出参字段一致
  refreshOfficeEditToken(data: IOfficeRefreshReq, options?: IPDSRequestConfig) {
    return this.postAPI<IOfficeRefreshReq>('/file/refresh_office_edit_token', data, options)
  }

  // 视频转码
  // transcodeVideo(data: IFileKey, options?: IPDSRequestConfig) {
  //   return this.postAPI<any>('/file/video_transcode', data, options)
  // }

  // getVideoM3u8(data: IFileKey, options?: IPDSRequestConfig) {
  //   return this.postAPI<void>('/file/video_m3u8', data, options)
  // }

  // 离线视频转码
  protected getVideoPreviewUrl(data: IVideoPreviewUrlReq, options?: IPDSRequestConfig) {
    return this.postAPI<IVideoPreviewUrlRes>('/file/get_video_preview_url', data, options)
  }

  /**
   * 根据清晰度获取音视频转码播放 url
   * @param data
   * @param options
   * @returns
   */
  getVideoPreviewPlayInfo(data: IVideoPreviewPlayInfoReq, options?: IPDSRequestConfig) {
    return this.postAPI<IVideoPreviewPlayInfoRes>('/file/get_video_preview_play_info', data, options)
  }
  /**
   * 获取转码后音视频支持的清晰度列表
   * 获取清晰度列表：可以替代 getVideoPreviewPlayInfo, {get_without_url:true}
   * @param data
   * @param options
   * @returns
   */
  getVideoPreviewPlayMeta(data: IGetVideoPreviewPlayMetaReq, options?: IPDSRequestConfig) {
    return this.postAPI<IGetVideoPreviewPlayMetaRes>('/file/get_video_preview_play_meta', data, options)
  }

  // 音频目前只支持离线转
  // 获取audio转码url，和视频的区别是，音频传入audio_template_id
  getAudioUrlFromDefinition(data: IVideoPreviewUrlReq, options?: IPDSRequestConfig) {
    const opt = {expire_sec: 3600, ...data}
    return this.getVideoPreviewUrl(opt, options)
  }
  // 根据清晰度获取url
  getVideoUrlFromDefinition(data: IVideoPreviewPlayInfoReq, options?: IPDSRequestConfig) {
    const opt = {
      category: 'live_transcoding',
      url_expire_sec: 3600,
      ...data,
    }
    return this.getVideoPreviewPlayInfo(opt, options)
  }

  /**
   * 服务端打包下载，返回 异步任务ID
   */
  archiveFiles(data: IArchiveFileReq, options: IPDSRequestConfig = {}) {
    return this.postAPI<IArchiveFileRes>('/file/archive_files', data, options)
  }

  /**
   * 服务端打包下载, 轮询直到返回
   */
  async pollingArchiveFiles(data: IArchiveFileReq, options: IPDSRequestConfig = {}) {
    const {async_task_id} = await this.archiveFiles(data, options)
    return await this.pollingAsyncTask(async_task_id, 5000, options)
  }
}
export type TAsyncTaskStatus = 'finished' | 'running' | 'failed' | string
export type TVideoPreviewCategory = 'live_transcoding' | 'quick_video' | 'offline_audio' | 'offline_video' | string

export interface IOfficePreviewReq extends IFileKey {
  allow_copy?: boolean
  referer?: string
  revision_id?: string
  option?: {
    copy?: boolean
    print?: boolean
  }
}
export interface IOfficeEditReq extends IFileKey {
  referer?: string
  option?: {
    readonly?: boolean
    copy?: boolean
    print?: boolean
  }
  revision_id?: string
}

export interface IGetVideoPreviewPlayMetaReq extends IFileKey {
  category?: TVideoPreviewCategory // live_transcoding(在线视频边转边播)
}

export interface IGetVideoPreviewPlayMetaRes extends IFileKey {
  domain_id: string
  video_preview_play_meta: IVideoPreviewPlayMeta
  [propName: string]: any
}

export interface IVideoPreviewPlayMeta {
  meta: IVideoPreviewMeta
  live_transcoding_task_list?: ILiveTranscodingTask[]
  category: TVideoPreviewCategory
}

export interface IOfficeRefreshReq {
  referer?: string
  // 文档刷新入参和出参共用
  office_access_token: string
  office_refresh_token: string
}
export interface IOfficePreviewRes {
  access_token: string
  preview_url: string
}
export interface IOfficeEditRes extends IOfficeRefreshReq {
  edit_url: string
}

export interface IVideoPreviewUrlRes {
  preview_url: string
  [propName: string]: any
}
export interface IVideoPreviewPlayInfoRes extends IFileKey {
  domain_id: string
  // drive_id: string
  // file_id: string
  video_preview_play_info?: IVideoPreviewPlayInfo
  code?: string
  message?: string
  [propName: string]: any
}

export interface IVideoPreviewPlayInfo extends IVideoPreviewPlayMeta {
  // category: TVideoPreviewCategory
  // meta?: IVideoPreviewMeta
  // live_transcoding_task_list?: ILiveTranscodingTask[]

  live_transcoding_subtitle_task_list?: LiveTranscodingSubtitleTask[]
  [propName: string]: any
}
export interface IVideoPreviewMeta {
  duration: number // 视频长度
  width: number
  height: number
}

export interface ILiveTranscodingTask {
  template_id: string //模板id  LD
  template_name: string //模板文案id
  status: TAsyncTaskStatus
  url?: string //播放url status=finished时有效
  preview_url?: string //预览url  status=finished时有效
  keep_original_resolution?: boolean
  [propName: string]: any
}
export interface LiveTranscodingSubtitleTask {
  language: string
  status: TAsyncTaskStatus
  url?: string
  index?: number
  title?: string // 字幕语言自定义信息(当前不支持)
  [propName: string]: any
}

export type TAudioTemplateId =
  | 'LQ' // 标准音质
  | 'HQ' // 高音质
  | string

export interface IVideoPreviewUrlReq extends IFileKey {
  // audio 转码入参
  audio_template_id: TAudioTemplateId
  expire_sec?: number
  referer?: string
  revision_id?: string
}

export interface IVideoPreviewPlayInfoReq extends IFileKey {
  // video
  category?: TVideoPreviewCategory // live_transcoding
  template_id?: string // 264_480p
  get_without_url?: boolean
  get_preview_url?: boolean //是否获取preview_url  注: category=1有效
  url_expire_sec?: number // url超时时间，单位：秒。 默认15分钟，最大4小时。
  referer?: string
  get_subtitle_info?: boolean
  subtitle_lang_list?: string[] //get_subtitle_info=true有效, chi: 中文  eng: 英文
  revision_id?: string
}

export interface IArchiveFileReq {
  files: {file_id: string}[]
  name: string
  drive_id?: string
  share_id?: string //分享ID
}
export interface IArchiveFileRes {
  async_task_id: string
  state: TAsyncTaskStatus
  err_code?: number
  total_process?: number
  consumed_process?: number
  url?: string
  punished_file_count?: number
  [propName: string]: any
}
