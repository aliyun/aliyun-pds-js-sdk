/** @format */

import assert = require('assert')
import {PDSClient} from './index'
import {IUserItem} from '../../src'

const {getClient} = require('./token-util')

const PATH_TYPE = 'StandardMode'

describe('User', function () {
  this.timeout(60 * 1000)
  let client: PDSClient
  const phone = `135${Math.round(Math.random() * 100000000)}`
  const email = `Test.Email${Math.round(Math.random() * 1000)}@gmail.com`
  let user: IUserItem

  this.beforeAll(async () => {
    client = await getClient(PATH_TYPE)
  })

  describe('importUser', () => {
    it('importPhoneUser', async () => {
      const result = await client.importUser({
        authentication_type: 'mobile',
        auto_create_drive: true,
        identity: phone,
        drive_total_size: 1024 * 1024 * 1024,
        nick_name: 'WWJ-' + phone,
      })
      assert.ok(result.user_id)
      user = result
    })
    it('importEmailUser', async () => {
      const result = await client.importUser({
        authentication_type: 'email',
        auto_create_drive: false,
        identity: email,
        nick_name: 'WWJ-' + email,
      })
      assert.ok(result.user_id)
      user = result
    })

    it('importLDAPUser', async () => {
      try {
        const result = await client.importUser({
          identity: 'user',
          authentication_type: 'ldap',
          nick_name: 'ldapTest',
        })
      } catch (error) {
        assert.ok(error)
      }
    })

    it('createUser', async () => {
      const result = await client.createUser({
        user_id: `${Math.round(Math.random() * 10000000)}`,
        phone: `135${Math.round(Math.random() * 100000000)}`,
        nick_name: 'WWJ_CreateUser' + email,
      })
      assert.ok(result.user_id)
    })
  })

  describe('operateUser', () => {
    it('getUser', async () => {
      const result = await client.getUser({
        user_id: user.user_id,
      })
      assert.ok(result.user_id)
    })

    it('generalGetUser', async () => {
      const result = await client.generalGetUser({
        user_id: user.user_id,
        extra_return_info: ['drive', 'group'],
      })
      assert.ok(result.user_id)
    })

    it('updateUser', async () => {
      const result = await client.updateUser({
        user_id: user.user_id,
        nick_name: `update_name_${user.nick_name}`,
      })
      assert.ok(result.user_id)
    })

    it('deleteUser', async () => {
      try {
        await client.deleteUser({
          user_id: user.user_id,
        })
      } catch (error) {
        assert.fail('deleteUser error')
      }
    })
  })

  describe('listUsers', () => {
    it('listAllGroupUsers', async () => {
      const result = await client.listGroupUsers({member_type: 'user'})
      assert.ok(result.user_items)
    })
    it('listUsers', async () => {
      const result = await client.listUsers({
        limit: 100,
      })
      assert.ok(result.items)
    })
  })

  describe('searchUsers', () => {
    it('searchUsers', async () => {
      const result = await client.searchUsers({
        nick_name: 'test',
      })
      assert.ok(result.items)
    })
    it('generalSearchUsers', async () => {
      const result = await client.generalSearchUsers({
        nick_name_for_fuzzy: 'test',
      })
      assert.ok(result.items)
    })
    it('listUsers without params', async () => {
      const result = await client.listUsers()
      assert.ok(result.items)
    })
    it('listUsers', async () => {
      const result = await client.listUsers({
        limit: 100,
      })
      assert.ok(result.items)
    })
  })
})
