import {describe, expect, it, vi} from 'vitest'
import {fetchOssPart, downloadLink} from '../../lib/loaders/WebDownloader'

describe('WebDownloader', function () {
  // describe('catchReadableStream', function () {
  //   it('resume', async () => {
  //     let mockErr = new Error('abort')
  //     mockErr.name = 'AbortError'
  //     let mockResumeFun

  //     let done = 0
  //     let mockPush = () => {
  //       done += 1
  //     }

  //     setTimeout(() => {
  //       mockResumeFun()
  //     }, 1000)

  //     await catchReadableStream(mockErr, a => (mockResumeFun = a), mockPush)

  //     expect(done).toBe(1)
  //   })

  //   it('network error', async () => {
  //     let mockErr = new Error('Network error')

  //     let done = await new Promise((a, b) => {
  //       catchReadableStream(
  //         mockErr,
  //         fn => {},
  //         () => a(1),
  //       )
  //     })

  //     expect(done).toBe(1)
  //   })

  //   it('others error', async () => {
  //     let mockErr = new Error('Others error')

  //     try {
  //       await new Promise((a, b) => {
  //         b(mockErr)
  //       }).catch(err => {
  //         return catchReadableStream(
  //           err,
  //           fn => {},
  //           () => {},
  //         )
  //       })
  //       expect(false).toBe('should throw')
  //     } catch (e) {
  //       expect(e.message).toBe('Others error')
  //     }
  //   })
  // })

  describe('fetchOssPart', () => {
    const normal_url = 'https://web-sv.aliyunpds.com/status'
    const expired_url =
      'https://pds-daily21453-hz-1634781451.oss-cn-hangzhou.aliyuncs.com/YqoEPtRP%2F1050%2F62a99f1e093a387b113f45ee9540612ffe832b96%2F62a99f1ee1fee0c640e54feeb3cfadbaae20097e?security-token=CAIS%2BgF1q6Ft5B2yfSjIr5b2CImFoLxl3K2hc033qEM%2FXsl6lpLepzz2IHpPfHdoBe0btvU%2BlWxX6fwZlq5rR4QAXlDfNRWtQxf1qFHPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41En1DIlt%2FXuk5DCtkqB12eXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLsUMSqv8q0fEcqGaW4o7CWQJLnzyCMvvJ9OVDFyN0aKEnH7J%2Bq%2FzxhTPrMnpkSlacGoABHu1dS3IX2erRZBfC%2BS3sL7CdzcUnAwEehlSy2QqLGj3UZKVklW67SDvunUdXKKlJd%2BdEtrzi5nZFuOxIMHDNlZyZgJ36JrP%2BnouHY7wOE3n%2BQBRnfq%2FZIdrCJ%2BT8lz0hj2Y5%2BGIrTPthPvzvPSho%2BD9uCG2km%2FJctkWMVv42YYkgAA%3D%3D&x-oss-access-key-id=STS.NUCC31McDkoJqkFLCjRFVyWuE&x-oss-expires=1703608794&x-oss-process=image%2Fresize%2Cm_fill%2Ch_128%2Cw_128%2Climit_0&x-oss-signature=KaedxVqVEGL%2FgBaRvXce1Xlnpc2tzM3LBt%2FuW9wrU30%3D&x-oss-signature-version=OSS2'
    const signature_error_url =
      'https://pds-daily21453-hz-1634781451.oss-cn-hangzhou.aliyuncs.com/YqoEPtRP%2F1050%2F62a99f1e093a387b113f45ee9540612ffe832b96%2F62a99f1ee1fee0c640e54feeb3cfadbaae20097e?security-token='

    it('normal url', async () => {
      let done = 0
      let mockGetUrl = () => {
        done += 1
        return normal_url
      }

      let res = await fetchOssPart(normal_url, {}, mockGetUrl)
      expect(res.ok).toBe(true)
      expect(done).toBe(0)
    })

    it('expired url', async () => {
      let done = 0
      let mockGetUrl = () => {
        done += 1
        return normal_url
      }

      let res = await fetchOssPart(expired_url, {}, mockGetUrl)
      expect(res.ok).toBe(true)
      expect(done).toBe(1)
    })

    it('have no right to access', async () => {
      let done = 0
      let mockGetUrl = () => {
        done += 1
        return normal_url
      }
      try {
        await fetchOssPart(signature_error_url, {}, mockGetUrl)
        expect(false).toBe('should throw')
      } catch (e) {
        expect(e.message).toContain('You have no right to access')
      }

      expect(done).toBe(0)
    })
  })

  describe('downloadLink', () => {
    it('blob', async () => {
      for (let i = 0; i < 10; i++) {
        let f = new File(['abc' + i], `a-${i}.txt`)
        let url = URL.createObjectURL(f.slice(0))
        downloadLink(url, `a-${i}.txt`)
      }
      await new Promise(a => setTimeout(a, 3000))
    })
  })
})
