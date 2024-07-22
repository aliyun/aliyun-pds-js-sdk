import Config from '../config/conf'

const isWeb = typeof window == 'object'

// 兼容 browser 和 node.js
const {PDSClient, HttpClient} = await import(isWeb ? '../../../lib/index.browser' : '../../../lib/index')
var domainInfo

async function getSuperToken(user_id = 'superadmin') {
  const {domain_id} = Config
  const token_path = `../tmp/tmp-token-${domain_id}-${user_id}.json`
  return await import(token_path)
}

async function getClient() {
  let tokenInfo = await getSuperToken()
  let {api_endpoint, auth_endpoint} = Config
  return new PDSClient({
    token_info: tokenInfo,
    api_endpoint,
    auth_endpoint,
    verbose: true,
  })
}
async function getHttpClient() {
  const {user_id, api_endpoint, auth_endpoint} = Config
  var tokenInfo = await getSuperToken(user_id)

  return new HttpClient({
    token_info: tokenInfo,
    api_endpoint,
    auth_endpoint,
    verbose: false,
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

function delay(ms) {
  console.log(`delay: ${ms} ms`)
  return new Promise(a => setTimeout(a, ms))
}

async function deleteUserForce(client, user_id) {
  try {
    let {items = []} = await client.listAllDrives({owner_type: 'user', owner: user_id})
    // console.log(items)
    if (items.length > 0) {
      for (let n of items) {
        await client.deleteDrive({drive_id: n.drive_id, force: true})
      }
    }
    await client.deleteUser({user_id: user_id})
  } catch (e) {
    if (e.status != 404) {
      throw e
    }
  }
}
async function getTestDrive(client) {
  if (!domainInfo) domainInfo = await client.postAPI('/domain/get')

  //  console.log('------domainInfo', domainInfo)
  let user_single_drive_enabled = domainInfo

  if (user_single_drive_enabled) {
    // 单云盘模式
    let {items = []} = await client.listMyDrives()
    if (items.length == 0) {
      // 创建一个
      let info = await client.createDrive({
        drive_name: `jssdk-test-${Math.random().toString(36).substring(2)}`,
        owner: client.token_info.user_id,
        total_size: 1024 * 1024 * 1024,
        default: true,
      })
      items = [info]
    }
    return items[0]
  } else {
    // 多云盘模式
    let {items = []} = await client.listMyDrives()
    if (items.length == 0) {
      // 创建一个
      let info = await client.createDrive({
        drive_name: `jssdk-test-${Math.random().toString(36).substring(2)}`,
        owner: client.token_info.user_id,
        total_size: 1024 * 1024 * 1024,
      })
      items = [info]
    }

    return items[0]
  }
}

export {getSuperToken, getTestDrive, getClient, getHttpClient, createTestFolder, delay, deleteUserForce, PDSClient}
