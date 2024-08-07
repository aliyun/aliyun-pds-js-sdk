const {join, dirname} = require('path')
const {mkdirSync, readFileSync, writeFileSync} = require('fs')
const {fileURLToPath} = require('url')
// es 没有 __filename 全局变量，需要模拟
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// ft/tmp
mkdirSync(join(__dirname, '../tmp'), {recursive: true})
// ut/tmp
mkdirSync(join(__dirname, '../../ut/tmp'), {recursive: true})

const {PDSClient} = require('../../..')

// ************************
// 动态生成 config/conf.js
const config_path = join(__dirname, '..', '/config/conf.js')

let Config
if (process.env.IT_CONFIG) {
  console.log('Found IT_CONFIG, generate config/conf.js')
  try {
    Config = JSON.parse(Buffer.from(process.env.IT_CONFIG, 'base64').toString())
  } catch (err) {
    console.error('parse env IT_CONFIG error', err)
  }

  writeFileSync(config_path, 'export default ' + JSON.stringify(Config, ' ', 2))
}
// ************************

init()
async function init() {
  let t = await fetchSuperToken('superadmin')

  await generateFile4WebTest('audio-test.mp3')
  await generateFile4WebTest('video-test.mov')
}

async function fetchSuperToken(user_id = 'superadmin') {
  Config = require(config_path).default

  const {domain_id, client_id, api_endpoint, auth_endpoint, private_key} = Config
  const token_path = join(__dirname, '..', 'tmp', `tmp-token-${domain_id}-${user_id}.json`)
  let token

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
  writeFileSync(token_path, JSON.stringify(token, ' ', 2))
  return token
}

async function generateFile4WebTest(name) {
  let content_base64 = readFileSync(join(__dirname, '../resources/', name)).toString('base64')
  writeFileSync(
    join(__dirname, '../resources/', name + '-base64.js'),
    `export default {
  name: '${name}',
  content_base64:
    '${content_base64}',
}
`,
  )
}
