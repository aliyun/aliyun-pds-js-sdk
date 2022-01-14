/** @format */

describe('api_drive', function () {
  this.timeout(600 * 1000)

  it('getDrive', async () => {
    const path_type = 'StandardMode'
    const {drive_id} = window.Config['domains'][path_type]

    const client = await window.getPDSClient(path_type)

    let driveInfo = await client.getDrive({drive_id})
    console.log('driveInfo:', driveInfo)

    window.assert(driveInfo.drive_id == drive_id)
  })
})
