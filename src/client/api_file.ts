/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes} from '../Types'
import {IFileKey} from './api_file_ext'
import {PDSFilePermissionClient} from './api_file_permission'
import {IBatchBaseReq} from './api_base'
import {dirname, basename} from '../utils/PathUtil'
import {PDSError} from '../utils/PDSError'
import {sha1 as sha1Fun} from '../utils/CalcUtil'
import {getByteLength} from '../utils/FileUtil'
import {TMethod} from '..'

export class PDSFileAPIClient extends PDSFilePermissionClient {
  // 缓存目录名称
  folderIdMap: {[id: string]: IParentFolderNameId} = {}

  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  async updateFile(item: IUpdateFileReq, options?: AxiosRequestConfig) {
    const info = await this.postAPI<IFileItemStandard>('/file/update', item, options)
    const t = [info]
    formatFileListInfo(t)
    return t[0]
  }

  async listFiles(data: IListFileReq, options?: AxiosRequestConfig) {
    if (data.url_expire_sec == null) {
      data.url_expire_sec = 2 * 3600
    }

    const result = await this.postAPI<IListRes<IFileItem>>('/file/list', data, options)
    result.items = result.items || []
    formatFileListInfo(result.items)
    return result
  }

  //（标准模式） 搜索文件，或者 搜索回收站
  async searchFiles(data: ISearchFileReq, options?: AxiosRequestConfig, isRecycleBin = false) {
    if (data.url_expire_sec == null) {
      data.url_expire_sec = 2 * 3600
    }
    const url = isRecycleBin ? '/recyclebin/search_all' : '/file/search'
    const result = await this.postAPI<IListRes<IFileItem>>(url, data, options)
    result.items = result.items || []
    formatFileListInfo(result.items)
    return result
  }

  // (标准模式) 查询同步收藏
  async listFilesByCustomIndexKey(data: ICustomIndexKeyReq, options?: AxiosRequestConfig) {
    const result = await this.postAPI<IListRes<IFileItem>>('/file/list_by_custom_index_key', data, options)
    result.items = result.items || []
    formatFileListInfo(result.items)
    return result
  }

  async listStarredFiles(data: IStarredFilesReq, options?: AxiosRequestConfig) {
    return await this.listFilesByCustomIndexKey({custom_index_key: 'starred_yes', ...data}, options)
  }
  async batchToggleFilesStar(fileItems: IFileItem[], starred?: boolean, options?: AxiosRequestConfig) {
    let changeArr = []
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
          file_path: fileInfo.file_id ? undefined : fileInfo.file_path,
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
    changeArr.forEach((fileInfo, index) => {
      fileInfo.starred = result[index].starred
    })

    return {type: starred ? 'star' : 'unStar', changeItems: changeArr, successItems: result, errorItems}
  }

  async copyFiles(fileKeys: IFileItemKey[], config: ICopyFilesConfig, options?: AxiosRequestConfig) {
    const {
      // to_parent_file_path,
      to_parent_file_id,
      to_share_id = undefined,
      to_drive_id = undefined,
      new_name = undefined,
      onProgress = () => {},
      getStopFlag = () => false,
    } = config

    let c = 0
    const len = fileKeys.length
    const results = []

    if (this.path_type === 'HostingMode') {
      return await this.batchOssPath('copy', fileKeys, config, options)
    }

    for (const fileItem of fileKeys) {
      if (getStopFlag()) break
      const res = await this.postAPI<ICopyFileRes>(
        '/file/copy',
        {
          drive_id: fileItem.drive_id || undefined,
          share_id: fileItem.share_id || undefined,
          file_id: fileItem.file_id,
          file_path: fileItem.file_id ? undefined : fileItem.file_path,
          to_drive_id,
          to_share_id, // v3 以后不支持 share
          // to_parent_file_path: to_parent_file_id ? undefined : to_parent_file_path,
          to_parent_file_id,
          new_name: fileKeys.length == 1 ? new_name : undefined,
          // overwrite: true,  // for hostingMode
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
   * @param parentInfo { parent_file_id, parent_file_path, drive_id, share_id ,check_name_mode}
   * @param createFoldersConfig { create_folder_cache, onFolderRepeat, onFolderCreated }
   * @return c 对应的 folderId, 或者 folderPath
   */
  async createFolders(
    folderNames: string[],
    data: IParentFileKey,
    createFoldersConfig: ICreateFoldersConfig = {},
    options?: AxiosRequestConfig,
  ) {
    let {parent_file_id, parent_file_path, drive_id, share_id} = data

    const {check_name_mode = 'refuse', create_folder_cache, onFolderRepeat, onFolderCreated} = createFoldersConfig
    let folderPathMap: {[key: string]: string} = create_folder_cache || {}

    const that = this

    async function _createFolderAndCache(opt: ICreateFileReq, options?: AxiosRequestConfig): Promise<string> {
      const key = `${opt.drive_id || opt.share_id}/${opt.parent_file_id || opt.parent_file_path}/${opt.name}`
      if (!folderPathMap[key]) {
        // cache
        folderPathMap[key] = await _createFolder(opt, 3, options)
      }
      return folderPathMap[key]
    }

    async function _createFolder(opt: ICreateFileReq, retry = 3, options?: AxiosRequestConfig): Promise<string> {
      try {
        // console.log('[createFolder]',opt)

        // StandardMode only
        if (opt.parent_file_id && !opt.check_name_mode) opt.check_name_mode = 'refuse'

        // HostingMode 每次都创建目录覆盖。
        // StandardMode 设置为 refuse, 如果已经存在则返回 exist
        const fileInfo = await that.postAPI('/file/create', opt, options)

        // StandardMode only
        if (fileInfo.exist && opt.parent_file_id && !folderPathMap['yes']) {
          // 已经存在
          if (typeof onFolderRepeat === 'function') {
            const b = await onFolderRepeat(fileInfo)
            if (!b) {
              retry = -1
              that.throwError(new PDSError('The folder with the same name already exists', 'AlreadyExists'))
            }
          }
          // 只问一次
          folderPathMap['yes'] = 'on'
        }

        // 通知刷新
        try {
          typeof onFolderCreated == 'function' ? onFolderCreated(fileInfo) : null
        } catch (e) {
          console.error(e)
        }

        return fileInfo.file_id || fileInfo.file_path
      } catch (e) {
        if (e.response && e.response.status == 409) {
          const msg = e.response.data.message
          return msg.match(/:([-\w]+$)/)[1]
        }
        // 目标云盘满，特殊处理
        const errCode = `code_${e.response?.data?.code?.replace(/\./g, '_')}`
        if (errCode === 'code_QuotaExhausted_Drive') {
          return 'code_QuotaExhausted_Drive'
        }
        if (retry > 0) {
          retry--
          return await _createFolder(opt, retry)
        } else {
          throw e
        }
      }
    }
    let opt: ICreateFileReq = {
      drive_id,
      share_id,
      type: 'folder',
      check_name_mode,
      parent_file_id,
      name: '',
      parent_file_path: parent_file_id ? undefined : parent_file_path,
    }
    let _path
    for (const n of folderNames) {
      opt.name = n
      _path = await _createFolderAndCache(opt, options)
      if (parent_file_id) opt.parent_file_id = _path
      else opt.parent_file_path = _path
    }

    return _path
  }

  protected async getFolderFromCache(req: IGetFolderReq, options?: AxiosRequestConfig): Promise<IParentFolderNameId> {
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
  getBreadcrumbFolders(drive_id: string, file_id: string, end_parent_id: string = 'root') {
    return this.getBreadcrumbFolderList({drive_id, file_id, end_parent_id})
  }
  async getBreadcrumbFolderList(req: IGetBreadcrumbReq, options?: AxiosRequestConfig) {
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
      file_id = result.parent_file_id
    } while (!file_id || file_id != 'root')
    return t
  }

  /**
   * 标准模式专用
   * 根据路径获取文件或文件夹信息
   */
  getFileByPath(data: IGetFileByPathReq, options?: AxiosRequestConfig) {
    return this.postAPI<IFileItem>('/file/get_by_path', data, options)
  }

  async getFile(fileInfo: IGetFileReq, options?: AxiosRequestConfig) {
    const info = await this.postAPI<IFileItem>('/file/get', fileInfo, options)
    // fix: 标准模式 没有返回 share_id
    if (fileInfo.share_id && fileInfo.file_id && !info.share_id) {
      info.share_id = fileInfo.share_id
      delete fileInfo.drive_id
    }
    return info
  }

  async createFolder(data: ICreateFolderReq, options?: AxiosRequestConfig) {
    data.check_name_mode = data.check_name_mode || 'refuse'
    let info = await this.postAPI<ICreateFolderRes>('/file/create', {type: 'folder', ...data}, options)
    if (info.exist) {
      this.throwError(new PDSError('The folder with the same name already exists', 'AlreadyExists'))
    }
    return info
  }

  protected createFile(data: ICreateFileReq, options?: AxiosRequestConfig) {
    return this.postAPI<ICreateFileRes>('/file/create', data, options)
  }

  async saveFileContent(
    fileInfo: IFileItem,
    content = '',
    config: {check_name_mode?: TCheckNameMode; ignore_rapid?: boolean} = {},
    options?: AxiosRequestConfig,
  ) {
    let opt = {
      drive_id: fileInfo.drive_id,
      share_id: fileInfo.share_id,
      file_id: fileInfo.file_id,

      check_name_mode: config.check_name_mode || 'refuse',
      name: fileInfo.name,
      type: 'file',
      size: getByteLength(content),
      content_type: fileInfo.content_type || fileInfo.mime_type || '',
      parent_file_id: fileInfo.parent_file_id || 'root',
      parent_file_path: fileInfo.parent_file_path || '/',
    }

    // 强制不秒传，测试用
    if (!config.ignore_rapid) {
      const sha1 = sha1Fun(content)

      Object.assign(opt, {
        content_hash_name: 'sha1',
        content_hash: sha1,
      })
    }
    const info = await this.createFile(opt, options)

    if (info.exist) {
      this.throwError(new PDSError('The file with the same name already exists', 'AlreadyExists'))
    }

    // 秒传成功
    if (info.rapid_upload) {
      return info
    }

    const result = await this.send(
      'PUT',
      info.part_info_list[0].upload_url,
      content,
      {
        // data: content,
        headers: {
          'content-type': '',
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
        file_path: info.file_id ? undefined : info.file_path,
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

  async getFileContent(fileInfo: IGetFileReq, options?: AxiosRequestConfig) {
    const info = await this.getFile(fileInfo, options)
    let req_opt: AxiosRequestConfig = {
      headers: {'content-type': ''},
      maxContentLength: Infinity,
      responseType: 'arraybuffer',
    }

    if (this.context.isNode) {
      req_opt.adapter = this.context.AxiosNodeAdapter
      req_opt.httpsAgent = new this.context.https.Agent({rejectUnauthorized: false})
    }
    const result = await this.send('GET', info.url, {}, req_opt, 1)

    return {
      headers: result.headers || {},
      content: result.data || '', // 浏览器中：arraybuffer2text()=> String.fromCharCode.apply(null, new Uint8Array(result.data))
      size: info.size || result.headers['content-length'],
      type: result.headers['content-type'],
      updated_at: result.headers['last-modified'],
      status: result.status,
    }
  }

  // 文件 rename 和播单 rename 共用此逻辑,播单 rename 弹窗不展示后缀
  // 遇到同名文件，默认会抛： AlreadyExist.File
  // 标准模式可以通过 check_name_mode 修改
  async renameFile(
    fileInfo: IFileItem,
    new_name: string,
    check_name_mode: TCheckNameMode = 'refuse',
    options?: AxiosRequestConfig,
  ): Promise<IFileItem> {
    let result
    if (this.path_type == 'StandardMode') {
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
    } else {
      // HostingMode
      let isFolder = fileInfo.type ? fileInfo.type == 'folder' : fileInfo.file_path.endsWith('/')
      let parent_file_path = fileInfo.parent_file_path || dirname(fileInfo.file_path) + '/'
      try {
        const info = await this.getFile(
          {
            file_path: parent_file_path + new_name + (isFolder ? '/' : ''),
            drive_id: fileInfo.drive_id,
            share_id: fileInfo.share_id,
            donot_emit_notfound: true,
          },
          options,
        )

        if (check_name_mode == 'refuse' && info?.name) {
          this.throwError(new PDSError('The file with the same name already exists', 'AlreadyExists'))
        } else {
          result = info
        }
      } catch (e) {
        // pass
        if (e.status != 404) throw e
      }

      result = await this.postAPI(
        '/file/move',
        {
          drive_id: fileInfo.drive_id,
          share_id: fileInfo.share_id,
          file_id: fileInfo.file_id,
          file_path: fileInfo.file_path,
          new_name,
          to_parent_file_path: parent_file_path,
        },
        options,
      )
      // 托管模式 rename 后 file_path 改变无法作为唯一标识
      result.beforeRenameFilePath = fileInfo.file_path
    }

    return {...fileInfo, ...result}
  }

  protected async batchOssPath(
    action: TActionType,
    fileInfos: IFileItemKey[],
    config: ICopyFilesConfig,
    options?: AxiosRequestConfig,
  ) {
    const {onProgress = () => {}, getStopFlag = () => false} = config
    let c = 0
    let len = fileInfos.length

    const moveOrCopy = (
      action: TActionType,
      fileInfo: IFileKey,
      opt: IToParentFileKey,
      options?: AxiosRequestConfig,
    ) => {
      return this.postAPI(
        `/file/${action}`,
        {
          drive_id: fileInfo.drive_id,
          share_id: fileInfo.share_id,
          file_path: fileInfo.file_path,
          // file_id: fileInfo.file_id,
          to_drive_id: opt.to_drive_id,
          to_share_id: opt.to_share_id,
          to_parent_file_path: opt.to_parent_file_path,
          // to_parent_file_id: opt.to_parent_file_id,
          overwrite: true,
          new_name: fileInfos.length == 1 ? config.new_name : undefined,
        },
        options,
      )
    }

    const _dig = async (arr: IFileItem[], opt: IToParentFileKey, options?: AxiosRequestConfig) => {
      const results = []
      for (const fileInfo of arr) {
        if (getStopFlag()) {
          return
        }

        let file_name = basename(fileInfo.file_path)

        // 1. 先复制目录里面的内容
        if (fileInfo.type == 'folder') {
          let marker = null
          do {
            if (getStopFlag()) {
              return
            }
            const listResult: IListRes<IFileItem> = await this.listFiles(
              {
                drive_id: fileInfo.drive_id || undefined,
                share_id: fileInfo.share_id || undefined,
                parent_file_path: fileInfo.file_path,

                all: true,
                marker,
                limit: 100,
              },
              options,
            )
            len += listResult.items.length

            await _dig(listResult.items, {
              ...opt,
              to_parent_file_path: `${opt.to_parent_file_path.replace(/(\/*$)/g, '')}/${file_name}/`,
            })
            marker = listResult.next_marker || null
          } while (marker)

          // 2.  复制 目录本身
          const res = await moveOrCopy(action, fileInfo, opt, options)
          results.push(res)
        } else {
          // 2. 复制文件
          const res = await moveOrCopy(action, fileInfo, opt, options)
          results.push(res)
        }
        c++
        try {
          await onProgress(c, len)
        } catch (e) {
          console.error('onProgress error', e)
        }
      }
      return results
    }
    return await _dig(fileInfos, config, options)
  }

  // 移动文件或文件夹
  async moveFiles(fileInfos: IFileItemKey[], config: ICopyFilesConfig, options?: AxiosRequestConfig) {
    const {
      to_parent_file_path,
      to_parent_file_id,
      to_drive_id = undefined,
      new_name = undefined,
      onProgress = () => {},
      getStopFlag = () => false,
    } = config

    let c = 0
    const len = fileInfos.length
    if (len < 1) return
    const results = []
    const [f] = fileInfos
    // 如果是移动到当前文件夹，则不发请求
    if (
      to_drive_id === f.drive_id &&
      (f.parent_file_id ? to_parent_file_id === f.parent_file_id : to_parent_file_path === f.parent_file_path)
    ) {
      return
    }

    if (this.path_type === 'HostingMode') {
      return await this.batchOssPath('move', fileInfos, config, options)
    }
    for (const fileInfo of fileInfos) {
      if (getStopFlag()) break
      const res = await this.postAPI<ICopyFileRes>(
        '/file/move',
        {
          drive_id: fileInfo.drive_id,
          share_id: fileInfo.share_id,
          file_id: fileInfo.file_id,
          file_path: fileInfo.file_id ? undefined : fileInfo.file_path,
          // to_parent_file_path: to_parent_file_id ? undefined : to_parent_file_path,
          to_parent_file_id,
          to_drive_id,
          // to_share_id,
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

  deleteFile(row: IFileKey, permanently: boolean = false, options?: AxiosRequestConfig) {
    // 托管模式下无回收站, 直接删除
    let _permanently = this.path_type === 'HostingMode' ? true : permanently
    const pathname = _permanently ? '/file/delete' : '/recyclebin/trash'
    return this.postAPI(
      pathname,
      {
        drive_id: row.share_id ? undefined : row.drive_id,
        share_id: row.share_id,
        file_id: row.file_id,
        file_path: row.file_path,
        permanently: _permanently,
      },
      options,
    )
  }

  // 删除文件或文件夹
  async batchDeleteFiles(rows: IFileKey[], permanently: boolean, options?: AxiosRequestConfig) {
    // 托管模式下无回收站, 直接删除
    let _permanently = this.path_type === 'HostingMode' ? true : permanently

    const arr: IBatchBaseReq[] = []
    for (const n of rows) {
      arr.push({
        body: {
          drive_id: n.share_id ? undefined : n.drive_id,
          share_id: n.share_id,
          file_id: n.file_id,
          file_path: n.file_path,
          permanently: _permanently,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        id: n.file_id,
        method: 'POST',
        url: _permanently ? '/file/delete' : '/recyclebin/trash',
      })
    }
    return await this.batchApi({batchArr: arr, num: 10}, options)
  }

  /**
   * @description 清空回收站内容(包括个人空间和团队空间)
   */
  async clearRecycleBin(options?: AxiosRequestConfig) {
    return await this.postAPI('/recyclebin/clear_all', options)
  }

  /**
   * @description 从回收站中恢复文件。恢复时，若之前的父目录被删除，挂载到根目录，若之前的父目录在回收站，创建同名目录
   * @param {String} drive_id
   * @param {String} file_id
   */
  async batchRestoreFiles(rows: IFileKey[], options?: AxiosRequestConfig) {
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
        id: n.file_id,
        method: 'POST',
        url: '/recyclebin/restore',
      })
    }
    return await this.batchApi({batchArr: arr, num: 10}, options)
  }

  getFileDownloadUrl(data: IGetFileDownloadUrlReq, options?: AxiosRequestConfig) {
    return this.postAPI<IGetFileDownloadUrlRes>('/file/get_download_url', data, options)
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

type TFileType = 'file' | 'folder'
type TFileStatus = 'available' | 'uploading'
type IFileItem = IFileItemHosting | IFileItemStandard
type TCheckNameMode = 'auto_rename' | 'refuse' | 'ignore'
type TActionType = 'move' | 'copy'

interface IFileItemKey {
  drive_id?: string
  share_id?: string
  file_id?: string
  file_path?: string
  parent_file_id?: string
  parent_file_path?: string
}

interface IParentFolderNameId {
  name?: string
  file_id?: string
  parent_file_id?: string
  is_forbidden?: boolean
}

interface IParentFileKey {
  drive_id?: string
  share_id?: string
  parent_file_id?: string
  parent_file_path?: string
}

interface IFileItemHosting {
  // folder & file
  content_type?: string
  domain_id?: string
  drive_id?: string
  share_id?: string

  file_extension?: string
  file_path?: string
  name?: string

  parent_file_path?: string
  status?: TFileStatus
  type?: TFileType

  // for file only
  size?: number
  download_url?: string
  thumbnail?: string
  updated_at?: string
  url?: string

  [propName: string]: any
}
interface IFileItemStandard {
  action_list?: string[]
  category?: string
  content_hash?: string
  content_hash_name?: string
  content_type?: string
  crc64_hash?: string
  created_at?: Date
  creator_id?: string
  creator_type?: string
  description?: string

  domain_id: string
  download_url: string

  drive_id?: string
  share_id?: string
  encrypt_mode?: string

  file_extension?: string
  file_id?: string
  // file_path?: string

  hidden?: boolean

  labels?: string
  meta?: string
  user_meta?: string

  last_modifier_id?: string
  last_modifier_type?: string // User Group

  mime_extension?: string
  mime_type?: string
  name: string
  size?: number
  starred?: boolean

  status?: TFileStatus
  type: TFileType

  revision_id?: string

  location?: string

  parent_file_id?: string
  // parent_file_path?: string
  // part_info_list?: any[]
  rapid_upload?: boolean
  streams_upload_info?: any

  thumbnail?: string
  trashed?: boolean
  upload_id?: string
  updated_at?: Date
  url?: string

  [propName: string]: any
}

// 列举文件或文件夹
interface IListFileReq {
  all?: boolean
  drive_id?: string
  share_id?: string

  fields?: string // *
  image_thumbnail_process?: string
  image_url_process?: string
  url_expire_sec?: number // 900
  video_thumbnail_process?: string

  limit?: number
  marker?: string

  order_by?: string // update_time, name
  order_direction?: 'DESC' | 'ASC'
  parent_file_id?: string
  parent_file_path?: string

  // all?: boolean
  starred?: boolean
  category?: string // image, video, music, doc, other
  status?: 'uploading' | 'available'
  type?: TFileType

  // [propName: string]: any
}

interface IUpdateFileReq {
  drive_id?: string
  share_id?: string
  file_id: string

  custom_index_key?: string
  description?: string

  encrypt_mode?: string
  hidden?: boolean
  labels?: string[]
  meta?: string
  name?: string
  starred?: boolean
  user_meta?: string

  check_name_mode?: TCheckNameMode
}

interface ICreateFolderReq extends IParentFileKey {
  name: string
  check_name_mode?: TCheckNameMode
}
interface ICreateFileReq {
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
  file_path?: string
  hidden?: boolean
  labels?: string[]
  last_updated_at?: Date
  meta?: string
  name?: string
  part_info_list?: any[]
  parent_file_id: string | 'root'
  parent_file_path?: string | '/'
  pre_hash?: string
  size?: number
  type?: string // 'file' | 'folder'
  user_meta?: string
  [propName: string]: any
}

interface ICreateFolderRes {
  domain_id: string
  drive_id?: string
  share_id?: string
  encrypt_mode?: string

  file_id?: string
  file_name?: string
  file_path?: string

  parent_file_id?: string

  type: TFileType
  [propName: string]: any
}

interface ICreateFileRes extends ICreateFolderRes {
  domain_id: string
  drive_id?: string
  share_id?: string
  encrypt_mode?: string
  file_id?: string
  file_name?: string
  file_path?: string
  location?: string
  parent_file_id?: string
  part_info_list?: any[]
  rapid_upload?: boolean
  streams_upload_info?: any
  type: TFileType
  upload_id?: string
}

interface ISearchFileReq {
  limit?: number
  marker?: string

  drive_id: string
  // share_id?: string
  fields?: string // '*'

  query?: string
  order_by?: string

  referer?: string
  url_expire_sec?: number

  // 这三个值是固定格式
  image_thumbnail_process?: string // image/resize,w_160/format,jpeg
  image_url_process?: string
  video_thumbnail_process?: string

  // sign_token?: string
  // return_total_count?: boolean //是否返回查询总数   默认值：false
}

interface IGetFileByPathReq extends IGetFileItemOption {
  drive_id: string
  fields?: string // *
  // file_id: string
  file_path: string //   /a/b/c
  // file_path_in_array?: string[] // ['a','b','c']
}
interface IGetFileItemOption {
  url_expire_sec?: number
  image_thumbnail_process?: string
  image_url_process?: string
  video_thumbnail_process?: string
}

interface ICustomIndexKeyReq {
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
interface IStarredFilesReq {
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

interface IToParentFileKey {
  to_drive_id?: string
  to_share_id?: string
  to_parent_file_path?: string
  to_parent_file_id?: string
}
interface ICopyFilesConfig extends IToParentFileKey {
  new_name?: string // 一个文件的时候有效
  onProgress?: (count: number, total: number) => void
  getStopFlag?: () => boolean
}
interface ICopyFileRes {
  async_task_id?: string // 文件夹才有
  domain_id?: string

  drive_id?: string
  share_id?: string

  file_id?: string
  file_path?: string
}

interface IGetFileReq {
  drive_id?: string
  share_id?: string
  file_id?: string
  file_path?: string

  fields?: any[]
  url_expire_sec?: number // 默认 900， 10-14400
  video_thumbnail_process?: string
  image_thumbnail_process?: string
  image_url_process?: string

  // 不throw
  donot_emit_notfound?: boolean
}

interface ICreateFoldersConfig {
  check_name_mode?: TCheckNameMode
  // 用来缓存的方法
  create_folder_cache?: {[key: string]: string}
  // 发现同名目录已经存在，会回调这个方法。
  onFolderRepeat?: (folderInfo: IFileItem) => boolean // return  true, 继续执行，false throw new PDSError
  onFolderCreated?: (folderKey: ICreateFolderRes) => void
}

interface IGetFileDownloadUrlReq {
  drive_id?: string
  share_id?: string
  file_id?: string
  file_path?: string
  file_name?: string //长度 1-1024
  expire_sec?: number
}
interface IGetFileDownloadUrlRes {
  expiration: Date
  method: TMethod
  url: string

  // 以下可选
  size?: number
  streams_url?: Map<string, string>
  [key: string]: any
}

interface IGetBreadcrumbReq extends IGetFolderReq {
  end_parent_id?: string
}
interface IGetFolderReq {
  drive_id?: string
  share_id?: string
  file_id: string
}

export {
  IFileItem,
  IFileItemStandard,
  IFileItemHosting,
  IListFileReq,
  ICreateFileReq,
  ICreateFileRes,
  ICopyFilesConfig,
  IParentFolderNameId,
  IBatchBaseReq,
  ISearchFileReq,
  ICustomIndexKeyReq,
  ICopyFileRes,
  IGetFileReq,
  IToParentFileKey,
  IGetBreadcrumbReq,
  IGetFolderReq,
}
