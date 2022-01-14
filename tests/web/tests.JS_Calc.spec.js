/** @format */

describe('JS Calc', function () {
  this.timeout(600 * 1000)

  describe('calc str', function () {
    it('crc64 str', async () => {
      let result = await PDS_SDK.JS_CRC64.crc64('abc')
      console.log('============', result)
      assert(result == '3231342946509354535')
    })
    it('sha1 str', async () => {
      let result = await PDS_SDK.JS_SHA1.sha1('abc')
      console.log('============', result)
      assert(result == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
  })

  describe('file', function () {
    let file
    this.beforeAll(async function () {
      file = await getUploadFile('请选择文件，计算 crc64 & sha1')
      console.log('==>file:', file)
    })

    it('crc64 file', async () => {
      let st = Date.now()

      let result = await PDS_SDK.JS_CRC64.crc64File(
        file,
        prog => {
          // console.log('crc64',prog)
          showMessage('crc64', 'crc64:' + prog)
        },
        () => {},
      )
      showMessage('crc64', 'crc64:100%', result, Date.now() - st, 'ms')

      console.log('==>crc64 result:', result, Date.now() - st, 'ms')
    })
    it('sha1 file', async () => {
      let st = Date.now()

      let result = await PDS_SDK.JS_SHA1.calcSha1(file, null, prog => {
        // console.log('sha1',prog)
        showMessage('sha1', 'sha1:' + prog)
      })
      showMessage('sha1', 'sha1:100%', result, Date.now() - st, 'ms')

      console.log('==>sha1 result:', result, Date.now() - st, 'ms')
    })
  })
})
