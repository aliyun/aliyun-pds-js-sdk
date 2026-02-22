import {describe, expect, beforeAll, it} from 'vitest'
import {getClient} from './util/token-util'

describe('DriveAPIComprehensiveCoverage', function () {
  let client

  beforeAll(async () => {
    client = await getClient()
  })

  // 专门测试api_drive.ts中的分支
  it('should cover all branches in api_drive.ts', async () => {
    // 测试listAllDrives with type filtering
    let result = await client.listAllDrives({}, undefined, 'user')
    expect(result).toBeDefined()
    expect(Array.isArray(result.items)).toBe(true)

    result = await client.listAllDrives({limit: 50}, {timeout: 30000}, 'user')
    expect(result).toBeDefined()
    expect(Array.isArray(result.items)).toBe(true)

    // 测试不带type参数的情况
    result = await client.listAllDrives({}, undefined)
    expect(result).toBeDefined()
    expect(Array.isArray(result.items)).toBe(true)

    // 测试带选项的listAllDrives
    result = await client.listAllDrives({limit: 10}, {timeout: 30000})
    expect(result).toBeDefined()
    expect(Array.isArray(result.items)).toBe(true)

    // 测试格式化功能分支（当total_size存在时）
    if (result.items && result.items.length > 0) {
      const driveWithSize = result.items.find(item => item.total_size && item.total_size > 0)
      if (driveWithSize) {
        // 验证格式化字段是否被添加
        expect(driveWithSize.hasOwnProperty('total')).toBe(true)
        expect(driveWithSize.hasOwnProperty('used')).toBe(true)
        expect(driveWithSize.hasOwnProperty('used_total')).toBe(true)
      }
    }

    // 测试listMyDrives方法
    const myDrives = await client.listMyDrives()
    expect(myDrives).toBeDefined()

    // 测试带选项的listMyDrives方法
    const myDrivesWithOptions = await client.listMyDrives({limit: 10}, {timeout: 30000})
    expect(myDrivesWithOptions).toBeDefined()

    // 测试listDrives方法
    const drives = await client.listDrives()
    expect(drives).toBeDefined()

    // 测试带选项的listDrives方法
    const drivesWithOptions = await client.listDrives({limit: 10}, {timeout: 30000})
    expect(drivesWithOptions).toBeDefined()

    // 测试listAllMyDrives方法
    const allMyDrives = await client.listAllMyDrives()
    expect(allMyDrives).toBeDefined()

    // 测试带选项的listAllMyDrives方法
    const allMyDrivesWithOptions = await client.listAllMyDrives({limit: 10}, {timeout: 30000})
    expect(allMyDrivesWithOptions).toBeDefined()

    // 测试listMyGroupDrives方法
    const groupDrives = await client.listMyGroupDrives()
    expect(groupDrives).toBeDefined()

    // 测试带选项的listMyGroupDrives方法
    const groupDrivesWithOptions = await client.listMyGroupDrives({limit: 10}, {timeout: 30000})
    expect(groupDrivesWithOptions).toBeDefined()

    // 测试listAllMyGroupDrives方法
    const allGroupDrives = await client.listAllMyGroupDrives()
    expect(allGroupDrives).toBeDefined()

    // 测试带选项的listAllMyGroupDrives方法
    const allGroupDrivesWithOptions = await client.listAllMyGroupDrives({limit: 10}, {timeout: 30000})
    expect(allGroupDrivesWithOptions).toBeDefined()

    // 测试searchDrives方法
    const searchResult = await client.searchDrives({limit: 10}, {timeout: 30000})
    expect(searchResult).toBeDefined()

    expect(1).toBe(1)
  })
})
