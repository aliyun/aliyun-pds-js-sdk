/** @format */
import LoadUtil = require('../../src/utils/LoadUtil')
import assert = require('assert')

describe('LoadUtil', function () {
  this.timeout(60 * 1000)

  it('formatToFixed', async () => {
    assert(LoadUtil.formatPercents(12.11234) == 12.11)
    assert(LoadUtil.formatPercents(12.11235) == 12.11)
  })

  it('calcUploadMaxConcurrency', () => {
    const M = 1024 * 1024
    assert(LoadUtil.calcUploadMaxConcurrency(1 * M, 5 * M, 3) == 3)
    assert(LoadUtil.calcUploadMaxConcurrency(1 * M, 3 * M, 2) == 2)
    assert(LoadUtil.calcUploadMaxConcurrency(4 * M, 3 * M, 3) == 5)
  })

  it('calcDownloadMaxConcurrency', () => {
    const M = 1024 * 1024
    assert(LoadUtil.calcDownloadMaxConcurrency(1 * M, 5 * M, 3) == 3)
    assert(LoadUtil.calcDownloadMaxConcurrency(1 * M, 3 * M, 2) == 2)
    assert(LoadUtil.calcDownloadMaxConcurrency(4 * M, 3 * M, 3) == 5)
  })

  describe('fixFileName4Windows', ()=>{
    it('fixFileName4Windows', () => {
      assert(LoadUtil.fixFileName4Windows('b\\:*?"<>|a.txt') == 'b\\_______a.txt')
    })
  
    it('fixFileName4Windows path', () => {
      assert(LoadUtil.fixFileName4Windows('D:\\s|an\\b/:*?"<>|a.txt') == 'D:\\s_an\\b\\_______a.txt')
    })
 
  })

  it('throttleInTimes', async () => {
    let c = 0
    let fn = LoadUtil.throttleInTimes(
      () => {
        console.log('---throttleInTimes----', ++c)
      },
      10,
      200,
    )

    for (let i = 0; i < 500; i++) fn()

    await new Promise(a => setTimeout(a, 500))
    assert(c == 3)
  })
})
