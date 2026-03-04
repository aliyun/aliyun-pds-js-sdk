import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSDriveAPIClient} from '../../lib/client/api_drive'
import {IClientParams, IContextExt} from '../../lib/Types'

// Mock the base class methods to control the return values for testing branches
vi.mock('../../lib/client/api_base', () => {
  return {
    PDSBaseAPIClient: class {
      constructor(opt: IClientParams, contextExt: IContextExt) {}

      postAPI(path: string, data: any, options?: any) {
        if (path === '/drive/list') {
          // Return data with and without total_size to cover the if condition
          return Promise.resolve({
            items: [
              {
                drive_id: '1',
                drive_name: 'test-drive-1',
                owner_type: 'user',
                total_size: 1024,
                used_size: 512,
              },
              {
                drive_id: '2',
                drive_name: 'test-drive-2',
                owner_type: 'group',
                total_size: 0, // This covers the case where total_size exists but is falsy
              },
              {
                drive_id: '3',
                drive_name: 'test-drive-3',
                owner_type: 'user',
                // No total_size property to test the if condition
              },
            ],
            next_marker: '',
          })
        }
        return Promise.resolve({})
      }

      async listAllItems(path: string, data: any, options?: any, markerField?: string) {
        if (path === '/drive/list') {
          // Different mock returns for different test cases to cover all branches
          if (data && data._empty_items) {
            return {} // No items property to trigger default value branch
          } else {
            return {
              items: [
                {
                  drive_id: '1',
                  drive_name: 'test-drive-1',
                  owner_type: 'user',
                  total_size: 1024,
                  used_size: 512,
                },
                {
                  drive_id: '2',
                  drive_name: 'test-drive-2',
                  owner_type: 'group',
                  total_size: 2048,
                  used_size: 1024,
                },
                {
                  drive_id: '3',
                  drive_name: 'test-drive-3',
                  owner_type: 'user',
                  // No total_size property to test the if condition
                },
              ],
            }
          }
        }
        return {items: []}
      }
    },
  }
})

describe('PDSDriveAPIClient Branch Coverage', () => {
  let client: PDSDriveAPIClient

  beforeEach(() => {
    const mockOpt = {domain_id: 'test', access_token: 'test'} as IClientParams
    const mockContextExt = {} as IContextExt
    client = new PDSDriveAPIClient(mockOpt, mockContextExt)
  })

  it('should cover listAllDrives with no type parameter', async () => {
    // This covers the branch: !type (when type is undefined)
    const result = await client.listAllDrives()
    expect(result.items).toBeDefined()
    expect(result.items.length).toBeGreaterThan(0)
    // All items should be returned since no type filter is applied
    expect(result.items.length).toBe(3)
  })

  it('should cover listAllDrives with type parameter matching items', async () => {
    // This covers the branch: it.owner_type === type (when condition is true)
    const result = await client.listAllDrives({}, undefined, 'user')
    expect(result.items).toBeDefined()
    expect(result.items.length).toBeGreaterThan(0)
    // Only user type drives should be returned
    result.items.forEach(item => {
      expect(item.owner_type).toBe('user')
    })
  })

  it('should cover listAllDrives with type parameter not matching items', async () => {
    // This covers the branch: it.owner_type === type (when condition is false)
    const result = await client.listAllDrives({}, undefined, 'admin')
    expect(result.items).toBeDefined()
    expect(result.items.length).toBe(0) // No items match 'admin' type
  })

  it('should cover the total_size condition branches', async () => {
    // This tests the if (it.total_size) branch
    const result = await client.listAllDrives()
    expect(result.items).toBeDefined()

    // Check that items with total_size have formatted fields
    const itemWithTotalSize = result.items.find(item => item.drive_id === '1')
    if (itemWithTotalSize) {
      expect(itemWithTotalSize.total).toBeDefined() // Should be formatted
      expect(itemWithTotalSize.used).toBeDefined() // Should be formatted
      expect(itemWithTotalSize.used_total).toBeDefined() // Should be formatted
    }

    // Check that items without total_size don't have formatted fields
    const itemWithoutTotalSize = result.items.find(item => item.drive_id === '3')
    if (itemWithoutTotalSize) {
      expect(itemWithoutTotalSize.total).toBeUndefined() // Should not be formatted
      expect(itemWithoutTotalSize.used).toBeUndefined() // Should not be formatted
      expect(itemWithoutTotalSize.used_total).toBeUndefined() // Should not be formatted
    }
  })

  it('should cover listAllDrives with options parameter', async () => {
    // This covers the optional options parameter
    const options = {timeout: 5000}
    const result = await client.listAllDrives({}, options)
    expect(result.items).toBeDefined()
  })

  it('should cover listAllDrives with missing items property to test default value', async () => {
    // This tests the destructuring default: let {items = []}
    // Mock to return an object without items property
    const result = await client.listAllDrives({_empty_items: true})
    expect(result.items).toBeDefined()
    expect(Array.isArray(result.items)).toBe(true)
    expect(result.items.length).toBe(0) // Should be default empty array
  })

  it('should cover other drive API methods', async () => {
    // Test searchDrives
    const searchResult = await client.searchDrives()
    expect(searchResult).toBeDefined()

    // Test getDrive
    const getDriveResult = await client.getDrive({drive_id: '1'})
    expect(getDriveResult).toBeDefined()

    // Test createDrive
    const createDriveResult = await client.createDrive({
      drive_name: 'test-drive',
      owner: 'test-owner',
      owner_type: 'user',
    })
    expect(createDriveResult).toBeDefined()

    // Test updateDrive
    const updateDriveResult = await client.updateDrive({
      drive_id: '1',
      drive_name: 'updated-name',
    })
    expect(updateDriveResult).toBeDefined()

    // Test deleteDrive
    const deleteDriveResult = await client.deleteDrive({drive_id: '1'})
    expect(deleteDriveResult).toBeDefined()

    // Test getDefaultDrive
    const getDefaultResult = await client.getDefaultDrive({user_id: '1'})
    expect(getDefaultResult).toBeDefined()

    // Test listMyDrives
    const listMyDrivesResult = await client.listMyDrives()
    expect(listMyDrivesResult).toBeDefined()

    // Test listDrives
    const listDrivesResult = await client.listDrives()
    expect(listDrivesResult).toBeDefined()

    // Test listAllMyDrives
    const listAllMyDrivesResult = await client.listAllMyDrives()
    expect(listAllMyDrivesResult).toBeDefined()

    // Test listMyGroupDrives
    const listMyGroupDrivesResult = await client.listMyGroupDrives()
    expect(listMyGroupDrivesResult).toBeDefined()

    // Test listAllMyGroupDrives
    const listAllMyGroupDrivesResult = await client.listAllMyGroupDrives()
    expect(listAllMyGroupDrivesResult).toBeDefined()
  })
})
