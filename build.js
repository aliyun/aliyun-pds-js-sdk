// node.js>=16.15.0 以上支持 assert 语法
import pkg from './package.json' with {type: 'json'}
import {writeFileSync} from 'fs'

const name = process.env.PKG_NAME || 'aliyun-pds-js-sdk'

const info = {
  version: pkg.version,
  name: name,
}

const content = `export default ${JSON.stringify(info, ' ', 2)}`
writeFileSync('./lib/pkg.ts', content)

pkg.name = name
if (name === 'aliyun-pds-js-sdk') pkg.publishConfig.registry = 'https://registry.npmjs.org/'
writeFileSync('./package.json', JSON.stringify(pkg, ' ', 2))
