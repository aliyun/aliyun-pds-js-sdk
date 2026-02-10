import * as PathUtil from '../../lib/utils/PathUtil'

import {describe, expect, it} from 'vitest'

describe('PathUtil', function () {
  it('assertPath', () => {
    expect(() => PathUtil.assertPath(123)).toThrowError(/^Path must be a string/)
  })

  it('basename', async () => {
    const arr = [
      ['/a', 'a'],
      ['/a/b', 'b'],
      ['/a/b/', 'b'],
      ['/a/b/c', 'c'],
      ['/a/b/c/', 'c'],

      ['/', ''],
      ['.', '.'],
      ['./', '.'],
      ['..', '..'],
      ['', ''],
    ]
    for (let n of arr) expect(PathUtil.basename(n[0])).toEqual(n[1])

    expect(PathUtil.basename('/a/b/c.txt', '.txt') == 'c')
  })

  it('dirname', async () => {
    let arr = [
      ['/a/b', '/a'],
      ['/a/b/', '/a'],
      ['/a/b/c', '/a/b'],
      ['/a/b/c/', '/a/b'],
      ['/a', '/'],
      ['', '.'],
      ['/', '/'],
      ['../a', '..'],
      ['a', '.'],
    ]
    for (let n of arr) expect(PathUtil.dirname(n[0])).toEqual(n[1])
  })
  it('extname', async () => {
    let arr = [
      ['/a/b.txt', '.txt'],
      ['/a/b.mp3', '.mp3'],
      ['/a/b/c.tar.gz', '.gz'],
      ['/a/b/c.', '.'],
      ['', ''],
      ['a', ''],
    ]
    for (let n of arr) expect(PathUtil.extname(n[0])).toEqual(n[1])
  })

  describe('Additional path operations', () => {
    it('should handle basename with various extensions', () => {
      expect(PathUtil.basename('/path/to/file.txt', '.txt')).toBe('file')
      expect(PathUtil.basename('/path/to/file.tar.gz', '.gz')).toBe('file.tar')
      expect(PathUtil.basename('file.js', '.js')).toBe('file')
      expect(PathUtil.basename('file.js', '.ts')).toBe('file.js')
    })

    it('should handle dirname with edge cases', () => {
      expect(PathUtil.dirname('.')).toBe('.')
      expect(PathUtil.dirname('..')).toBe('.')
      expect(PathUtil.dirname('a/b')).toBe('a')
      expect(PathUtil.dirname('a/b/')).toBe('a')
      expect(PathUtil.dirname('/root')).toBe('/')
    })

    it('should handle extname with multiple dots', () => {
      expect(PathUtil.extname('file.test.js')).toBe('.js')
      expect(PathUtil.extname('.hidden')).toBe('')
      expect(PathUtil.extname('.hidden.txt')).toBe('.txt')
      expect(PathUtil.extname('file.')).toBe('.')
    })

    it('should handle assertPath with null and undefined', () => {
      expect(() => PathUtil.assertPath(null)).toThrow()
      expect(() => PathUtil.assertPath(undefined)).toThrow()
      expect(() => PathUtil.assertPath('')).not.toThrow()
      expect(() => PathUtil.assertPath('valid')).not.toThrow()
    })

    it('should handle paths with special characters', () => {
      expect(PathUtil.basename('/path/to/file name.txt')).toBe('file name.txt')
      expect(PathUtil.dirname('/path with space/to/file')).toBe('/path with space/to')
      expect(PathUtil.extname('/path/file-v2.0.txt')).toBe('.txt')
    })

    it('should handle paths without extension', () => {
      expect(PathUtil.extname('/path/to/README')).toBe('')
      expect(PathUtil.extname('/path/to/Makefile')).toBe('')
      expect(PathUtil.basename('/path/to/LICENSE')).toBe('LICENSE')
    })
  })
})
