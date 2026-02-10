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

    it('should return true when allow_ext_list is null', () => {
      expect(checkAllowExtName(null, 'test.txt')).toBe(true)
    })

    it('should return true when empty array is provided', () => {
      expect(checkAllowExtName([], 'test.txt')).toBe(true)
    })

    it('should handle files without extensions properly', () => {
      expect(checkAllowExtName(['.txt'], 'test')).toBe(false)
      expect(checkAllowExtName(null, 'test')).toBe(true)
      expect(checkAllowExtName(undefined, 'test')).toBe(true)
    })
  })

  describe('fix_filename_4_windows', () => {
    it('fix_filename_4_windows', () => {
      expect(fix_filename_4_windows('b\\:*?"<>|a.txt')).toBe('b\\_______a.txt')
    })

    it('fix_filename_4_windows path', () => {
      expect(fix_filename_4_windows('D:\\s|an\\b/:*?"<>|a.txt')).toBe('D:\\s_an\\b\\_______a.txt')
    })

    it('should handle drive letters correctly', () => {
      expect(fix_filename_4_windows('C:\\folder\\file.txt')).toBe('C:\\folder\\file.txt')
    })

    it('should handle paths with forward slashes', () => {
      expect(fix_filename_4_windows('folder/file:name.txt')).toBe('folder\\file_name.txt')
    })

    it('should handle paths with both forward and backward slashes', () => {
      expect(fix_filename_4_windows('C:\\Users/folder:name.txt')).toBe('C:\\Users\\folder_name.txt')
    })
  })

  describe('Additional edge cases', () => {
    it('should handle checkAllowExtName with mixed case', () => {
      const allow = ['.jpg', '.PNG', '.GiF']
      expect(checkAllowExtName(allow, 'photo.jpg')).toBe(true)
      expect(checkAllowExtName(allow, 'photo.JPG')).toBe(true)
      expect(checkAllowExtName(allow, 'photo.Jpg')).toBe(true)
      expect(checkAllowExtName(allow, 'photo.png')).toBe(true)
      expect(checkAllowExtName(allow, 'photo.gif')).toBe(true)
      expect(checkAllowExtName(allow, 'photo.bmp')).toBe(false)
    })

    it('should handle checkAllowExtName with paths', () => {
      const allow = ['.txt']
      expect(checkAllowExtName(allow, '/path/to/file.txt')).toBe(true)
      expect(checkAllowExtName(allow, '/path/to/file.doc')).toBe(false)
      expect(checkAllowExtName(allow, 'relative/path/file.txt')).toBe(true)
    })

    it('should handle fix_filename_4_windows with all invalid chars', () => {
      expect(fix_filename_4_windows('file<name>test.txt')).toBe('file_name_test.txt')
      expect(fix_filename_4_windows('file|name.txt')).toBe('file_name.txt')
      expect(fix_filename_4_windows('file?name.txt')).toBe('file_name.txt')
      expect(fix_filename_4_windows('file*name.txt')).toBe('file_name.txt')
      expect(fix_filename_4_windows('file"name.txt')).toBe('file_name.txt')
    })

    it('should handle fix_filename_4_windows with drive paths', () => {
      expect(fix_filename_4_windows('C:\\valid\\path.txt')).toBe('C:\\valid\\path.txt')
      expect(fix_filename_4_windows('D:\\folder\\file.doc')).toBe('D:\\folder\\file.doc')
      expect(fix_filename_4_windows('E:\\test|file.txt')).toBe('E:\\test_file.txt')
    })

    it('should handle fix_filename_4_windows with colon not in drive', () => {
      expect(fix_filename_4_windows('folder\\file:name.txt')).toBe('folder\\file_name.txt')
      expect(fix_filename_4_windows('test:file.txt')).toBe('test_file.txt')
    })

    it('should handle fix_filename_4_windows with multiple consecutive invalid chars', () => {
      expect(fix_filename_4_windows('file:::name.txt')).toBe('file___name.txt')
      expect(fix_filename_4_windows('file***name.txt')).toBe('file___name.txt')
      expect(fix_filename_4_windows('file|||name.txt')).toBe('file___name.txt')
    })

    it('should handle fix_filename_4_windows with mixed slashes', () => {
      expect(fix_filename_4_windows('folder/subfolder\\file.txt')).toBe('folder\\subfolder\\file.txt')
      expect(fix_filename_4_windows('C:/Users\\file.txt')).toBe('C:\\Users\\file.txt')
    })

    it('should handle checkAllowExtName with empty filename', () => {
      expect(checkAllowExtName([], '')).toBe(true)
      expect(checkAllowExtName(null, '')).toBe(true)
    })
  })
})
