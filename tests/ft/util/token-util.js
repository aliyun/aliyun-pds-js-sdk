import Config from '../config/conf.js'

const isWeb = typeof window == 'object'

// 兼容 browser 和 node.js
const {PDSClient, HttpClient} = await import(isWeb ? '../../../lib/index.browser' : '../../../lib/index')

async function getSuperToken(user_id = 'superadmin') {
  const {domain_id} = Config
  const token_path = `../tmp/tmp-token-${domain_id}-${user_id}.json`
  return await import(token_path)
}

async function getClient(verbose=false) {
  let tokenInfo = await getSuperToken()
  let {api_endpoint, auth_endpoint} = Config
  return new PDSClient({
    token_info: tokenInfo,
    api_endpoint,
    auth_endpoint,
    verbose
  })
}
async function getHttpClient(verbose=false) {
  const {user_id, api_endpoint, auth_endpoint} = Config
  var tokenInfo = await getSuperToken(user_id)

  return new HttpClient({
    token_info: tokenInfo,
    api_endpoint,
    auth_endpoint,
    verbose
  })
}

async function createTestFolder(client, {drive_id, parent_file_id, name}) {
  let {items = []} = await client.searchFiles({
    drive_id,
    parent_file_id,
    query: `name='${name}'`,
  })
  console.log('====发现', items)

  if (items.length > 0) {
    for (let n of items) {
      await client.deleteFile(
        {
          drive_id,
          file_id: n.file_id,
        },
        true,
      )
    }
    await new Promise(a => setTimeout(a, 2000))
  }

  let test_folder = await client.createFolder({
    drive_id,
    parent_file_id,
    name,
  })
  return test_folder
}
export {getSuperToken, getClient, getHttpClient, createTestFolder, PDSClient}
