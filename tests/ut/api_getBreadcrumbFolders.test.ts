/** @format */

import assert = require('assert')
import sinon = require('sinon')
import {PDSFileAPIClient} from '../../src/client/api_file'
import {Axios} from 'axios'
import {PDSError} from '../../src/utils/PDSError'
describe('api_file', function () {
  const client = new PDSFileAPIClient({api_endpoint: 'https://', auth_endpoint: 'https://'}, {isNode: false, Axios})
  afterEach(() => {
    sinon.restore()
  })
  describe('getBreadcrumbFolders()', function () {
    it('404', async () => {
      sinon.stub(client, 'getFile').callsFake(async function () {
        throw new PDSError('not found file', 'NotFound', 404)
      })
      const result = await client.getBreadcrumbFolders('1', '2')
      assert(result.length == 0)
    })
    it('403', async () => {
      sinon.stub(client, 'getFile').callsFake(async function () {
        throw new PDSError('No permission', 'Forbidden', 403)
      })
      const result = await client.getBreadcrumbFolders('1', '2')
      assert(result.length == 1)
      assert(result[0].is_forbidden)
      assert(result[0].name === 'Forbidden')
      assert(result[0].file_id === '2')
    })
    it('500', async () => {
      sinon.stub(client, 'getFile').callsFake(async function () {
        throw new PDSError('error', 'InternalError', 500)
      })
      try {
        await client.getBreadcrumbFolders('1', '2')
        assert(false, 'should throw')
      } catch (e) {
        assert(e.code === 'InternalError')
      }
    })
    it('ok & cache', async () => {
      sinon.stub(client, 'getFile').callsFake(async function () {
        return {
          name: 'test',
          file_id: '2',
          parent_file_id: 'root',
        }
      })
      const result = await client.getBreadcrumbFolders('1', '2')
      // console.log(result)
      assert(result.length == 1)
      assert(!result[0].is_forbidden)
      assert(result[0].name === 'test')
      assert(result[0].file_id === '2')

      // use cache
      const result2 = await client.getBreadcrumbFolders('1', '2')
      // console.log(result)
      assert(result2.length == 1)
      assert(!result2[0].is_forbidden)
      assert(result2[0].name === 'test')
      assert(result2[0].file_id === '2')
    })
  })
})
