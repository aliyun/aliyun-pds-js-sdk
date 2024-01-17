import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'
import {PDSClient} from './util/token-util'
import Config from './config'

describe('AuthAPI', function () {
  let client

  it('getUserJwtToken & refreshJwtToken', async () => {
    const {domain_id, user_id, client_id, auth_endpoint, private_key} = Config

    const params = {domain_id, client_id, user_id, private_key_pem: private_key}

    client = new PDSClient({
      auth_endpoint,
    })

    let token = await client.getUserJwtToken(params)

    expect(!!token.access_token).toBe(true)
    expect(!!token.refresh_token).toBe(true)
    expect(token.token_type).toBe('Bearer')
    expect(token.user_id).toBe(user_id)

    if (!token.refresh_token) throw new Error('Require refresh_token')

    console.log('----refresh jwt token')
    let token2 = await client.refreshJwtToken({
      client_id,
      refresh_token: token.refresh_token,
    })
    expect(token2.user_id).toBe(token.user_id)
    expect(!!token2.access_token)
    expect(!!token2.refresh_token)
    expect(token2.access_token).not.toBe(token.access_token)
    expect(token2.refresh_token).not.toBe(token.refresh_token)
  })

  it('getServiceJwtToken', async () => {
    const {domain_id, client_id, auth_endpoint, private_key} = Config

    const params = {domain_id, client_id, private_key_pem: private_key}

    client = new PDSClient({
      auth_endpoint,
    })

    let token = await client.getServiceJwtToken(params)
    // console.log('service token:', token)
    expect(!!token.access_token).toBe(true)
    expect(!!token.refresh_token).toBe(true)
    expect(token.token_type).toBe('Bearer')
    expect(token.role).toBe('superadmin')
    expect(token.status).toBe('enabled')
  })
})
