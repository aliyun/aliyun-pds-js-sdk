const domain_id = ''

let cfg = {
  port: 3300,
  domain_id,
  api_endpoint: `https://${domain_id}.api.pds.aliyunccp.com`,
  jwt_app_id: '',
  jwt_app_private_key: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCmEil40pxebx45
......
格式大概是这样的, 注意靠左没有空格
......
6/5ho34xTp9btDqpKwpgkc2LbOGy5ib6DOM6EEy3ui8IZUHWZJmLohw40hIc7UCl
U3Mpv0JkqcwETUcLmLh9Zw==
-----END PRIVATE KEY-----`,
}

let conf = {}
try {
  // 载入自定义配置 conf.js
  conf = require('./conf')
  console.log('Found ./conf')
  Object.assign(cfg, conf)
} catch (e) {}

module.exports = cfg
