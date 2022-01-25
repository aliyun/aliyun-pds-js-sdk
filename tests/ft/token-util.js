/** @format */

const {join} = require('path')
const {readFileSync, writeFileSync, existsSync} = require('fs')
const {PDSClient, HttpClient} = require('./index')
const Config = require('./conf.js')

async function getSuperToken(path_type, user_id = 'superadmin', noCache = false) {
  const {domain_id, client_id, api_endpoint, auth_endpoint, private_key} = Config.domains[path_type]
  const token_path = join(__dirname, 'tmp', `tmp-token-${domain_id}-${user_id}.json`)
  let token

  if (!noCache) {
    token = getCacheToken(token_path)
    if (token) return token
  }

  const params = {domain_id, client_id, user_id, private_key_pem: private_key}

  console.log('重新获取Token')

  try {
    const client = new PDSClient({
      api_endpoint,
      auth_endpoint,
    })

    token = await client.getUserJwtToken(params)
  } catch (e) {
    console.log(e)
    throw e
  }

  // console.log('=====================================\n', token, '\n==================================')
  if (!token.expire_time) token.expire_time = new Date(Date.now() + 7200 * 1000).toISOString()
  if (!noCache) writeFileSync(token_path, JSON.stringify(token, ' ', 2))
  return token
}

function getCacheToken(token_path) {
  if (existsSync(token_path)) {
    try {
      let token = JSON.parse(readFileSync(token_path).toString())
      if (Date.parse(token.expire_time) > Date.now()) {
        return token
      }
    } catch (e) {
      console.error(e)
    }
  }
  return null
}
async function getClient(path_type) {
  let tokenInfo = await getSuperToken(path_type)
  let {api_endpoint, auth_endpoint} = Config['domains'][path_type]
  return new PDSClient({
    token_info: tokenInfo,
    api_endpoint,
    auth_endpoint,
    path_type,
  })
}
async function getHttpClient(path_type) {
  const {user_id, api_endpoint, auth_endpoint} = Config['domains'][path_type]
  var tokenInfo = await getSuperToken(path_type, user_id)

  return new HttpClient({
    token_info: tokenInfo,
    api_endpoint,
    auth_endpoint,
    path_type,
  })
}

module.exports = {getSuperToken, getClient, getHttpClient}
