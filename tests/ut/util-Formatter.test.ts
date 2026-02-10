import {describe, expect, it} from 'vitest'
import {formatSize, parseSize, formatUsedSpace, randomHex, elapse, formatPercents} from '../../lib/utils/Formatter'

describe('src/utils/Formatter', () => {
  it('formatSize', () => {
    expect(formatSize(-1)).toBe('Infinity')
    expect(formatSize(0)).toBe('0B')
    expect(formatSize(100)).toBe('100B')
    expect(formatSize(1024)).toBe('1.00KB')
    expect(formatSize(1024, true)).toBe('1KB')
    expect(formatSize(10241)).toBe('10.00KB')
    expect(formatSize(10541)).toBe('10.29KB')
    expect(formatSize(5 * 1024 * 1024 * 1024 * 1024, true)).toBe('5TB')
    expect(formatSize(5 * 1024 * 1024 * 1024 * 1024 + 3 * 1024 * 1024 * 1024, true)).toBe('5TB')
    expect(formatSize(5 * 1024 * 1024 * 1024 * 1024 + 300 * 1024 * 1024 * 1024)).toBe('5.29TB')
  })
  it('parseSize', () => {
    expect(parseSize('')).toBe(0)
    expect(parseSize('a')).toBe(0)
    expect(parseSize('123B')).toBe(123)
    expect(parseSize('123DB')).toBe(0)
    expect(parseSize('100KB')).toBe(102400)
    expect(parseSize('100GB')).toBe(100 * 1024 * 1024 * 1024)

    const m = {
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024,
      T: 1024 * 1024 * 1024 * 1024,
      P: Math.pow(1024, 5),
      E: Math.pow(1024, 6),
      Z: Math.pow(1024, 7),
      Y: Math.pow(1024, 8),
    }
    expect(parseSize('6.0K')).toBe(6 * m.K)
    expect(parseSize('3Mi')).toBe(3 * m.M)
    expect(parseSize('3Gi')).toBe(3 * m.G)
    expect(parseSize('2Ti')).toBe(2 * m.T)
    expect(parseSize('4P')).toBe(4 * m.P)
    expect(parseSize('5E')).toBe(5 * m.E)
    expect(parseSize('1Z')).toBe(1 * m.Z)
    expect(parseSize('2Y')).toBe(2 * m.Y)
    expect(parseSize('2')).toBe(2)
    expect(parseSize('2B')).toBe(2)
    expect(parseSize('2.0B')).toBe(2)
  })

  it('formatUsedSpace', () => {
    expect(formatUsedSpace(1024, -1, true)).toBe('0%')
    expect(formatUsedSpace(1025 * 1024, 10 * 1024 * 1024, true)).toBe('10.01%')
    expect(formatUsedSpace(1025 * 1024, 10 * 1024 * 1024, false)).toBe('0.10')
    expect(formatUsedSpace(1025 * 1024, 100 * 1024 * 1024, true)).toBe('1.00%')
  })

  it('elapse', () => {
    expect(elapse(0)).toBe('-')
    expect(elapse(50)).toBe('50ms')
    expect(elapse(1000)).toBe('00:00:01')
    expect(elapse(65 * 1000)).toBe('00:01:05')
    expect(elapse(2 * 60 * 60 * 1000 + 3 * 60 * 1000)).toBe('02:03:00')
    expect(elapse(2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 5 * 1000)).toBe('02:03:05')
    expect(elapse(7 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000 + 5 * 1000)).toBe('7天00:03:05')
  })

  it('formatPercents', () => {
    expect(formatPercents(0)).toBe(0)
    expect(formatPercents(1)).toBe(1)
    expect(formatPercents(2.0)).toBe(2)

    expect(formatPercents(12.11234, 2)).toBe(12.11)
    expect(formatPercents(12.11235, 2)).toBe(12.11)
    expect(formatPercents('34.0001')).toBe(34)
    expect(formatPercents('34.0001', 2)).toBe(34.0)
  })

  it('randomHex', () => {
    let m = {}
    for (let i = 0; i < 1000; i++) {
      let v = randomHex()
      if (m[v]) {
        console.warn('randomHex conflict')
        expect.not
      }
      m[v] = 1
      expect(v.length).toBe(10)
    }
  })

  describe('Additional formatting coverage', () => {
    it('should handle formatSize edge cases', () => {
      expect(formatSize(1)).toBe('1B')
      expect(formatSize(512)).toBe('512B')
      expect(formatSize(1023)).toBe('1023B')
      expect(formatSize(1536)).toBe('1.50KB')
      expect(formatSize(1024 * 1024)).toBe('1.00MB')
      expect(formatSize(1024 * 1024 * 1024)).toBe('1.00GB')
      expect(formatSize(1024 * 1024, true)).toBe('1MB')
    })

    it('should handle parseSize with decimals', () => {
      expect(parseSize('1.5KB')).toBe(1536)
      expect(parseSize('2.5MB')).toBe(2.5 * 1024 * 1024)
      expect(parseSize('0.5GB')).toBe(0.5 * 1024 * 1024 * 1024)
    })

    it('should handle formatUsedSpace boundary cases', () => {
      expect(formatUsedSpace(0, 1024, true)).toBe('0.00%')
      expect(formatUsedSpace(1024, 1024, true)).toBe('100.00%')
      expect(formatUsedSpace(512, 1024, false)).toBe('0.50')
      expect(formatUsedSpace(256, 1024, true)).toBe('25.00%')
    })

    it('should handle elapse with various durations', () => {
      expect(elapse(1)).toBe('1ms')
      expect(elapse(999)).toBe('999ms')
      expect(elapse(60 * 1000)).toBe('00:01:00')
      expect(elapse(60 * 60 * 1000)).toBe('01:00:00')
      expect(elapse(24 * 60 * 60 * 1000)).toBe('1天00:00:00')
      expect(elapse(30 * 24 * 60 * 60 * 1000)).toBe('30天00:00:00')
    })

    it('should handle formatPercents with integer values', () => {
      expect(formatPercents(0)).toBe(0)
      expect(formatPercents(99)).toBe(99)
      expect(formatPercents(100)).toBe(100)
    })

    it('should handle randomHex uniqueness', () => {
      const hex1 = randomHex()
      const hex2 = randomHex()
      expect(hex1).not.toBe(hex2)
      expect(hex1.length).toBe(10)
      expect(hex2.length).toBe(10)
    })
  })
})
