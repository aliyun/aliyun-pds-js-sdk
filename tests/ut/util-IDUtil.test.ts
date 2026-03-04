import {describe, expect, it} from 'vitest'
import {genID} from '../../lib/utils/IDUtil'

describe('IDUtil', () => {
  describe('genID', () => {
    it('should generate ID with default prefix', () => {
      const id = genID()

      expect(id).toMatch(/^id-\d+-[a-z0-9.]{1,10}$/)
      expect(id).toContain('id-')
    })

    it('should generate ID with custom prefix', () => {
      const id = genID('custom-')

      expect(id).toMatch(/^custom-\d+-[a-z0-9.]{1,10}$/)
      expect(id).toContain('custom-')
    })

    it('should generate ID with empty prefix', () => {
      const id = genID('')

      expect(id).toMatch(/^\d+-[a-z0-9.]{1,10}$/)
    })

    it('should generate unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(genID())
      }

      // 所有生成的ID应该是唯一的
      expect(ids.size).toBe(100)
    })

    it('should include timestamp in ID', () => {
      const now = Date.now()
      const id = genID()

      expect(id).toContain(now.toString())
    })

    it('should include random part in ID', () => {
      // 生成多个ID，验证随机部分不同
      const id1 = genID()
      const id2 = genID()

      // 提取随机部分
      const random1 = id1.split('-')[2]
      const random2 = id2.split('-')[2]

      // 随机部分应该存在
      expect(random1).toBeDefined()
      expect(random2).toBeDefined()
      expect(random1.length).toBeGreaterThan(0)
      expect(random1.length).toBeLessThanOrEqual(8)
    })

    it('should work with various prefix types', () => {
      const prefixes = ['test-', 'prefix_', '123-', 'a', '']

      prefixes.forEach(prefix => {
        const id = genID(prefix)
        expect(id).toContain(prefix)
      })
    })
  })
})
