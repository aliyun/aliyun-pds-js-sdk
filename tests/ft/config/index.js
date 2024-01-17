import {join, dirname} from 'path'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'

// es 没有 __filename 全局变量，需要模拟
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let Config
if (process.env.IT_CONFIG) {
  console.log('Found IT_CONFIG')
  try {
    Config = JSON.parse(Buffer.from(process.env.IT_CONFIG, 'base64').toString())
  } catch (err) {
    console.error('parse env IT_CONFIG error', err)
  }
} else {
  const config_path = join(__dirname, 'conf.json')
  Config = JSON.parse(readFileSync(config_path).toString())
}

export default Config
