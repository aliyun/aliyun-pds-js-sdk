# Release Notes


## 0.1.16

fix: 暂时去掉浏览器使用worker计算sha1逻辑。
fix: 优化下载逻辑。
fix: 自动调节分片数上限15。

## 0.1.15

fix: 修复 isNetworkError 方法

## 0.1.14

* fix: 修复sha1 wasm报错: Memery out of bound 导致上传失败。

## 0.1.13

* fix: 修复上传下载progree更新太过频繁。

## 0.1.12

* fix: 上传下载增加缓冲区配置。

## 0.1.11

* fix: success, rapid_success, error, cancelled 状态调用 stop 方法应该无效。
* fix: 修复自动调节分片数逻辑。

## 0.1.10

* fix: 修复上传下载无法立即暂停。
* fix: 修复标准模式并发上传断点信息。 上传 checkpoint 的 part_info_list item 暴露 parallel_sha1_ctx 字段。

## 0.1.9

* fix: 去掉 URLSearchParams 的依赖。
* fix: 修复 createFolders 的 create_folder_cache 参数。

## 0.1.8

* refactor: 刷新 token 时如果没有设置 `access_token`，报错 `code` 由 `TokenExpired` 改为 `AccessTokenInvalid`。
* fix: 没有权限下载时不创建本地 `.download` 临时文件。

## 0.1.7

feat: 增加 getBreadcrumbFolderList 方法，支持 share_id 参数。

## 0.1.6

* fix: 修复 sha1 方法。

## 0.1.5

* perf: node进程并发上传计算sha1 改用 wasm 更快。

## 0.1.4

* refactor: 优化上传下载速度计算方法。
* perf: 计算 sha1 方法优化，增加子进程，worker，wasm等方式。
* refactor: 标准模式并发上传去掉 crc64 计算流程。
* fix: 修复token中expire_time格式错误信息。

## 0.1.3

* feat: 增加方法 getFileDownloadUrl。
* feat: 增加方法 getShareLinkByAnonymous，getShareToken，postAPIAnonymous, postAuthAnonymous。
* feat: 所有API方法支持 x-share-token 请求头。
* fix: getFileByPath 参数 file_path 改为必选。

## 0.1.2

* 增加 token 相关方法： getUserJwtToken, getServiceJwtToken, refreshJwtToken, getTokenByCode, refreshToken。
* PDSClient 构造函数参数有变动：
  * api_endpoint 和 auth_endpoint 改为至少传入一个。
  * 传入的 token_info.expire_time 将不校验有效期。
* PDSClient 的 send 和 request 改为 protected 方法。

