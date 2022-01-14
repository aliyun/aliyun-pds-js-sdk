/** @format */

const {join} = require('path')
const {readFileSync, writeFileSync, existsSync} = require('fs')
const JWT = require('jsonwebtoken')
const axios = require('axios')
const {PDSClient, HttpClient} = require('./index')
const Config = require('./conf.js')
// console.log('------Config:', Config)

function signAssertion({domain_id, client_id, user_id, privateKeyPEM}) {
  var now_sec = parseInt(Date.now() / 1000)
  var opt = {
    iss: client_id,
    sub: user_id,
    sub_type: 'user',
    aud: domain_id,
    jti: Math.random().toString(36).substring(2),
    exp: now_sec + 60,
    // iat: now_sec,
    // nbf: '',
    auto_create: false,
  }
  return JWT.sign(opt, privateKeyPEM, {
    algorithm: 'RS256',
  })
}
async function getSuperToken(path_type, user_id = 'superadmin') {
  const {domain_id, client_id, auth_endpoint, private_key} = Config.domains[path_type]
  const token_path = join(__dirname, 'tmp', `tmp-token-${domain_id}-${user_id}.json`)
  let token = getCacheToken(token_path)
  if (token) return token

  const params = {domain_id, client_id, user_id, privateKeyPEM: private_key}

  console.log('重新获取Token')

  try {
    var assertion = signAssertion(params)
    var obj = await getToken(assertion, {
      auth_endpoint,
      client_id: params.client_id,
      // subdomain_id: params.subdomain_id,
    })
    token = obj.data
  } catch (e) {
    console.log(e)

    throw e
  }

  // console.log('=====================================\n', token, '\n==================================')
  if (!token.expire_time) token.expire_time = new Date(Date.now() + 7200 * 1000).toISOString()
  writeFileSync(token_path, JSON.stringify(token, ' ', 2))
  return token
}

async function getToken(assertion, {auth_endpoint, client_id, subdomain_id}) {
  return await axios({
    method: 'post',
    url: auth_endpoint + '/v2/oauth/token',
    //注意：要设置请求的 content-type 为 application/x-www-form-urlencoded
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    //注意：请求参数要放在body里
    data: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      client_id,
      assertion,
      // subdomain_id,
    }).toString(),
  })
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
