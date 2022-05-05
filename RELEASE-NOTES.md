<!-- @format -->

# Release Notes

## 0.2.2

- feat: http client支持 `x-share-token`， 上传下载任务参数也支持 `x-share-token`。
- feat: 获取 `share_token` 接口增加 `check_share_pwd` 字段支持。

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

- fix: 修复上传下载 progree 更新太过频繁。

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
