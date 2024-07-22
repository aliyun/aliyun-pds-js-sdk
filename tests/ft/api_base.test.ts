import {describe, expect, beforeAll, it} from 'vitest'
import {getClient} from './util/token-util'

describe('DriveAPI', function () {
  let client

  beforeAll(async () => {
    client = await getClient()
  })

  // 标准模式下不限制大小的 此接口用不到
  it('getQuota', async () => {
    const res = await client.getQuota()
    expect(res.size_quota).toBe(0)
  })
})
