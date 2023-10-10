import {checkAllowExtName, fix_filename_4_windows} from '../../lib/utils/FileNameUtil'
import {describe, expect, it} from 'vitest'

describe('FileNameUtil', function () {
  describe('checkAllowExtName', () => {
    it('test', () => {
      let fn = checkAllowExtName
      let arr = ['.jpeg', '.png', '.GIF']
      expect(!fn(arr, 'name')).toBeTruthy
      expect(!fn(arr, 'name.txt')).toBeTruthy
      expect(fn(arr, 'name.png')).toBeTruthy
      expect(fn(arr, 'name.PNG')).toBeTruthy
      expect(fn(arr, 'a/b/name.gif')).toBeTruthy
    })
    it('arr is empty', () => {
      let fn = checkAllowExtName
      var arr = []
      expect(fn(arr, 'name')).toBeTruthy
      expect(fn(arr, 'name.txt')).toBeTruthy
      expect(fn(arr, 'name.png')).toBeTruthy
      expect(fn(arr, 'name.PNG')).toBeTruthy
      expect(fn(arr, 'a/b/name.gif')).toBeTruthy

      var arr2 = undefined
      expect(fn(arr2, 'name')).toBeTruthy
      expect(fn(arr2, 'name.txt')).toBeTruthy
      expect(fn(arr2, 'name.png')).toBeTruthy
      expect(fn(arr2, 'name.PNG')).toBeTruthy
      expect(fn(arr2, 'a/b/name.gif')).toBeTruthy
    })
  })

  describe('fix_filename_4_windows', () => {
    it('fix_filename_4_windows', () => {
      expect(fix_filename_4_windows('b\\:*?"<>|a.txt')).toBe('b\\_______a.txt')
    })

    it('fix_filename_4_windows path', () => {
      expect(fix_filename_4_windows('D:\\s|an\\b/:*?"<>|a.txt')).toBe('D:\\s_an\\b\\_______a.txt')
    })
  })
})
