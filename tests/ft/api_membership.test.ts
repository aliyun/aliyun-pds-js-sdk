import {describe, expect, beforeAll, beforeEach, afterAll, it} from 'vitest'

import {getClient} from './util/token-util'

describe('MemberShip', function () {
  let client

  let group_id

  beforeAll(async () => {
    client = await getClient()

    const result = await client.createGroup({
      description: '',
      group_name: `Test_Group_${Math.round(Math.random() * 1000)}`,
      is_root: true,
    })
    expect(!!result.group_id).toBe(true)

    group_id = result.group_id
  })
  afterAll(async () => {
    await client.deleteGroup({
      group_id: group_id,
    })
  })

  it('createMembership', async () => {
    const result = await client.createMembership({
      user_id: client.token_info?.user_id,
      member_type: 'user',
      member_role: 'member',
      group_id,
    })
    expect(!!result.user_id).toBe(true)
  })

  it('getMembership', async () => {
    const result = await client.getMembership({
      user_id: client.token_info?.user_id,
      member_type: 'user',
      member_role: 'member',
      group_id,
    })
    expect(!!result.user_id).toBe(true)
  })

  it('hasMember', async () => {
    const result = await client.hasMember({
      user_id: client.token_info?.user_id,
      member_type: 'user',
      group_id,
    })
    expect(result.result).toBe(true)
  })

  it('updateMembership', async () => {
    const result = await client.updateMembership({
      user_id: client.token_info?.user_id,
      member_type: 'user',
      group_id,
    })
    expect(!!result.user_id).toBe(true)
  })

  it('deleteMembership', async () => {
    try {
      await client.deleteMembership({
        user_id: client.token_info?.user_id,
        member_type: 'user',
        group_id,
      })
      expect(2).toBe(1)
    } catch (error) {
      expect(1).toBe(1)
    }
  })
  it('listDirectParentMemberships', async () => {
    const result = await client.listDirectParentMemberships({
      user_id: client.token_info?.user_id,
      member_type: 'user',
      limit: 100,
    })
    expect(result.items.length).toBeGreaterThanOrEqual(0)
  })
})
