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
})
