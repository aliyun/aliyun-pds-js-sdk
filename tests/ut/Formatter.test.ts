/** @format */

import assert = require('assert')
import {format2fixed, parseSize, formatSize, formatUsedSpace, elapse} from '../../src/utils/Formatter'

describe('Formater', () => {
  it('formatSize', () => {
    assert(formatSize(-1) === 'Infinity')
    assert(formatSize(0) === '0B')
    assert(formatSize(100) === '100B')
    assert(formatSize(1024) === '1.00KB')
    assert(formatSize(1024, true) === '1KB')
    assert(formatSize(10241) === '10.00KB')
    assert(formatSize(10541) === '10.29KB')
    assert(formatSize(5 * 1024 * 1024 * 1024 * 1024, true) === '5TB')
    assert(formatSize(5 * 1024 * 1024 * 1024 * 1024 + 3 * 1024 * 1024 * 1024, true) === '5TB')
    assert(formatSize(5 * 1024 * 1024 * 1024 * 1024 + 300 * 1024 * 1024 * 1024) === '5.29TB')
  })
  it('parseSize', () => {
    assert(parseSize('') === 0)
    assert(parseSize('a') === 0)
    assert(parseSize('123B') === 123)
    assert(parseSize('123DB') === 0)
    assert(parseSize('100KB') === 102400)
    assert(parseSize('100GB') === 100 * 1024 * 1024 * 1024)
  })

  it('formatUsedSpace', () => {
    assert(formatUsedSpace(1024, -1, true) === '0%')
    assert(formatUsedSpace(1025 * 1024, 10 * 1024 * 1024, true) === '10.01%')
    assert(formatUsedSpace(1025 * 1024, 10 * 1024 * 1024, false) === '0.10')
    assert(formatUsedSpace(1025 * 1024, 100 * 1024 * 1024, true) === '1.00%')
  })

  it('elapse', () => {
    assert(elapse(0) === '-')
    assert(elapse(50) === '50ms')
    assert(elapse(1000) === '00:00:01')
    assert(elapse(65 * 1000) === '00:01:05')
    assert(elapse(2 * 60 * 60 * 1000 + 3 * 60 * 1000) === '02:03:00')
    assert(elapse(2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 5 * 1000) === '02:03:05')
    assert(elapse(7 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000 + 5 * 1000) === '7天00:03:05')
  })

  it('format2fixed', () => {
    assert(format2fixed(0.12344) == 12.34)
    assert(format2fixed(0.12345) == 12.35)
    assert(format2fixed(0.123) == 12.3)
    assert(format2fixed(0) == 0)
    assert(isNaN(format2fixed(Date.parse('a')))) // NaN
  })
})
