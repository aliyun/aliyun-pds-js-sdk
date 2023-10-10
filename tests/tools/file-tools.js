import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'
import * as os from 'os'
const list = ['', 'K', 'M', 'G', 'T', 'P', 'E']

export async function makeFile(folderPath, name, size) {
  let cmd
  let filePath = path.join(folderPath, name)
  if (os.platform == 'win32') {
    let bytes = parseSize(size) // 1G --> 1073741824
    cmd = `fsutil file createnew ${filePath} ${bytes}`
  } else {
    size = (size + '').replace(/(B*$)/i, '') // M1 版支持10B，Intel不支持: 10B
    cmd = `truncate -s ${size} ${filePath}`
  }
  console.log(`[genFile]:${cmd}`)
  if (fs.existsSync(filePath)) {
    await fs.promises.rm(filePath, {force: true})
  }
  let {stdout, stderr} = cp.execSync(cmd)
  console.log(stderr || stdout)
  return filePath
}

//  1G --> 1073741824
function parseSize(size) {
  let arr = size.match(/^(\d+)([E|P|T|G|M|K]?)/)
  if (arr.length != 3) throw new Error('Invalid size string')
  let ind = list.indexOf(arr[2])
  return parseInt(arr[1]) * Math.pow(1024, ind)
}
