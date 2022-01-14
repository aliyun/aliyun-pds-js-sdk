/** @format */

describe('HttpClient', function () {
  this.timeout(60 * 1000)
  const path_type = 'StandardMode'
  it('request', async () => {
    const {domain_id, drive_id} = window.Config['domains'][path_type]

    const client = await window.getHttpClient(path_type)

    let result = await client.postAPI('/file/list', {drive_id, parent_file_id: 'root'})
    console.log('/file/list:', result)
    window.assert(result.items.length > 0)
  })
})
