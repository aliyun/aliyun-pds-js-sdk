import {IContextExt, IClientParams, IFileKey, IPDSRequestConfig, IListRes, IListReq} from '../Types'

import {PDSFilePermissionAPIClient} from './api_file_permission'

export class PDSFileRevisionAPIClient extends PDSFilePermissionAPIClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  async deleteFileRevision(req: IFileRevisionKey, options?: IPDSRequestConfig) {
    return await this.postAPI('/file/revision/delete', req, options)
  }
  async updateFileRevision(req: IUpdateFileRevisionReq, options?: IPDSRequestConfig) {
    return await this.postAPI<IFileRevisionItem>('/file/revision/update', req, options)
  }
  async restoreFileRevision(req: IFileRevisionKey, options?: IPDSRequestConfig) {
    return await this.postAPI<IFileRevisionItem>('/file/revision/restore', req, options)
  }
  async listFileRevisions(req: IListFileReversionsReq, options?: IPDSRequestConfig) {
    return await this.postAPI<IListRes<IFileRevisionItem>>('/file/revision/list', req, options)
  }
  async getFileRevision(req: IFileRevisionKey, options?: IPDSRequestConfig) {
    return await this.postAPI<IFileRevisionItem>('/file/revision/get', req, options)
  }
}

export interface IListFileReversionsReq extends IFileKey, IListReq {
  fields?: string
}
export interface IFileRevisionKey extends IFileKey {
  revision_id: string
}
export interface IUpdateFileRevisionReq extends IFileRevisionKey {
  keep_forever?: boolean
  revision_description?: string
}

export interface IFileRevisionItem {
  domain_id: string
  drive_id: string
  file_id: string
  revision_id: string
  revision_name?: string
  revision_version?: number
  size?: number
  file_extension?: string
  created_at?: string
  updated_at?: string
  keep_forever?: boolean
  revision_description?: string
  is_latest_version?: boolean
  crc64_hash?: string
  content_hash?: string
  content_hash_name?: string
  thumbnail?: string
  url?: string
  download_url?: string
}
