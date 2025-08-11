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
if (name === 'aliyun-pds-js-sdk') {
  pkg.publishConfig.registry = 'https://registry.npmjs.org'
  pkg.repository = 'git@github.com:aliyun/aliyun-pds-js-sdk.git'
}else{
  pkg.publishConfig.registry = 'https://registry.anpm.alibaba-inc.com'
  pkg.repository = 'git@gitlab.alibaba-inc.com:pds-next/pds-js-sdk.git'
}
writeFileSync('./package.json', JSON.stringify(pkg, ' ', 2))
