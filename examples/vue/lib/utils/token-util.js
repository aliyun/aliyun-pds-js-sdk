const path = require('path')
const fs = require('fs')

const {PDSClient} = require('../../../..')

const Config = require('../config')

const {join, basename} = path
const {readFileSync, writeFileSync, existsSync, promises: fsPromises} = fs

async function getUserToken(user_id = 'superadmin', noCache = false) {
  const {domain_id, api_endpoint, jwt_app_id, jwt_app_private_key} = Config
  const token_path = join(__dirname, '..', 'config', `tmp-token-${domain_id}-${user_id}.json`)
  let token

  if (!noCache) {
    token = await getCacheToken(token_path)
    if (token) return token
  }

  const params = {domain_id, user_id, client_id: jwt_app_id, private_key_pem: jwt_app_private_key}

  console.log('重新获取Token')

  try {
    const client = new PDSClient({
      api_endpoint,
    })

    token = await client.getUserJwtToken(params)
  } catch (e) {
    console.log(e)
    throw e
  }

  if (!token.expire_time) token.expire_time = new Date(Date.now() + 7200 * 1000).toISOString()
  if (!noCache) writeFileSync(token_path, JSON.stringify(token, ' ', 2))
  return token
}

async function getCacheToken(token_path) {
  if (existsSync(token_path)) {
    try {
      let content = await fsPromises.readFile(token_path)
      let token = JSON.parse(content.toString())
      if (Date.parse(token.expire_time) > Date.now()) {
        return token
      }
    } catch (e) {
      console.error(e)
    }
  }
  return null
}

function getWebFile(localPath, type = 'text/plain') {
  let f = new File([readFileSync(localPath)], basename(localPath), {type})
  f.path = localPath
  return f
}

module.exports = {getUserToken, getWebFile}
