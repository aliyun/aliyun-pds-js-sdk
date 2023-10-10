import {initAxiosError} from '../../lib/utils/PDSError'

import {describe, expect, it} from 'vitest'

import Axios from 'axios'

describe('PDSError node', function () {
  describe('initAxiosError', () => {
    it('xml', async () => {
      let err
      try {
        await Axios.get('https://test.oss-cn-hangzhou.aliyuncs.com')
      } catch (e) {
        // console.log('-------->', e)
        err = e
      }

      let e = initAxiosError(err)

      expect(e.status).toBe(403)
      expect(e.code).toBe('AccessDenied')
      expect(e.message).toContain('Anonymous user has no right to')
    })
    it('text', async () => {
      let err
      try {
        await Axios.put('https://www.baidu.com')
      } catch (e) {
        err = e
      }

      let e = initAxiosError(err)

      expect(e.status).toBe(405)
      expect(e.code).toBe('ServerError')
      expect(e.message).toContain(err.response.data)
    })
  })
})
