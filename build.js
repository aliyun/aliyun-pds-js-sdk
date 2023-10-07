// node.js>=16.15.0 以上支持 assert 语法
import  pkg from './package.json' assert { type: 'json' };
import {writeFileSync} from 'fs'
const info = {
  version: pkg.version,
  name: pkg.name,
}

const content = `export default ${JSON.stringify(info, ' ', 2)}`
writeFileSync('./lib/pkg.ts', content)
