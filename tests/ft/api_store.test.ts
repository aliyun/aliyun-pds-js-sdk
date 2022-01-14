/** @format */

import assert = require('assert')
import {PDSClient} from './index'

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('Store', async function () {
  this.timeout(60 * 1000)
  let client: PDSClient
  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
  })

  it('listStores', async () => {
    const result = await client.listStores({limit: 30})
    assert.ok(result.items.length)
    assert.ok(result.items[0].type == 'oss')
  })

  it('listAllStores', async () => {
    const result = await client.listAllStores()
    assert.ok(result.items.length)
    assert.ok(result.items[0].type == 'oss')
  })
})
