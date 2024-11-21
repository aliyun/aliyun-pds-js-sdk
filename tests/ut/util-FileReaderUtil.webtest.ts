import {describe, expect, it} from 'vitest'
import {slice_file, does_file_exist} from '../../lib/utils/BrowserFileReaderUtil'

describe('src/context/BrowserFileUtil', () => {
  describe('slice_file', () => {
    it('slice_file', async () => {
      let file = new File(['abc123456'], 'hello.png', {type: 'plain/text'})
      let result = await slice_file(file, 0, 3)
      expect(file.size).toBe(9)
      expect(result.size).toBe(3)
    })
  })

  describe('does_file_exist', () => {
    it('file', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})

      let err = await does_file_exist(file)
      expect(err).toBe(undefined)
    })
    it('empty file', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      const file = new File([], 'hello.txt', {type: 'plain/text'})

      let err = await does_file_exist(file)
      expect(err).toBe(undefined)
    })
  })
})
