import {describe, expect, beforeAll, afterAll, it} from 'vitest'
import {IUserItem} from '../../lib'
import {getClient, deleteUserForce} from './util/token-util'

async function delete_user_force(client, user_id) {
  await deleteUserForce(client, user_id)
}

describe('User', function () {
  let client
  const phone = `135${Math.round(Math.random() * 100000000)}`
  const email = `Test.Email${Math.round(Math.random() * 1000)}@gmail.com`

  beforeAll(async () => {
    client = await getClient()
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
      expect(!!result.user_id).toBe(true)

      await delete_user_force(client, result.user_id)
    })
    it('importEmailUser', async () => {
      const result = await client.importUser({
        authentication_type: 'email',
        auto_create_drive: false,
        identity: email,
        nick_name: 'WWJ-' + email,
      })
      expect(!!result.user_id).toBe(true)

      await delete_user_force(client, result.user_id)
    })

    it('importLDAPUser', async () => {
      try {
        const result = await client.importUser({
          identity: 'user',
          authentication_type: 'ldap',
          nick_name: 'ldapTest',
        })
        expect(2).toBe(1)
      } catch (error) {
        console.log('-----importLDAPUser---err', error)
        expect(!!error).toBe(true)
      }
    })

    it('createUser', async () => {
      const result = await client.createUser({
        user_id: `${Math.round(Math.random() * 10000000)}`,
        phone: `135${Math.round(Math.random() * 100000000)}`,
        nick_name: 'WWJ_CreateUser' + email,
      })
      expect(!!result.user_id).toBe(true)

      await delete_user_force(client, result.user_id)
    })
  })

  describe('operateUser', () => {
    let user
    beforeAll(async () => {
      const result = await client.createUser({
        user_id: `${Math.round(Math.random() * 10000000)}`,
        phone: `135${Math.round(Math.random() * 100000000)}`,
        nick_name: 'WWJ_CreateUser' + email,
      })
      expect(!!result.user_id).toBe(true)
      user = result
    })
    afterAll(async () => {
      await delete_user_force(client, user.user_id)
    })
    it('getUser', async () => {
      const result = await client.getUser({
        user_id: user.user_id,
      })
      expect(!!result.user_id).toBe(true)
    })

    it('generalGetUser', async () => {
      const result = await client.generalGetUser({
        user_id: user.user_id,
        extra_return_info: ['drive', 'group'],
      })
      expect(!!result.user_id).toBe(true)
    })

    it('updateUser', async () => {
      const result = await client.updateUser({
        user_id: user.user_id,
        nick_name: `update_name_${user.nick_name}`,
      })
      expect(!!result.user_id).toBe(true)
    })

    it('deleteUser', async () => {
      try {
        await client.deleteUser({
          user_id: user.user_id,
        })
        expect(2).toBe(1)
      } catch (error) {
        expect(!!error).toBe(true)
      }
    })
  })

  describe('listUsers', () => {
    it('listAllGroupUsers', async () => {
      const result = await client.listGroupUsers({member_type: 'user'})
      expect(result.user_items?.length).toBeGreaterThanOrEqual(0)
    })
    it('listUsers', async () => {
      const result = await client.listUsers({
        limit: 100,
      })
      expect(result.items?.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('searchUsers', () => {
    it('searchUsers', async () => {
      const result = await client.searchUsers({
        nick_name: 'test',
      })
      expect(result.items?.length).toBeGreaterThanOrEqual(0)
    })
    it('generalSearchUsers', async () => {
      const result = await client.generalSearchUsers({
        nick_name_for_fuzzy: 'test',
      })
      expect(result.items?.length).toBeGreaterThanOrEqual(0)
    })
    it('listUsers without params', async () => {
      const result = await client.listUsers()
      expect(result.items?.length).toBeGreaterThanOrEqual(0)
    })
    it('listUsers', async () => {
      const result = await client.listUsers({
        limit: 100,
      })
      expect(result.items?.length).toBeGreaterThanOrEqual(0)
    })
  })
})
