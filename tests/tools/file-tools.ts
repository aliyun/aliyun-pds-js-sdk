import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'
import * as os from 'os'
const list = ['', 'K', 'M', 'G', 'T', 'P', 'E']

export async function writeFileContent(folderPath: string, name: string, content: string) {
  if (!fs.existsSync(folderPath)) await fs.promises.mkdir(folderPath, {recursive: true})
  let filePath = path.join(folderPath, name)

  if (fs.existsSync(filePath)) {
    await fs.promises.rm(filePath, {force: true})
  }
  await fs.promises.writeFile(filePath, content)
  const size = fs.statSync(filePath).size
  return {path: filePath, name, size}
}

export async function makeFile(folderPath: string, name: string, size: string) {
  if (!fs.existsSync(folderPath)) await fs.promises.mkdir(folderPath, {recursive: true})

  let cmd
  let filePath = path.join(folderPath, name)

  if (os.platform() == 'win32') {
    let bytes = parseSize(size) // 1G --> 1073741824
    cmd = `fsutil file createnew ${filePath} ${bytes}`
  } else {
    let fileSize = (size + '').replace(/(B*$)/i, '') // M1 版支持10B，Intel不支持: 10B
    cmd = `truncate -s ${fileSize} ${filePath}`
  }
  console.log(`[genFile]:${cmd}`)
  if (fs.existsSync(filePath)) {
    await fs.promises.rm(filePath, {force: true})
  }
  let result = cp.execSync(cmd)
  console.log(result)
  const realSize = fs.statSync(filePath).size

  return {path: filePath, size: realSize, name}
}

//  1G --> 1073741824
function parseSize(size: string) {
  const arr = size.match(/^(\d+)([E|P|T|G|M|K]?)/) as string[]
  if (arr.length != 3) throw new Error('Invalid size string')
  let ind = list.indexOf(arr[2])
  return parseInt(arr[1]) * Math.pow(1024, ind)
}
