import {initCheckpoint, formatCheckpoint} from '../../lib/utils/CheckpointUtil'
import {describe, expect, it} from 'vitest'

describe('CheckpointUtil', function () {
  describe('initCheckpoint', () => {
    it('loc', () => {
      let cp = {
        loc_type: 'drive',
        loc_id: '1',
        file_key: 'f-1',
      }
      let result = initCheckpoint(cp)
      expect(result).toEqual({
        loc_type: 'drive',
        loc_id: '1',
        drive_id: '1',
        file_key: 'f-1',
        file_id: 'f-1',
      })
    })

    it('drive_id', () => {
      let cp = {
        drive_id: '1',
        file_id: 'f-1',
      }
      let result = initCheckpoint(cp)
      expect(result).toEqual({
        loc_type: 'drive',
        loc_id: '1',
        drive_id: '1',
        file_key: 'f-1',
        file_id: 'f-1',
      })
    })

    it('parent_file_id', () => {
      let cp = {
        drive_id: '1',
        file_id: 'f-1',
        parent_file_id: 'p-1',
      }
      let result = initCheckpoint(cp)
      expect(result).toEqual({
        loc_type: 'drive',
        loc_id: '1',
        drive_id: '1',
        file_key: 'f-1',
        file_id: 'f-1',
        parent_file_id: 'p-1',
        parent_file_key: 'p-1',
      })
    })
    it('drive', () => {
      let cp = {
        drive_id: '1',
        file_key: 'f-1',
      }
      let result = initCheckpoint(cp)
      expect(result).toEqual({
        loc_type: 'drive',
        loc_id: '1',
        drive_id: '1',
        file_key: 'f-1',
        file_id: 'f-1',
      })
    })
    it('share', () => {
      let cp = {
        loc_type: 'drive',
        loc_id: '1',
        parent_file_key: '2',
      }
      let result = initCheckpoint(cp)
      expect(result).toEqual({
        loc_type: 'drive',
        loc_id: '1',
        drive_id: '1',
        parent_file_key: '2',
        parent_file_id: '2',
      })
    })
  })
  describe('formatCheckpoint', () => {
    it('formatCheckpoint', () => {
      let cp = {
        loc_type: 'share',
        loc_id: '1',
        file_key: 'f-1',
      }
      let result = formatCheckpoint(cp)

      expect(result).toEqual({
        loc_type: 'share',
        loc_id: '1',
        file_key: 'f-1',
        share_id: '1',
        file_id: 'f-1',
      })
    })
    it('has parent_file_key', () => {
      let cp = {
        loc_type: 'share',
        loc_id: '1',
        file_key: 'f-1',
        parent_file_key: 'p-1',
      }
      let result = formatCheckpoint(cp)

      expect(result).toEqual({
        loc_type: 'share',
        loc_id: '1',
        file_key: 'f-1',
        parent_file_key: 'p-1',
        share_id: '1',
        file_id: 'f-1',
        parent_file_id: 'p-1',
      })
    })
  })

  describe('Additional checkpoint scenarios', () => {
    it('should handle initCheckpoint with minimal fields', () => {
      const cp = {
        drive_id: 'test-drive',
      }
      const result = initCheckpoint(cp)
      expect(result.loc_type).toBe('drive')
      expect(result.loc_id).toBe('test-drive')
      expect(result.drive_id).toBe('test-drive')
    })

    it('should handle initCheckpoint with share type', () => {
      const cp = {
        loc_type: 'share',
        loc_id: 'share-123',
        file_key: 'file-456',
      }
      const result = initCheckpoint(cp)
      expect(result.loc_type).toBe('share')
      expect(result.share_id).toBe('share-123')
      expect(result.file_id).toBe('file-456')
    })

    it('should handle formatCheckpoint with drive type', () => {
      const cp = {
        loc_type: 'drive',
        loc_id: 'drive-123',
        file_key: 'file-789',
      }
      const result = formatCheckpoint(cp)
      expect(result.drive_id).toBe('drive-123')
      expect(result.file_id).toBe('file-789')
    })

    it('should handle initCheckpoint with all optional fields', () => {
      const cp = {
        drive_id: 'd1',
        file_id: 'f1',
        parent_file_id: 'p1',
        share_id: 's1',
      }
      const result = initCheckpoint(cp)
      expect(result.drive_id).toBe('d1')
      expect(result.file_id).toBe('f1')
      expect(result.parent_file_id).toBe('p1')
    })

    it('should handle formatCheckpoint preserving extra fields', () => {
      const cp = {
        loc_type: 'drive',
        loc_id: 'd1',
        file_key: 'f1',
        custom_field: 'value',
      }
      const result = formatCheckpoint(cp)
      expect(result.drive_id).toBe('d1')
      expect(result.file_id).toBe('f1')
    })

    it('should handle initCheckpoint with loc_type=drive and share_id', () => {
      const cp = {
        loc_type: 'drive',
        loc_id: 'd1',
        share_id: 's1',
      }
      const result = initCheckpoint(cp)
      expect(result.loc_type).toBe('drive')
      expect(result.drive_id).toBe('d1')
    })

    it('should convert file_key to file_id in initCheckpoint', () => {
      const cp = {
        drive_id: 'd1',
        file_key: 'key-123',
      }
      const result = initCheckpoint(cp)
      expect(result.file_id).toBe('key-123')
      expect(result.file_key).toBe('key-123')
    })

    it('should convert parent_file_key to parent_file_id', () => {
      const cp = {
        drive_id: 'd1',
        parent_file_key: 'parent-key',
      }
      const result = initCheckpoint(cp)
      expect(result.parent_file_id).toBe('parent-key')
      expect(result.parent_file_key).toBe('parent-key')
    })

    it('should handle formatCheckpoint without parent', () => {
      const cp = {
        loc_type: 'share',
        loc_id: 's1',
        file_key: 'f1',
      }
      const result = formatCheckpoint(cp)
      expect(result.parent_file_id).toBeUndefined()
    })
  })
})
