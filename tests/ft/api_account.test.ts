import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'
import {IUserItem} from '../../lib'
import {getClient} from './util/token-util'

describe('User', function () {
  let client
  const phone = `135${Math.round(Math.random() * 100000000)}`
  const email = `Test.Email${Math.round(Math.random() * 1000)}@gmail.com`
  let user: IUserItem

  beforeAll(async () => {
    client = await getClient()

    user = await client.createUser({
      user_id: `${Math.round(Math.random() * 10000000)}`,
      phone: `135${Math.round(Math.random() * 100000000)}`,
      nick_name: 'WWJ_CreateUser' + email,
    })
  })
  afterAll(async () => {
    let {items = []} = await client.listAllDrives({owner_type: 'user', owner: user.user_id})
    console.log(items)
    if (items.length > 0) {
      for (let n of items) {
        await client.deleteDrive({drive_id: n.drive_id})
      }
    }
    await client.deleteUser({user_id: user.user_id})
  })

  describe('linkAccount', () => {
    it('bdd', async () => {
      await client.linkAccount({
        type: 'mobile',
        identity: phone,
        user_id: user.user_id,
        extra: '86',
      })

      let res = await client.getAccountLink({
        type: 'mobile',
        identity: phone,
        extra: '86',
      })
      console.log('----11', res)

      expect(res.user_id).toBe(user.user_id)

      let res2 = await client.getAccountLinksByUserId({
        user_id: user.user_id,
      })
      console.log('----22', res2)
      expect(res2.items.length).toBe(1)
      expect(res2.items[0].identity).toBe(phone)
      expect(res2.items[0].authentication_type).toBe('mobile')

      await client.unlinkAccount({
        type: 'mobile',
        identity: phone,
        user_id: user.user_id,
        extra: '86',
      })
    })
  })
})
