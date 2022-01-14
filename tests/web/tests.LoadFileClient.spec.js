/** @format */

async function uploadFile(file, path_type, config) {
  const {drive_id} = window.Config['domains'][path_type]
  const client = await window.getPDSClient(path_type)

  let params = path_type == 'StandardMode' ? {drive_id, parent_file_id: 'root'} : {drive_id, parent_file_path: '/'}
  let task
  return await client.uploadFile(file, params, {
    verbose: true,
    ...config,
    // chunk_con_auto: true, // 自动调整分片并发数、
    onReady(ins) {
      task = ins
      // console.log('------set_calc_max_con', task)
    },
    onProgress(status, prog) {
      // console.log(status, prog, task.speed/1024/1024)
    },
    onStateChange(cp, state, error) {
      console.log('=====state:', state)
    },
  })
}

describe('LoadFileClient', function () {
  this.timeout(600 * 1000)
  let file
  this.beforeAll(async () => {
    file = await window.getUploadFile('测试上传文件')
  })

  const assert = window.assert

  it('StandardMode upload parallel', async () => {
    const path_type = 'StandardMode'
    let cp = await uploadFile(file, path_type, {ignore_rapid: true, parallel_upload: true})
    console.log(cp)
    assert(cp.state == 'success')
  })

  it('StandardMode upload parallel rapid', async () => {
    const path_type = 'StandardMode'
    let cp = await uploadFile(file, path_type, {ignore_rapid: false, parallel_upload: true})
    console.log(cp)
    assert(cp.state == 'rapid_success')
  })

  it('StandardMode upload serial', async () => {
    const path_type = 'StandardMode'
    let cp = await uploadFile(file, path_type, {ignore_rapid: true, parallel_upload: false})
    console.log(cp)
    assert(cp.state == 'success')
  })
  it('StandardMode upload rapid', async () => {
    const path_type = 'StandardMode'
    let cp = await uploadFile(file, path_type, {ignore_rapid: false, parallel_upload: false})
    console.log(cp)
    assert(cp.state == 'rapid_success')
  })

  it('HostingMode upload', async () => {
    const path_type = 'HostingMode'
    let cp = await uploadFile(file, path_type, {})
    console.log(cp)
    assert(cp.state == 'success')
  })
})
