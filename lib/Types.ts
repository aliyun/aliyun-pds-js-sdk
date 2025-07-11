import {AxiosRequestConfig, AxiosResponse} from 'axios'
import {PDSError} from './utils/PDSError'

interface IPDSRequestConfig extends AxiosRequestConfig {
  retryCount?: number
  [propName: string]: any
}
interface IPDSResponse extends AxiosResponse {
  [propName: string]: any
}

type TMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'

/** 标准模式 */
type PathType = 'StandardMode'

type THashName = 'sha1' | 'sha256'

type FileType =
  | 'file' // 文件
  | 'folder' // 文件夹(目录)

type LocType =
  | 'drive' // 云盘
  | 'share' // 共享

type UploadState =
  | 'waiting' // 排队中， 等待上传
  | 'start' // 开始
  | 'computing_hash' // 计算hash，预秒传，秒传
  | 'created' // 创建成功
  | 'running' // 上传中
  | 'stopped' // 暂停
  | 'complete' // 上传完成
  | 'checking' // 校验中, 检查 crc64 是否一致
  | 'success' // 上传成功
  | 'rapid_success' // 秒传成功
  | 'error' // 上传失败
  | 'cancelled' // 已取消

// DownloadState 没有 computing_hash & rapid_success
type DownloadState =
  | 'waiting' // 排队中， 等待下载
  | 'prepare' // 准备中
  | 'start' // 开始
  | 'created' // 创建成功
  | 'running' // 下载中
  | 'stopped' // 暂停
  | 'complete' // 下载完成
  | 'checking' // 校验中, 检查 crc64 是否一致
  | 'success' // 下载成功
  | 'error' // 下载失败
  | 'cancelled' // 已取消

type TCheckNameMode =
  | 'auto_rename' //auto_rename (自动换一个随机名称)
  | 'refuse' //refuse (不会创建，告诉你已经存在)
  | 'ignore' // ignore (会创建重名的)
  | string

type TCheckNameModeExt =
  | 'overwrite' //overwrite (直接覆盖，以后多版本有用)
  | 'auto_rename' //auto_rename (自动换一个随机名称)
  | 'refuse' //refuse (不会创建，告诉你已经存在)
  | 'ignore' // ignore (会创建重名的)
  | 'skip'
  | string

/** @deprecated Please use TCheckNameMode instead */
type CheckNameMode =
  | 'overwrite' //overwrite (直接覆盖，以后多版本有用)
  | 'auto_rename' //auto_rename (自动换一个随机名称)
  | 'refuse' //refuse (不会创建，告诉你已经存在)
  | 'ignore' // ignore (会创建重名的)

interface IContext {
  isNode: boolean
  Axios: any

  platform?: string
  fs?: any
  os?: any
  path?: any
  cp?: any
  crypto?: any
  https?: any
  http?: any

  AxiosNodeAdapter?: any
}

interface IFileKey {
  /** 分享id。 如果此视频通过分享访问，那么设置 shareId、不设置 driveId 且传递 shareToken，否则需要设置 drive_id */
  share_id?: string
  drive_id?: string
  file_id: string
  // [key:string]:any
}

interface IFile {
  path?: string
  name: string
  size: number
  /** content-type */
  type?: string
  slice?(start: number, end: number): any
  /** for download only */
  temp_path?: string
}

interface IUpPartInfo {
  part_number: number
  part_size: number

  loaded?: number

  from?: number
  to?: number
  etag?: string
  upload_url?: string
  content_type?: string
  running?: boolean
  done?: boolean

  /** 上传本片的开始时间 */
  start_time?: number
  /** 上传本片的结束时间 */
  end_time?: number
  /** 并发上传 片 context */
  parallel_sha1_ctx?: IShardContext
  parallel_sha256_ctx?: IShardContext
}
interface IPartMap<T> {
  [partNumber: number]: T
}

interface ICustomCrc64FunOpt {
  file: string | IFile // HTML File, IFile, 或者 file_path
  onProgress: (prog: number) => void
  getStopFlag: () => boolean

  //以下可选
  start?: number
  end?: number
  context?: IContext
}

interface ICustomHashFunOpt {
  hash_name?: THashName
  file: string | IFile // HTML File, IFile, 或者 file_path
  onProgress: (prog: number) => void
  getStopFlag: () => boolean

  //以下可选
  start?: number
  end?: number
  context?: IContext
}

interface ICustomPartsHashFunOpt {
  file: string | IFile // HTML File, IFile, 或者 file_path
  onProgress: (prog: number) => void
  getStopFlag: () => boolean
  part_info_list: IUpPartInfo[]
  //以下可选
  context?: IContext
}

interface IDownPartInfo {
  part_number: number
  part_size: number

  loaded?: number
  crc64?: string // 本地计算chunk 的 crc64,保存起来。

  from?: number
  to?: number

  running?: boolean
  done?: boolean

  // 上传本片的开始时间
  start_time?: number
  // 上传本片的结束时间
  end_time?: number
  crc64_st?: number
  crc64_et?: number
}

interface IShardContext {
  h: number[]
  length: number
}

interface IUpCheckpoint {
  // from: html5 file, or IFile Object
  file: IFile

  // to folder info
  new_name?: string
  path_type?: PathType
  loc_id?: string
  loc_type?: LocType
  parent_file_key?: string // pds file id or pds file path

  drive_id?: string
  share_id?: string
  parent_file_id?: string
  file_id?: string

  // 以下可选
  id?: string
  file_key?: string
  upload_id?: string
  rapid_upload?: boolean
  is_skip?: boolean

  part_info_list?: IUpPartInfo[]
  crc64_hash?: string // complete 后，服务端返回的

  // 进度和状态
  state?: UploadState
  message?: string
  size?: number
  progress?: number // 0-100
  loaded?: number // bytes
  chunk_size?: number // bytes

  // 时间
  start_time?: number // ms
  end_time?: number // ms
  // 计算的均速
  used_avg_speed?: number // n/s
  // 计算的时长
  used_time_len?: number // ms
}

interface IUpConfig {
  /**
   * - overwrite (直接覆盖，以后多版本有用)
   * - auto_rename (自动换一个随机名称)
   * - refuse (不会创建，告诉你已经存在), ignore (会创建重名的)
   */
  check_name_mode?: TCheckNameModeExt
  check_name_mode_refuse_ignore_error?: boolean

  // 上传秒传计算文件 hash 方法
  hash_name?: THashName

  // 标签
  user_tags?: {key: string; value: string}[]

  // 是否校验
  checking_crc?: boolean

  /**
   * @deprecated Please use min_size_for_pre_hash instead
   */
  min_size_for_pre_sha1?: number
  /**
   * @deprecated Please use min_size_for_hash instead
   */
  max_size_for_sha1?: number

  // 秒传相关
  min_size_for_pre_hash?: number
  min_size_for_hash?: number

  // 限制
  max_file_size_limit?: number // 文件大小限制
  file_ext_list_limit?: string[] // 允许上传的文件后缀

  // 调优
  max_chunk_size?: number // 分片大小
  init_chunk_con?: number // 自定义指定并发数， chunk_con_auto==false 时生效
  chunk_con_auto?: boolean // 自动调整并发数策略

  custom_crc64_fun?: (opt: ICustomCrc64FunOpt) => Promise<string> //自定义 计算crc64的方法

  /**
   * @deprecated Please use custom_parts_sha1_fun instead
   */
  custom_sha1_fun?: (opt: ICustomHashFunOpt) => Promise<string> //自定义 计算sha1的方法
  /**
   * @deprecated Please use custom_parts_hash_fun instead
   */
  custom_parts_sha1_fun?: (
    opt: ICustomPartsHashFunOpt,
  ) => Promise<{part_info_list: IUpPartInfo[]; content_hash: string}> //自定义计算 sha1 方法 (分part)

  custom_hash_fun?: (opt: ICustomHashFunOpt) => Promise<string> //自定义 计算 sha1/sha256 的方法
  custom_parts_hash_fun?: (
    opt: ICustomPartsHashFunOpt,
  ) => Promise<{part_info_list: IUpPartInfo[]; content_hash: string}> //自定义计算 sha1/sha256 方法 (分part)

  // 标准模式是否启用分片并发上传
  parallel_upload?: boolean

  /**
   * @deprecated no longer support process_calc_*
   */
  process_calc_crc64_size?: number // 文件大小超过多少，将启用子进程计算 crc64
  /**
   * @deprecated no longer support process_calc_*
   */
  process_calc_sha1_size?: number // 文件大小超过多少，将启用子进程计算 sha1

  // 最大分片数：10000片
  limit_part_num?: number

  verbose?: boolean
  ignore_rapid?: boolean

  // functions
  state_changed?: (cp: IUpCheckpoint, state: UploadState, error?: PDSError) => void
  progress_changed?: (state: UploadState, progress: number) => void
  part_completed?: (cp: IUpCheckpoint, part: IUpPartInfo) => void

  set_calc_max_con?: (speed: number, chunk_size: number, max_concurrency: number) => number

  // x-share-token
  share_token?: string
  refresh_share_token?: () => Promise<string>
}

interface IDownCheckpoint {
  // from
  path_type?: PathType
  loc_id?: string
  loc_type?: LocType
  file_key?: string

  drive_id?: string
  share_id?: string
  file_id?: string
  name?: string

  // for archive
  archive_file_ids?: string[]

  // to
  file: IFile

  // 进度 状态
  loaded?: number
  size?: number
  progress?: number //0-100
  state?: DownloadState
  message?: string

  // 可选
  id?: string
  download_id?: string
  download_url?: string
  content_md5?: string
  crc64ecma?: string
  part_info_list?: IDownPartInfo[]
  content_type?: string

  // 均速计算
  used_avg_speed?: number
  used_time_len?: number

  start_time?: number
  end_time?: number
}
interface IDownConfig {
  verbose?: boolean

  checking_crc?: boolean // 是否校验crc64，如果不校验，不能保证文件的正确性

  // 最大分片数：10000片
  limit_part_num?: number

  // 限制
  max_file_size_limit?: number // 文件大小限制
  file_ext_list_limit?: string[] // 允许下载的文件后缀

  process_calc_crc64_size?: number // 文件大小超过多少，将启用子进程计算 crc64

  // 调优
  max_chunk_size?: number
  init_chunk_con?: number
  chunk_con_auto?: boolean

  custom_crc64_fun?: (opt: ICustomCrc64FunOpt) => Promise<string> //自定义 计算crc64的方法

  progress_changed?: (state: DownloadState, progress: number) => void
  state_changed?: (cp: IDownCheckpoint, state: DownloadState, error?: PDSError) => void
  part_completed?: (cp: IDownCheckpoint, part: IDownPartInfo) => void
  set_calc_max_con?: (speed: number, chunk_size: number, last_concurrency: number) => number

  // x-share-token
  share_token?: string
  refresh_share_token?: () => Promise<string>
}

interface ITokenInfo {
  access_token: string
  refresh_token?: string
  expires_in?: number
  expire_time?: string //  "2021-08-12T05:04:28Z"
  token_type?: string

  avatar?: string
  is_first_login?: boolean
  default_drive_id?: string
  user_id?: string
  user_name?: string
  nick_name?: string
  role?: string
  status?: string
  state?: string
  domain_id?: string
  subdomain_id?: string
  device_id?: string
  device_name?: string
  // 可扩展
  [key: string]: any
}

interface IClientParams {
  token_info?: ITokenInfo
  share_token?: string
  api_endpoint?: string
  auth_endpoint?: string
  path_type?: PathType
  version?: string
  verbose?: boolean
  retryCount?: number
  refresh_token_fun?: () => Promise<ITokenInfo>
  refresh_share_token_fun?: () => Promise<string>
}

// 通用列表请求参数
interface IListReq {
  limit?: number
  marker?: string
  [propName: string]: any
}

// 通用列表返回数据
interface IListRes<T = any> {
  items: T[]
  next_marker?: string
  total_count?: number
  [propName: string]: any
}

interface IUploadAPIClient {
  createFile(data: any, opt: any): Promise<any>
  completeFile(data: any, opt: any): Promise<any>
  getFileUploadUrl(data: any, opt: any): Promise<any>
  listFileUploadedParts(data: any, opt: any): Promise<any>
  axiosUploadPart(opt: any): Promise<any>
}
interface IDownloadAPIClient {
  getFile(data: any, opt: any): Promise<any>
  getDownloadUrl(data: any, opt: any): Promise<any>
  axiosDownloadPart(opt: any): Promise<any>
}

interface IContextExt {
  context: IContext
  signJWT(params, privateKey: string, algorithm: string): string
  sendOSS(options?: IPDSRequestConfig): Promise<any>
  axiosSend(options?: IPDSRequestConfig): Promise<any>

  // for uploads
  parseUploadIFile(file: string | IFile): IFile
  parseDownloadTo(download_to: string, cp: Partial<IDownCheckpoint>): IFile
  sliceFile(file: IFile, start: number, end: number)
  getByteLength(str: string): number
  fileMustExists(file: IFile)

  textEncode(str: string | Uint8Array): Uint8Array

  calcHash(hash_name: THashName, str: string): Promise<string>
  calcFileHash(
    params: ICalcFileParams & {
      hash_name?: THashName
      pre_size?: number
      process_calc_hash_size?: number
    },
  )
  calcFilePartsHash(
    params: ICalcFileParams & {
      hash_name?: THashName
      part_info_list?: IUpPartInfo[]
      process_calc_hash_size?: number
    },
  )
  calcFileCrc64(params: ICalcFileParams & {process_calc_crc64_size?: number})

  // for downloads
  getFreeDiskSize(file_path: string): Promise<number>
  fixFileName4Windows(file_path: string): string

  createFile(file_path: string, content: string): Promise<void>
  createFileIfNotExists(file_path: string, content: string): Promise<void>
  renameFile(from_path: string, to_path: string): Promise<void>

  // 托管模式才需要
  // getOSSObjectCrc64(download_url: string): Promise<string>
}
interface ICalcFileParams {
  file?: IFile
  file_path?: string
  verbose?: boolean
  onProgress: (prog: number) => void
  getStopFlag: () => boolean
}

export type {
  THashName,
  ICustomHashFunOpt,
  ICustomPartsHashFunOpt,
  IPDSRequestConfig,
  IPDSResponse,
  TMethod,
  IPartMap,
  PathType,
  IContext,
  IContextExt,
  FileType,
  LocType,
  UploadState,
  DownloadState,
  CheckNameMode,
  TCheckNameMode,
  TCheckNameModeExt,
  IFileKey,
  IFile,
  IUpPartInfo,
  IDownPartInfo,
  IShardContext,
  IUpCheckpoint,
  IUpConfig,
  ITokenInfo,
  IClientParams,
  IDownCheckpoint,
  IDownConfig,
  IListReq,
  IListRes,
  IUploadAPIClient,
  IDownloadAPIClient,
  ICalcFileParams,
}
