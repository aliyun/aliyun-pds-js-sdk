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
})
