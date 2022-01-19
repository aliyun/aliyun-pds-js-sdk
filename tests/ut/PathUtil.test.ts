/** @format */
import PathUtil = require('../../src/utils/PathUtil')
import assert = require('assert')

describe('PathUtil', function () {
  this.timeout(60 * 1000)

  it('assertPath', () => {
    try {
      PathUtil.assertPath(123)
      assert(false, 'should throw')
    } catch (e) {
      assert(e instanceof TypeError)
    }
  })

  it('basename', async () => {
    assert(PathUtil.basename('/a') == 'a')
    assert(PathUtil.basename('/a/b') == 'b')
    assert(PathUtil.basename('/a/b/') == 'b')
    assert(PathUtil.basename('/a/b/c') == 'c')
    assert(PathUtil.basename('/a/b/c/') == 'c')

    assert(PathUtil.basename('/') == '')
    assert(PathUtil.basename('.') == '.')
    assert(PathUtil.basename('./') == '.')
    assert(PathUtil.basename('..') == '..')
    assert(PathUtil.basename('') == '')

    assert(PathUtil.basename('/a/b/c.txt', '.txt') == 'c')
  })

  it('dirname', async () => {
    assert(PathUtil.dirname('/a/b') == '/a')
    assert(PathUtil.dirname('/a/b/') == '/a')
    assert(PathUtil.dirname('/a/b/c') == '/a/b')
    assert(PathUtil.dirname('/a/b/c/') == '/a/b')

    assert(PathUtil.dirname('/a') == '/')
    assert(PathUtil.dirname('') == '.')
    assert(PathUtil.dirname('/') == '/')
    assert(PathUtil.dirname('../a') == '..')
    assert(PathUtil.dirname('a') == '.')
  })
})
