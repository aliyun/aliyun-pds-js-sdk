# Release Notes

## 0.1.2

* 增加 token 相关方法： getUserJwtToken, getServiceJwtToken, refreshJwtToken, getTokenByCode, refreshToken。
* PDSClient 构造函数参数有变动：
  * api_endpoint 和 auth_endpoint 改为至少传入一个。
  * 传入的 token_info.expire_time 将不校验有效期。
* PDSClient 的 send 和 request 改为 protected 方法。

