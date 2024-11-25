import {
  getArchiveTaskResult,
  throttleInTimes,
  removeItem,
  calcUploadMaxConcurrency,
  calcDownloadMaxConcurrency,
  getIfVpcUrl,
} from '../../lib/utils/LoadUtil'
import {describe, expect, it} from 'vitest'

describe('LoadUtil', function () {
  it('getIfVpcUrl', () => {
    expect(getIfVpcUrl(true, 'https://url', 'https://vpc-url')).toBe('https://vpc-url')
    expect(getIfVpcUrl(true, 'https://url', '')).toBe('https://url')
    expect(getIfVpcUrl(false, 'https://url', '')).toBe('https://url')
    expect(getIfVpcUrl(false, 'https://url', 'https://vpc-url')).toBe('https://url')
  })
  it('getArchiveTaskResult', () => {
    let data = getArchiveTaskResult({
      archive_file_result: {crc64_hash: '123', url: 'http://x', size: 1},
      url: 'http://x',
    })
    expect(data.download_url).toBe('http://x')
    expect(data.size).toBe(1)
    expect(data.crc64_hash).toBe('123')

    data = getArchiveTaskResult({url: 'http://x'})
    expect(data.download_url).toBe('http://x')
    expect(data.size).toBe(undefined)
    expect(data.crc64_hash).toBe(undefined)
  })
  it('calcUploadMaxConcurrency', () => {
    const M = 1024 * 1024
    expect(calcUploadMaxConcurrency(1 * M, 5 * M, 3)).toBe(3)
    expect(calcUploadMaxConcurrency(1 * M, 3 * M, 2)).toBe(2)
    expect(calcUploadMaxConcurrency(4 * M, 3 * M, 3)).toBe(5)
    expect(calcUploadMaxConcurrency(14 * M, 3 * M, 5)).toBe(10)
    expect(calcUploadMaxConcurrency(10 * M, 3 * M, 10)).toBe(9)
  })

  it('calcDownloadMaxConcurrency', () => {
    const M = 1024 * 1024
    expect(calcDownloadMaxConcurrency(1 * M, 5 * M, 3)).toBe(3)
    expect(calcDownloadMaxConcurrency(1 * M, 3 * M, 2)).toBe(2)
    expect(calcDownloadMaxConcurrency(4 * M, 3 * M, 3)).toBe(5)
    expect(calcDownloadMaxConcurrency(14 * M, 3 * M, 5)).toBe(10)
    expect(calcDownloadMaxConcurrency(10 * M, 3 * M, 10)).toBe(9)
  })

  it('throttleInTimes', async () => {
    let c = 0
    let fn = throttleInTimes(
      () => {
        console.log('---throttleInTimes----', ++c)
      },
      10,
      200,
    )

    for (let i = 0; i < 500; i++) fn()
    await new Promise(a => setTimeout(a, 500))
    expect(c).toBe(3)
  })

  it('removeItem', async () => {
    let arr = [1, 2, 3]
    removeItem(arr, 2)
    expect(arr.join(',')).toBe('1,3')
  })
})
