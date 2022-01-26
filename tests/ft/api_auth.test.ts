/** @format */

const assert = require('assert')
import {PDSClient, IGetUserJwtTokenReq, IGetServiceJwtTokenReq, IRefreshTokenReq} from './index'

const Config = require('./conf.js')
const PATH_TYPE = 'StandardMode'

describe('AuthAPI', function () {
  this.timeout(60000)

  let client: PDSClient

  it('getUserJwtToken & refreshJwtToken', async () => {
    const {domain_id, user_id, client_id, auth_endpoint, private_key} = Config.domains[PATH_TYPE]

    const params: IGetUserJwtTokenReq = {domain_id, client_id, user_id, private_key_pem: private_key}

    client = new PDSClient({
      auth_endpoint,
    })

    let token = await client.getUserJwtToken(params)

    assert(token.access_token)
    assert(token.refresh_token)
    assert(token.token_type == 'Bearer')
    assert(token.user_id == user_id)

    console.log('----refresh jwt token')
    let token2 = await client.refreshJwtToken({
      client_id,
      refresh_token: token.refresh_token,
    })
    assert(token2.user_id == token.user_id)
    assert(token2.access_token)
    assert(token2.refresh_token)
    assert(token2.access_token != token.access_token)
    assert(token2.refresh_token != token.refresh_token)
  })

  it('getServiceJwtToken', async () => {
    const {domain_id, client_id, auth_endpoint, private_key} = Config.domains[PATH_TYPE]

    const params: IGetServiceJwtTokenReq = {domain_id, client_id, private_key_pem: private_key}

    client = new PDSClient({
      auth_endpoint,
    })

    let token = await client.getServiceJwtToken(params)
    // console.log('service token:', token)
    assert(token.access_token)
    assert(token.refresh_token)
    assert(token.token_type == 'Bearer')
    assert(token.role == 'superadmin')
    assert(token.status == 'enabled')
  })
})
