import {
  IContextExt,
  IClientParams,
  IPDSRequestConfig,
  IListRes,
  IFileKey,
  TMethod,
  TCheckNameMode,
  TCheckNameModeExt,
  THashName,
} from '../Types'

import {PDSFileRevisionAPIClient} from './api_file_revision'
import {IBatchBaseReq, spArr} from './api_base'
import {PDSError} from '../utils/PDSError'
import {genID} from '../utils/IDUtil'
export class PDSFileAPIClient extends PDSFileRevisionAPIClient {
  /**
   * 缓存目录名称
   */
  folderIdMap: {[id: string]: IParentFolderNameId} = {}

  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  async updateFile(item: IUpdateFileReq, options?: IPDSRequestConfig): Promise<IFileItem> {
    const info = await this.postAPI<IFileItem>('/file/update', item, options)
    const t = [info]
    formatFileListInfo(t)
    return t[0]
  }

  async listFiles(data: IListFileReq, options?: IPDSRequestConfig): Promise<IListRes<IFileItem>> {
    if (data.url_expire_sec == null) {
      data.url_expire_sec = 2 * 3600
    }

    const result = await this.postAPI<IListRes<IFileItem>>('/file/list', data, options)
    result.items = result.items || []
    formatFileListInfo(result.items)
    return result
  }

  /**
   * 搜索文件，或者 搜索回收站
   */
  async searchFiles(
    data: ISearchFileReq,
    options?: IPDSRequestConfig,
    isRecycleBin = false,
  ): Promise<IListRes<IFileItem>> {
    if (data.url_expire_sec == null) {
      data.url_expire_sec = 2 * 3600
    }
    const url = isRecycleBin ? '/recyclebin/search_all' : '/file/search'
    const result = await this.postAPI<IListRes<IFileItem>>(url, data, options)
    result.items = result.items || []
    formatFileListInfo(result.items)
    return result
  }

  /**
   * 查询同步收藏
   */
  async listFilesByCustomIndexKey(data: ICustomIndexKeyReq, options?: IPDSRequestConfig): Promise<IListRes<IFileItem>> {
    const result = await this.postAPI<IListRes<IFileItem>>('/file/list_by_custom_index_key', data, options)
    result.items = result.items || []
    formatFileListInfo(result.items)
    return result
  }

  async listStarredFiles(data: IStarredFilesReq, options?: IPDSRequestConfig): Promise<IListRes<IFileItem>> {
    return await this.listFilesByCustomIndexKey({custom_index_key: 'starred_yes', ...data}, options)
  }
  async batchToggleFilesStar(fileItems: IFileItem[], starred?: boolean, options?: IPDSRequestConfig) {
    let changeArr: IFileItem[] = []
    const unStarredArr = fileItems.filter(n => !n.starred)
    const _starred = starred ?? unStarredArr.length > 0
    if (starred) {
      changeArr = unStarredArr
    } else {
      changeArr = fileItems
    }
    const t: IBatchBaseReq[] = []
    changeArr.forEach(fileInfo => {
      t.push({
        body: {
          drive_id: fileInfo.drive_id,
          share_id: fileInfo.share_id,
          starred: _starred,
          custom_index_key: _starred ? 'starred_yes' : '',
          file_id: fileInfo.file_id,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: fileInfo.file_id,
        method: 'POST',
        url: '/file/update',
      })
    })
    const {successItems: result, errorItems} = await this.batchApi({batchArr: t, num: 10}, options)

    return {type: starred ? 'star' : 'unStar', changeItems: result, successItems: result, errorItems}
  }

  async copyFiles(fileKeys: IFileItemKey[], config: ICopyFilesConfig, options?: IPDSRequestConfig) {
    const {
      to_parent_file_id,
      to_share_id = undefined,
      to_drive_id = undefined,
      new_name = undefined,
      onProgress = () => {},
      getStopFlag = () => false,
    } = config

    let c = 0
    const len = fileKeys.length
    const results: ICopyFileRes[] = []

    for (const fileItem of fileKeys) {
      if (getStopFlag()) break
      const res = await this.postAPI<ICopyFileRes>(
        '/file/copy',
        {
          drive_id: fileItem.drive_id || undefined,
          share_id: fileItem.share_id || undefined,
          file_id: fileItem.file_id,
          to_drive_id,
          to_share_id,
          to_parent_file_id,
          new_name: fileKeys.length == 1 ? new_name : undefined,
          auto_rename: true, // standardMode
        },
        options,
      )
      results.push(res)
      c++
      try {
        await onProgress(c, len)
      } catch (e) {
        console.error('onProgress error', e)
      }
    }

    return results
  }

  /**
   * 递归创建目录，返回最后一级目录的 folderId , 或者 folderPath
   * @param folderNames ['a','b','c']  需要创建的子目录， pid下/a/b/c/
   * @param parentInfo { parent_file_id, drive_id ,check_name_mode}
   * @param createFoldersConfig { create_folder_cache, onFolderRepeat, onFolderCreated }
   * @return c 对应的 folderId, 或者 folderPath
   */
  async createFolders(
    folderNames: string[],
    data: IParentFileKey,
    createFoldersConfig: ICreateFoldersConfig = {},
    options?: IPDSRequestConfig,
  ): Promise<string> {
    let {parent_file_id, drive_id, share_id} = data

    const {check_name_mode = 'refuse', create_folder_cache, onFolderRepeat, onFolderCreated} = createFoldersConfig
    let folderPathMap: {[key: string]: string} = create_folder_cache || {}

    const that = this

    let opt: ICreateFileReq = {
      drive_id,
      share_id,
      type: 'folder',
      check_name_mode,
      parent_file_id,
      name: '',
    }
    let _path
    for (const n of folderNames) {
      opt.name = n
      _path = await _createFolderAndCache(opt, options)
      opt.parent_file_id = _path
    }

    return _path

    async function _createFolderAndCache(opt: ICreateFileReq, options?: IPDSRequestConfig): Promise<string> {
      const key = `${opt.drive_id || opt.share_id}/${opt.parent_file_id}/${opt.name}`
      if (!folderPathMap[key]) {
        // cache
        folderPathMap[key] = await _createFolder(opt, options)
      }
      return folderPathMap[key]
    }

    async function _createFolder(opt: ICreateFileReq, options?: IPDSRequestConfig): Promise<string> {
      let mode = opt.check_name_mode || 'refuse'
      let isSkipMode = ['overwrite', 'skip'].includes(mode)
      try {
        // console.log('[createFolder]',opt)

        if (!opt.check_name_mode || isSkipMode) opt.check_name_mode = 'refuse'

        // /file/create 支持 check_name_mode:
        // check_name_mode 设置为 refuse , 如果已经存在则返回 exist
        // check_name_mode 设置为 auto_rename , 使用随机后缀名，创建成功。
        // check_name_mode 设置为 ignore ，会创建同名文件（不推荐）

        const fileInfo = await that.postAPI('/file/create', opt, options)

        if (fileInfo.exist && opt.parent_file_id && !folderPathMap['yes']) {
          // 已经存在
          if (typeof onFolderRepeat === 'function') {
            const b = await onFolderRepeat(fileInfo)
            if (!b) {
              that.throwError(new PDSError('A folder with the same name already exists', 'AlreadyExists'))
            }
          }
          // 只问一次
          folderPathMap['yes'] = 'on'
        }

        // 通知刷新
        try {
          typeof onFolderCreated == 'function' ? onFolderCreated(fileInfo) : null
        } catch (e2) {
          console.error(e2)
        }

        return fileInfo.file_id
      } catch (e) {
        if (e.code === 'AlreadyExists' && isSkipMode) {
          console.log(`${opt.name} 发现同名文件夹（check_name_mode==${mode}, 忽略。`)
          throw e
        } else {
          throw e
        }
      }
    }
  }

  protected async getFolderFromCache(
    req: IGetFolderReq,
    options?: IPDSRequestConfig,
  ): Promise<IParentFolderNameId | null> {
    let {drive_id, share_id, file_id} = req

    if (this.folderIdMap[file_id]) {
      return this.folderIdMap[file_id]
    }

    let result: IParentFolderNameId
    try {
      result = await this.getFile(
        {
          drive_id,
          share_id,
          file_id,
        },
        options,
      )
    } catch (error) {
      if (404 === error.status) {
        return null
      } else if (403 === error.status) {
        return {
          is_forbidden: true,
          name: 'Forbidden',
          file_id,
          parent_file_id: file_id,
        }
      } else throw error
    }

    if (result.file_id) {
      this.folderIdMap[file_id] = {
        name: result.name,
        file_id: result.file_id,
        parent_file_id: result.parent_file_id,
      }
    }
    return this.folderIdMap[file_id]
  }

  /**
   * 获取多级面包屑目录信息
   * 从当前目录向上查找所有目录信息, 返回的数组不包含root目录。
   * 异常情况
   * 1. 遇到没有权限（403）的目录，将截止。返回的数组包含一个 is_forbidden==true 的目录信息。
   * 2. 其他异常 throw Error
   * @param drive_id 云盘ID
   * @param file_id 当前目录ID
   * @param end_parent_id 截止父目录ID， 默认 root
   * @returns 多级面包屑目录信息 [{file_id, name, is_forbidden?:true},...]
   */
  getBreadcrumbFolders(
    drive_id: string,
    file_id: string,
    end_parent_id: string = 'root',
  ): Promise<Omit<IParentFolderNameId, 'parent_file_id'>[]> {
    return this.getBreadcrumbFolderList({drive_id, file_id, end_parent_id})
  }
  async getBreadcrumbFolderList(
    req: IGetBreadcrumbReq,
    options?: IPDSRequestConfig,
  ): Promise<Omit<IParentFolderNameId, 'parent_file_id'>[]> {
    let {file_id, end_parent_id = 'root'} = req

    const t: Omit<IParentFolderNameId, 'parent_file_id'>[] = []
    do {
      if (file_id === end_parent_id) {
        break
      }
      req.file_id = file_id
      const result = await this.getFolderFromCache(req, options)

      if (!result) break // 404
      t.unshift({
        is_forbidden: result.is_forbidden,
        name: result.name,
        file_id: result.file_id,
      })
      if (result.is_forbidden) {
        break //403
      }
      file_id = result.parent_file_id || 'root'
    } while (!file_id || file_id != 'root')
    return t
  }

  /**
   * 标准模式专用
   * 根据路径获取文件或文件夹信息
   */
  getFileByPath(data: IGetFileByPathReq, options?: IPDSRequestConfig): Promise<IFileItem> {
    return this.postAPI<IFileItem>('/file/get_by_path', data, options)
  }

  async getFile(fileInfo: IGetFileReq, options?: IPDSRequestConfig): Promise<IFileItem> {
    const info = await this.postAPI<IFileItem>('/file/get', fileInfo, options)
    // fix: 标准模式 没有返回 share_id
    if (fileInfo.share_id && fileInfo.file_id && !info.share_id) {
      info.share_id = fileInfo.share_id
      delete fileInfo.drive_id
    }
    return info
  }

  async createFolder(data: ICreateFolderReq, options?: IPDSRequestConfig): Promise<ICreateFolderRes> {
    data.check_name_mode = data.check_name_mode || 'refuse'
    data.parent_file_id = data.parent_file_id || 'root'
    let info = await this.postAPI<ICreateFolderRes>('/file/create', {type: 'folder', ...data}, options)
    if (info.exist) {
      this.throwError(new PDSError('A folder with the same name already exists', 'AlreadyExists'))
    }
    return info
  }

  protected createFile(data: ICreateFileReq, options?: IPDSRequestConfig): Promise<ICreateFileRes> {
    return this.postAPI<ICreateFileRes>('/file/create', data, options)
  }

  async saveFileContent(
    fileInfo: ISaveFileContentReq | IFileItem,
    content = '',
    config: {check_name_mode?: TCheckNameMode; ignore_rapid?: boolean; hash_name?: THashName} = {},
    options?: IPDSRequestConfig,
  ) {
    let opt: ICreateFileReq = {
      drive_id: fileInfo.drive_id,
      share_id: fileInfo.share_id,
      file_id: fileInfo.file_id,

      check_name_mode: config.check_name_mode || 'refuse',
      name: fileInfo.name || '',
      type: 'file',
      size: this.contextExt.getByteLength(content),
      content_type: fileInfo.content_type || fileInfo.mime_type || '',
      parent_file_id: fileInfo.parent_file_id || 'root',
    }

    // 强制不秒传，测试用
    if (!config.ignore_rapid) {
      let hash_name = config.hash_name || 'sha1'

      const hash = await this.contextExt.calcHash(hash_name, content)

      Object.assign(opt, {
        content_hash_name: hash_name,
        content_hash: hash,
      })
    }
    const info = await this.createFile(opt, options)

    if (info.exist) {
      this.throwError(new PDSError('A file with the same name already exists', 'AlreadyExists'))
    }

    // 秒传成功
    if (info.rapid_upload) {
      return info
    }

    let partInfo = info.part_info_list?.[0]
    if (!partInfo) {
      this.throwError(new PDSError('Invalid part_info_list', 'Invalid'))
    }

    const result = await this.send(
      'PUT',
      partInfo.upload_url,
      content,
      {
        // data: content,
        headers: {
          'content-type': partInfo['content_type'] || '',
        },
      },
      1,
    )

    return await this.postAPI(
      '/file/complete',
      {
        drive_id: fileInfo.drive_id,
        share_id: fileInfo.share_id,
        file_id: info.file_id,
        upload_id: info.upload_id,
        part_info_list: [
          {
            part_number: 1,
            etag: result.headers.etag,
          },
        ],
      },
      options,
    )
  }

  async getFileContent(fileInfo: IGetFileReq, options: IPDSRequestConfig = {}) {
    const {responseType = 'arraybuffer', ...opt} = options
    const info = await this.getFile(fileInfo, opt)
    let req_opt: IPDSRequestConfig = {
      headers: {'content-type': ''},
      maxContentLength: Infinity,
      responseType,
    }

    let _url = info.url
    if (!_url) {
      let {drive_id, share_id, file_id, name: file_name} = info

      let {url} = await this.getFileDownloadUrl({
        drive_id,
        share_id,
        file_id,
        file_name,
        expire_sec: fileInfo.url_expire_sec || 300,
      })
      _url = url
    }
    if (!_url) throw new PDSError('No permission to get url', 'NoPermission')

    const result = await this.send('GET', _url, {}, req_opt, 1)

    return {
      headers: result.headers || {},
      content: result.data || '', // 浏览器中：arraybuffer2text()=> String.fromCharCode.apply(null, new Uint8Array(result.data))
      size: info.size || result.headers['content-length'],
      type: result.headers['content-type'],
      updated_at: result.headers['last-modified'],
      status: result.status,
    }
  }

  /**
   * 文件 rename 和播单 rename 共用此逻辑,播单 rename 弹窗不展示后缀
   */
  async renameFile(
    fileInfo: IFileKey | IFileItem,
    new_name: string,
    check_name_mode: TCheckNameMode = 'refuse',
    options?: IPDSRequestConfig,
  ): Promise<IFileItem> {
    let result

    result = await this.postAPI(
      '/file/update',
      {
        drive_id: fileInfo.drive_id,
        share_id: fileInfo.share_id,

        name: new_name,
        file_id: fileInfo.file_id,
        check_name_mode,
      },
      options,
    )

    return {...fileInfo, ...result}
  }

  /**
   * 移动文件或文件夹
   */
  async moveFiles(fileInfos: IFileItemKey[], config: ICopyFilesConfig, options?: IPDSRequestConfig) {
    const {
      to_parent_file_id,
      to_drive_id = undefined,
      new_name = undefined,
      onProgress = () => {},
      getStopFlag = () => false,
    } = config

    let c = 0
    const len = fileInfos.length
    if (len < 1) return []
    const results: ICopyFileRes[] = []
    const [f] = fileInfos
    // 如果是移动到当前文件夹，则不发请求
    if (to_drive_id === f.drive_id && to_parent_file_id === f.parent_file_id) {
      return []
    }

    for (const fileInfo of fileInfos) {
      if (getStopFlag()) break
      const res = await this.postAPI<ICopyFileRes>(
        '/file/move',
        {
          drive_id: fileInfo.drive_id,
          share_id: fileInfo.share_id,
          file_id: fileInfo.file_id,
          to_parent_file_id,
          to_drive_id,

          new_name: fileInfos.length == 1 ? new_name : undefined,
          // overwrite: true,
          auto_rename: true,
        },
        options,
      )
      results.push(res)
      c++
      try {
        await onProgress(c, len)
      } catch (e) {
        console.error('onProgress error', e)
      }
    }

    return results
  }
  /**
   * 批量移动文件或文件夹
   */
  async batchMoveFiles(fileInfos: IFileItemKey[], config: IBatchCopyFilesConfig, options?: IPDSRequestConfig) {
    const {to_parent_file_id, to_drive_id = undefined, new_name = undefined} = config

    const arr: IBatchBaseReq[] = []
    for (const fileInfo of fileInfos) {
      arr.push({
        body: {
          drive_id: fileInfo.drive_id,
          file_id: fileInfo.file_id,
          to_parent_file_id,
          to_drive_id,
          new_name: fileInfos.length == 1 ? new_name : undefined,
          auto_rename: true,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: genID(),
        method: 'POST',
        url: '/file/move',
      })
    }
    return await this.batchApi({batchArr: arr, num: 10}, options)
  }

  /**
   * 批量复制文件或文件夹
   */
  async batchCopyFiles(fileInfos: IFileItemKey[], config: IBatchCopyFilesConfig, options?: IPDSRequestConfig) {
    const {to_parent_file_id, to_drive_id = undefined, new_name = undefined} = config

    const arr: IBatchBaseReq[] = []
    for (const fileInfo of fileInfos) {
      arr.push({
        body: {
          drive_id: fileInfo.drive_id,
          file_id: fileInfo.file_id,
          to_parent_file_id,
          to_drive_id,
          new_name: fileInfos.length == 1 ? new_name : undefined,
          auto_rename: true,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: genID(),
        method: 'POST',
        url: '/file/copy',
      })
    }
    return await this.batchApi({batchArr: arr, num: 10}, options)
  }

  deleteFile(row: IFileKey, permanently: boolean = false, options?: IPDSRequestConfig) {
    let _permanently = permanently
    const pathname = _permanently ? '/file/delete' : '/recyclebin/trash'
    return this.postAPI(
      pathname,
      {
        drive_id: row.share_id ? undefined : row.drive_id,
        share_id: row.share_id,
        file_id: row.file_id,
        permanently: _permanently,
      },
      options,
    )
  }

  /**
   * 删除文件或文件夹
   */
  async batchDeleteFiles(rows: IFileKey[], permanently: boolean, options?: IPDSRequestConfig) {
    let _permanently = permanently

    const arr: IBatchBaseReq[] = []
    for (const n of rows) {
      arr.push({
        body: {
          drive_id: n.share_id ? undefined : n.drive_id,
          share_id: n.share_id,
          file_id: n.file_id,
          permanently: _permanently,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: genID(),
        method: 'POST',
        url: _permanently ? '/file/delete' : '/recyclebin/trash',
      })
    }
    return await this.batchApi({batchArr: arr, num: 10}, options)
  }

  /**
   * 清空回收站内容(包括个人空间和团队空间)
   */
  async clearRecycleBin(options?: IPDSRequestConfig) {
    return await this.postAPI('/recyclebin/clear_all', options)
  }

  /**
   * 从回收站中恢复文件。恢复时，若之前的父目录被删除，挂载到根目录，若之前的父目录在回收站，创建同名目录
   * @param {String} drive_id
   * @param {String} file_id
   */
  async batchRestoreFiles(rows: IFileKey[], options?: IPDSRequestConfig) {
    const arr: IBatchBaseReq[] = []
    for (const n of rows) {
      arr.push({
        body: {
          drive_id: n.drive_id,
          file_id: n.file_id,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: genID(),
        method: 'POST',
        url: '/recyclebin/restore',
      })
    }
    return await this.batchApi({batchArr: arr, num: 10}, options)
  }

  getFileDownloadUrl(data: IGetFileDownloadUrlReq, options?: IPDSRequestConfig) {
    return this.postAPI<IGetFileDownloadUrlRes>('/file/get_download_url', data, options)
  }
  // 标签
  putFileUserTags(data: IPutFileUserTagsReq, options?: IPDSRequestConfig) {
    return this.postAPI<{file_id: string}>('/file/put_usertags', data, options)
  }
  deleteFileUserTags(data: IDeleteFileUserTagsReq, options?: IPDSRequestConfig) {
    return this.postAPI<null>('/file/delete_usertags', data, options)
  }
  /**
   * 是否有同名文件,文件夹
   */
  preCreateCheck(data: IPreCreateCheckReq, options?: IPDSRequestConfig): Promise<IPreCreateCheckRes> {
    return this.postAPI<IPreCreateCheckRes>('/file/pre_create_check', data, options)
  }

  /**
   *  上传前，可以调用此方法判断 第一级 是否有重名的文件夹或文件
   */
  async batchCheckFilesExist(
    data: IPreCreateCheckReq[],
    options?: IPDSRequestConfig,
  ): Promise<IBatchCheckFilesExistRes> {
    const t: IBatchBaseReq[] = []
    data.forEach(n => {
      t.push({
        body: {
          drive_id: n.drive_id,
          share_id: n.share_id,
          parent_file_id: n.parent_file_id,
          name: n.name,
          type: n.type,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: genID(),
        method: 'POST',
        url: '/file/pre_create_check',
      })
    })
    const newBatchArr = spArr(t, 10)

    let exist_files: (IPreCreateCheckReq & {file_id: string; type: TFileType})[] = []

    let not_exist_files: IPreCreateCheckReq[] = []
    for (let i = 0, len = newBatchArr.length; i < len; i++) {
      const {responses: resArr} = await this.batch({requests: newBatchArr[i], resource: 'file'}, options)

      for (let j = 0, len = resArr.length; j < len; j++) {
        let is_exists = resArr[j].body.result_code == 'NameCheckFailed.ExistSameNameFile'
        if (is_exists) {
          exist_files.push({
            ...newBatchArr[i][j].body,
            file_id: resArr[j].body.name_check_result.exist_file_id,
            type: resArr[j].body.name_check_result.exist_file_type,
          })
        } else {
          not_exist_files.push({
            ...newBatchArr[i][j].body,
          })
        }
      }
    }
    return {exist_files, not_exist_files}
  }
}

function formatFileListInfo(items: any[]) {
  items.forEach((n: any) => {
    if (n.action_list && !n.action_list.includes('FILE.PREVIEW')) {
      n.thumbnail = null
    } else if (n.video_preview_metadata && n.video_preview_metadata.thumbnail) {
      n.thumbnail = n.thumbnail || n.video_preview_metadata.thumbnail
    }
  })
}

export type TFileType = 'file' | 'folder'
export type TFileStatus = 'available' | 'uploading'
export type TFileCategory = 'app' | 'zip' | 'image' | 'doc' | 'video' | 'audio' | 'others' | string

// type TActionType = 'move' | 'copy'

export interface IPreCreateCheckReq extends IParentFileKey {
  name: string
  type: TFileType
}

export interface IPreCreateCheckRes {
  name_check_result: {exist_file_id: string; exist_file_type: 'file' | 'folder'}
  result_code: string
}

export interface IBatchCheckFilesExistRes {
  exist_files: (IPreCreateCheckReq & {file_id: string; type: string})[]
  not_exist_files: IPreCreateCheckReq[]
}

export interface IFileItemKey {
  drive_id?: string
  share_id?: string
  file_id?: string
  parent_file_id?: string
}
export interface ISaveFileContentReq extends IFileItemKey {
  name?: string
  content_type?: string
  mime_type?: string
}
export interface IParentFolderNameId {
  name?: string
  file_id?: string
  parent_file_id?: string
  is_forbidden?: boolean
}

export interface IParentFileKey {
  drive_id?: string
  share_id?: string
  parent_file_id: string
}
export interface IFileItem {
  action_list?: string[]
  category?: string
  content_hash?: string
  content_hash_name?: string
  content_type?: string
  crc64_hash?: string
  created_at?: string
  creator_id?: string
  creator_type?: string
  description?: string

  domain_id?: string
  download_url?: string

  drive_id?: string
  share_id?: string
  encrypt_mode?: string

  file_extension?: string
  file_id: string

  hidden?: boolean

  labels?: string
  meta?: string
  user_meta?: string

  last_modifier_id?: string
  last_modifier_type?: string // User Group

  mime_extension?: string
  mime_type?: string
  name: string
  size: number
  starred?: boolean

  status: TFileStatus
  type: TFileType

  revision_id?: string
  revision_version?: number

  location?: string

  parent_file_id?: string
  // part_info_list?: any[]
  rapid_upload?: boolean
  streams_upload_info?: any

  thumbnail?: string
  trashed?: boolean
  upload_id?: string
  updated_at?: string
  url?: string

  user_tags?: {[key: string]: string}

  thumbnail_urls?: {[key: string]: string}

  [propName: string]: any
}

export interface IThumbnailProcessItem {
  /**  图片类型文件的缩略图规则，参考OSS的图片处理规则。默认为：image/resize,m_fill,h_128,w_128,limit_0 */
  image_thumbnail_process?: string
  /** 视频类型文件的缩略图规则，参考OSS的视频截帧处理规则。默认为：video/snapshot,t_1000,f_jpg,w_0,h_0,m_fast,ar_auto */
  video_thumbnail_process?: string
  /** 文档类型文件的缩略图规则，文档类型的文件会选择文档中一页的截图作为原图，此参数是基于该截图来做处理。默认为：image/resize,m_fill,h_128,w_128,limit_0  */
  office_thumbnail_process?: string
}
/** 按分辨率缩略图配置 */
export interface IThumbnailProcessItemMap {
  // definition 可以为自定义string， 如 '480X480': {...}
  [definition: string]: IThumbnailProcessItem
}
/** 列举文件或文件夹 */
export interface IListFileReq {
  all?: boolean
  drive_id?: string
  share_id?: string

  fields?: string // *

  image_thumbnail_process?: string
  image_url_process?: string
  url_expire_sec?: number // 900
  video_thumbnail_process?: string

  thumbnail_processes?: IThumbnailProcessItemMap

  limit?: number
  marker?: string

  order_by?: 'updated_at' | 'size' | 'name' | 'created_at' | string
  order_direction?: 'DESC' | 'ASC'
  parent_file_id: string

  // all?: boolean
  starred?: boolean
  category?: TFileCategory
  status?: TFileStatus
  type?: TFileType

  // [propName: string]: any
}

export interface IUpdateFileReq extends IFileKey {
  custom_index_key?: string
  description?: string // 文件描述信息，最长 1024 字符

  encrypt_mode?: string
  hidden?: boolean // 隐藏
  labels?: string[] // 标签列表，最多 100 个标签， 每个标签，最长 128 字符
  meta?: string
  name?: string // 文件名称，按照 utf8 编码规则最长 1024 字节
  starred?: boolean // 收藏
  user_meta?: string

  check_name_mode?: TCheckNameMode

  // local_modified_at?: string // 文件本地修改时间，格式为：yyyy-MM-ddTHH:mm:ssZ，采用 UTC +0 时区: 2019-08-20T06:51:27.292Z
}

export interface ICreateFolderReq extends IParentFileKey {
  name: string
  check_name_mode?: TCheckNameMode
  // key: 不能为空，不能包含 #。单个元素中的 key 和 value 总长度不能超过 2000 字节
  // value，不能包含 #。单个元素中的 key 和 value 总长度不能超过 2000 字节
  user_tags?: {key: string; value: string}[]
  hidden?: boolean
  description?: string
}
export interface ICreateFileReq {
  auto_rename?: boolean
  check_name_mode?: TCheckNameMode
  content_md5?: string
  content_hash?: string
  content_hash_name?: string
  content_type?: string
  description?: string
  drive_id?: string
  share_id?: string
  encrypt_mode?: string
  file_id?: string
  hidden?: boolean
  labels?: string[]
  last_updated_at?: string
  meta?: string
  name: string
  part_info_list?: any[]
  parent_file_id: string | 'root'
  pre_hash?: string
  size?: number
  type: TFileType
  user_meta?: string
  user_tags?: {key: string; value: string}[]
  [propName: string]: any
}

export interface ICreateFolderRes extends IFileKey {
  domain_id: string

  encrypt_mode?: string

  file_name?: string

  parent_file_id?: string

  type: TFileType
  [propName: string]: any
}

export interface ICreateFileRes extends ICreateFolderRes {
  domain_id: string

  encrypt_mode?: string

  file_name?: string
  location?: string
  parent_file_id?: string
  part_info_list?: any[]
  rapid_upload?: boolean
  streams_upload_info?: any
  type: TFileType
  upload_id?: string
  status?: string
  exist?: boolean
}

export interface ISearchFileReq {
  limit?: number
  marker?: string

  drive_id: string

  fields?: string // '*'

  query?: string // 搜索条件，可以根据文件名或目录名模糊查询，最长 4096 字符
  order_by?: string

  referer?: string
  url_expire_sec?: number

  // 这三个值是固定格式
  image_thumbnail_process?: string // image/resize,w_160/format,jpeg
  image_url_process?: string
  video_thumbnail_process?: string

  thumbnail_processes?: IThumbnailProcessItemMap

  // sign_token?: string
  return_total_count?: boolean //是否返回查询总数   默认值：false
}

export interface IGetFileByPathReq extends IGetFileItemOption {
  drive_id: string
  fields?: string // *
  // file_id: string
  file_path: string //   /a/b/c
  // file_path_in_array?: string[] // ['a','b','c']
}
export interface IGetFileItemOption {
  url_expire_sec?: number
  image_thumbnail_process?: string
  image_url_process?: string
  video_thumbnail_process?: string
}

export interface ICustomIndexKeyReq {
  drive_id: string
  image_thumbnail_process?: string
  image_url_process?: string
  video_thumbnail_process?: string
  custom_index_key: string
  fields?: string
  limit?: number
  marker?: string
  referer?: string
  order_direction?: 'DESC' | 'ASC'
}
export interface IStarredFilesReq {
  drive_id: string
  image_thumbnail_process?: string
  image_url_process?: string
  video_thumbnail_process?: string
  // custom_index_key: string
  fields?: string
  limit?: number
  marker?: string
  referer?: string
  order_direction?: 'DESC' | 'ASC'
}

export interface IToParentFileKey {
  to_drive_id?: string
  to_share_id?: string

  to_parent_file_id?: string
}
export interface ICopyFilesConfig extends IToParentFileKey {
  new_name?: string // 一个文件的时候有效
  onProgress?: (count: number, total: number) => void
  getStopFlag?: () => boolean
}
export interface IBatchCopyFilesConfig {
  to_drive_id?: string
  to_parent_file_id?: string
  new_name?: string // 一个文件的时候有效
}
export interface ICopyFileRes extends IFileKey {
  async_task_id?: string // 文件夹才有
  domain_id?: string
}

export interface IGetFileReq extends IFileKey {
  fields?: string
  url_expire_sec?: number // 默认 900， 10-14400
  video_thumbnail_process?: string
  image_thumbnail_process?: string
  image_url_process?: string

  thumbnail_processes?: IThumbnailProcessItemMap
  // 不throw
  donot_emit_notfound?: boolean
}

export interface ICreateFoldersConfig {
  check_name_mode?: TCheckNameModeExt
  // 用来缓存的方法
  create_folder_cache?: {[key: string]: string}
  // 发现同名目录已经存在，会回调这个方法。
  onFolderRepeat?: (folderInfo: IFileItem) => boolean // return  true, 继续执行，false throw new PDSError
  onFolderCreated?: (folderKey: ICreateFolderRes) => void
}

export interface IGetFileDownloadUrlReq extends IFileKey {
  file_name?: string //长度 1-1024
  expire_sec?: number
  revision_id?: string //指定版本ID
}
export interface IGetFileDownloadUrlRes {
  expiration: string
  method: TMethod
  url: string

  // 以下可选
  size?: number
  streams_url?: Map<string, string>
  [key: string]: any
}

export interface IGetBreadcrumbReq extends IGetFolderReq {
  end_parent_id?: string
}
export interface IGetFolderReq {
  drive_id?: string
  share_id?: string
  file_id: string
}

export interface IPutFileUserTagsReq {
  drive_id: string
  file_id: string
  user_tags: {key: string; value: string}[]
}
export interface IDeleteFileUserTagsReq {
  drive_id: string
  file_id: string
  key_list: string[]
}
