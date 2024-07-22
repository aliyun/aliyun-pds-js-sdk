
# Release Notes

## 1.2.0

* feat: 上传支持 sha256 计算hash方法。
* test: 测试 case 优化。
* refactor: token失效或者没有token的情况下，调接口应该emit error。
* refactor: importUser, generalSearchUsers,createDrive 3个接口新增一些可选参数。
* fix: 修复httpClient，以支持分享页面同时使用 x-share-token和access token的场景。
* refactor: 修复`uploadFile` 方法的参数: upload_to 由 `IUpCheckpoint` 改为 `Partial<IUpCheckpoint>`。
* refactor: PDSError 增加 requestConfig 字段。
* fix: 修复 HttpClient 的 isNetworkError 方法。
* fix: 修复 WebDownloader 下载文件名称不正确的bug。

## 1.1.0

* feat: web端支持服务端打包下载任务。
* fix: 修复 web 下载 crc64 校验逻辑。
* fix: 修复 js-sha1 和 wasm 在 node 环境执行 browser 代码。
* refactor: 兼容打包下载新版 async_task 格式
* fix: 修复 web 下载断网续传逻辑。
* feat: web下载提供直接使用浏览器下载的方法: downloadDirectlyUsingBrowser。
* refactor: http 请求增加429重试逻辑，max retry 默认5次。
* refactor: 去掉 debug 模块依赖。
* refactor: 构造函数增加 verbose 参数。

## 1.0.0

* 托管模式（HostingMode）下线，js-sdk响应去掉托管模式相关代码。
* 编译框架改造，使用 vite + typescript。
* 测试框架改造，全面使用 vitest。
* web 端和 node 端入口分开，通过不同的引入方式引入。
* 优化 PDSError，console.log(err)时默认会打印 status 和 reqId 等必要信息。
* 增加 WebDownloadTask 下载, 支持在浏览器展示下载列表和进度。
* 增加上传前 preCheck 重名方法：preCreateCheck 和 batchCheckFileExists。 check_name_mode 扩展支持: skip, overwrite。
* examples/vue 增加基本云盘 demo 功能演示，  examples/electron 增加基本桌面客户端功能演示。
* node.js 计算 sha1 和 crc64 去掉了child_process 模式。因为不推荐在render进程直接使用 node sdk，应该在main 或者main fork的子进程中使用。 web版不再使用 wasm 计算 sha1，直接用 js-sha1。
* 新增 groupMember 相关接口:  addGroupMember, ListGroupMembers, RemoveGroupMember。用来替换 membership 相关接口。
* createAccountLink 不再推荐使用， 推荐改用 linkAccount， 和API文档对齐。增加 unlinkAccount。
* 新增 role 相关接口: assignRole, cancelAssignRole, listAssignments。
* 修改 getJwtToken 接口，iat和exp 签名时间扩展为当前时间的前后5分钟。
* 暴露 getVideoPreviewPlayInfo 和 getVideoPreviewPlayMeta 原始接口。
* 增加 restoreFileRevision 接口。

## 0.2.11

- fix: 修复上传 check_name_mode 为 refuse 遇到同名文件应该报错。增加个字段 check_name_mode_refuse_ignore_error: true 可以忽略报错，最终 task.status 展示 success。

## 0.2.10

- fix: 修复 saveFileContent 的 content size 的计算方法。

## 0.2.9

- fix: 修复暂停上传后浏览器内存占用大的问题。

## 0.2.8

- feat: 增加 user_tags 支持.
- feat: createFile, getFileUploadUrl 增加 content_type 参数，返回 part_info 也增加 content_type 字段。如果有此字段，PUT上传需要在消息头带上 content-type。

## 0.2.7

- refactor: getDownloadURL 等方法增加 revision_id 参数。
- feat: 上传下载任务增加参数 max_file_size_limit 和 file_ext_list_limit 配置。 
- fix: 弱网环境秒传create过程中暂停，下次启动会自动秒传成功。 IUpCheckpoint 增加 rapid_upload 字段。

## 0.2.6

- fix: 放宽 network error 限制。

## 0.2.5

- fix: isNetworkError 修复。

## 0.2.4

- fix: 修复 getContent, 增加 get_download_url 流程。
- fix: 增加上传下载时 oss 报错connect EADDRNOTAVAIL 或者 socket hang up 的重试机制。
- fix: 修复串行上传 PartNotSequential 错误重试逻辑。
- fix: 上传下载时增加 EPIPE 错误重试逻辑。
- refactor: 增加打印版本信息。
- fix: 上传下载增加 IP 策略限制错误判断逻辑，state变为stopped。

## 0.2.3

- feat: 增加批量接口 `batchCopyFile` 和 `batchMoveFile`。
- fix: 修复上传下载调用 OSS Error 解析。
- fix: 修复使用子进程计算crc64和sha1的逻辑，解决计算到99%卡住问题，解决 ENAMETOOLONG问题。

## 0.2.2

- feat: http client支持 `x-share-token`， 上传下载任务参数也支持 `x-share-token`。
- feat: 获取 `share_token` 接口增加 `check_share_pwd` 字段支持。
- refactor: 支持 `file/complete` 时传入 `crc64_hash` 到服务端校验文件完整性。
- refactor: http client 支持 `donot_emit_error` 参数，表示不 emit 错误。 task 内部调用接口增加 `donot_emit_error` 参数。

## 0.2.1

- fix: Windows下获取网络挂载盘剩余空间方法默认返回Infinity。

## 0.2.0

- refactor: `renameFile`、 `saveFileContent`、 `createFolder` 和 `createFolders` 增加参数 `options?: AxiosRequestConfig`
- refactor: `renameFile`、 `saveFileContent`、 `createFolder` 和 `createFolders` `check_name_mode` 为 `refuse` 时会 `emit` `AlreadyExists` 的 `ClientError`。
- refactor: 去掉上传文件大小限制。
- refactor: `PDSError` 增加 `type` 字段，取值: `ClientError`, `ServerError`
- refactor: `getFile` 的非必填请求参数，由 `ignore_notfound` 改为 `donot_emit_notfound` 更合适。
- refactor: 上传 `checkpoint` 增加 `crc64_hash` 字段。
- fix: 修复云盘文件路径包含非法字符在 windows 下无法下载成功。
- fix: 修复 `checkpoint` 不是最新版本，再次启动上传后失败的问题。（秒传或者 complete 的时候断网或者直接关闭浏览器未能及时保存 checkpoint）
- fix: 修复 `IFile` 兼容前端 `typescript` 环境 `HTMLInputElement.file` 类型。

## 0.1.22

- feat: 上传文件可以传入 `file_id`, 以支持多版本场景。
- pref: 减少 `get_download_url` 调用次数。
- fix: 修复托管模式下 `renameFile` 的 `check_name_mode` 为 `refuse` 不生效的 bug。
- refactor: `getFile` 的非必填请求参数，由 `donot_emit_error` 改为更细化的 `ignore_notfound`。

## 0.1.21

- fix: 兼容 tokenInfo 没有 expire_time 字段的情况。

## 0.1.20

- fix: 增加 donot_emit_error 参数，托管模式 renameFile 接口不需要 throw 异常

## 0.1.19

- fix: 修复并发上传或下载时暂停滞后问题。
- fix: 去掉文件的最大秒传限制，所有文件都可以计算秒传。
- refactor: 打印日志优化。

## 0.1.18

- fix: 优化上传下载逻辑

## 0.1.17

- fix: 修复上传下载 bug

## 0.1.16

- fix: 暂时去掉浏览器使用 worker 计算 sha1 逻辑。
- fix: 优化下载逻辑。
- fix: 自动调节分片数上限 15。

## 0.1.15

- fix: 修复 isNetworkError 方法

## 0.1.14

- fix: 修复 sha1 wasm 报错: Memery out of bound 导致上传失败。

## 0.1.13

- fix: 修复上传下载 progress 更新太过频繁。

## 0.1.12

- fix: 上传下载增加缓冲区配置。

## 0.1.11

- fix: success, rapid_success, error, cancelled 状态调用 stop 方法应该无效。
- fix: 修复自动调节分片数逻辑。

## 0.1.10

- fix: 修复上传下载无法立即暂停。
- fix: 修复标准模式并发上传断点信息。 上传 checkpoint 的 part_info_list item 暴露 parallel_sha1_ctx 字段。

## 0.1.9

- fix: 去掉 URLSearchParams 的依赖。
- fix: 修复 createFolders 的 create_folder_cache 参数。

## 0.1.8

- refactor: 刷新 token 时如果没有设置 `access_token`，报错 `code` 由 `TokenExpired` 改为 `AccessTokenInvalid`。
- fix: 没有权限下载时不创建本地 `.download` 临时文件。

## 0.1.7

feat: 增加 getBreadcrumbFolderList 方法，支持 share_id 参数。

## 0.1.6

- fix: 修复 sha1 方法。

## 0.1.5

- perf: node 进程并发上传计算 sha1 改用 wasm 更快。

## 0.1.4

- refactor: 优化上传下载速度计算方法。
- perf: 计算 sha1 方法优化，增加子进程，worker，wasm 等方式。
- refactor: 标准模式并发上传去掉 crc64 计算流程。
- fix: 修复 token 中 expire_time 格式错误信息。

## 0.1.3

- feat: 增加方法 getFileDownloadUrl。
- feat: 增加方法 getShareLinkByAnonymous，getShareToken，postAPIAnonymous, postAuthAnonymous。
- feat: 所有 API 方法支持 x-share-token 请求头。
- fix: getFileByPath 参数 file_path 改为必选。

## 0.1.2

- 增加 token 相关方法： getUserJwtToken, getServiceJwtToken, refreshJwtToken, getTokenByCode, refreshToken。
- PDSClient 构造函数参数有变动：
  - api_endpoint 和 auth_endpoint 改为至少传入一个。
  - 传入的 token_info.expire_time 将不校验有效期。
- PDSClient 的 send 和 request 改为 protected 方法。
