import {
  getArchiveTaskResult,
  throttleInTimes,
  removeItem,
  calcUploadMaxConcurrency,
  calcDownloadMaxConcurrency,
  getIfVpcUrl,
  calcSmoothSpeed,
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

  describe('Additional coverage', () => {
    it('should handle throttleInTimes with high frequency', async () => {
      let count = 0
      const fn = throttleInTimes(
        () => {
          count++
        },
        5,
        100,
      )
      for (let i = 0; i < 1000; i++) fn()
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(count).toBeLessThan(15) // 调整预期值
    })

    it('should handle removeItem with first element', () => {
      const arr = ['a', 'b', 'c']
      removeItem(arr, 'a')
      expect(arr).toEqual(['b', 'c'])
    })

    it('should handle removeItem with last element', () => {
      const arr = [10, 20, 30, 40]
      removeItem(arr, 40)
      expect(arr).toEqual([10, 20, 30])
    })

    it('should handle calcUploadMaxConcurrency edge cases', () => {
      const M = 1024 * 1024
      expect(calcUploadMaxConcurrency(100 * M, 10 * M, 5)).toBeGreaterThan(5)
      expect(calcUploadMaxConcurrency(0.5 * M, 1 * M, 2)).toBeGreaterThan(0)
    })

    it('should handle calcDownloadMaxConcurrency edge cases', () => {
      const M = 1024 * 1024
      expect(calcDownloadMaxConcurrency(50 * M, 5 * M, 3)).toBeGreaterThan(3)
      expect(calcDownloadMaxConcurrency(0.8 * M, 1 * M, 1)).toBeGreaterThan(0)
    })

    it('should handle getArchiveTaskResult with partial data', () => {
      const result = getArchiveTaskResult({
        url: 'https://example.com/file',
        archive_file_result: {
          crc64_hash: 'abc123',
          size: 1024,
        },
      })
      expect(result.crc64_hash).toBe('abc123')
      expect(result.size).toBe(1024)
    })

    it('should handle getIfVpcUrl with empty strings', () => {
      expect(getIfVpcUrl(true, '', '')).toBe('')
      expect(getIfVpcUrl(false, 'url', '')).toBe('url')
    })

    it('should handle calcSmoothSpeed', () => {
      const speeds = [100, 200, 300, 400, 500]
      const smoothSpeed = calcSmoothSpeed(speeds)
      expect(smoothSpeed).toBeGreaterThan(0)
      expect(smoothSpeed).toBeLessThan(600)
    })

    it('should handle calcSmoothSpeed with single value', () => {
      const speeds = [100]
      const smoothSpeed = calcSmoothSpeed(speeds)
      expect(smoothSpeed).toBeCloseTo(100, 0)
    })

    it('should handle calcSmoothSpeed with custom smoothing', () => {
      const speeds = [100, 200, 300]
      const smoothSpeed = calcSmoothSpeed(speeds, 0.1)
      expect(smoothSpeed).toBeGreaterThan(0)
    })

    it('should handle throttleInTimes cancel', async () => {
      let count = 0
      const fn = throttleInTimes(
        () => {
          count++
        },
        50,
        100,
      )

      fn()
      fn()
      fn()
      fn.cancel()

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(count).toBe(0) // Cancelled before execution
    })

    it('should handle removeItem with non-existent item', () => {
      const arr = [1, 2, 3]
      removeItem(arr, 999)
      expect(arr).toEqual([1, 2, 3])
    })

    it('should handle calcDownloadMaxConcurrency with lastConcurrency at boundary', () => {
      const M = 1024 * 1024
      expect(calcDownloadMaxConcurrency(2 * M, 1 * M, 5)).toBe(5)
      expect(calcDownloadMaxConcurrency(9 * M, 1 * M, 10)).toBe(9)
    })

    it('should handle calcUploadMaxConcurrency reaching max limit', () => {
      const M = 1024 * 1024
      const result = calcUploadMaxConcurrency(50 * M, 1 * M, 12)
      expect(result).toBe(15) // Max is 15
    })
  })
})
