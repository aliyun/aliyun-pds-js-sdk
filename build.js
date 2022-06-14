/** @format */

const pkg = require('./package.json')
const fs = require('fs')
const info = {
  version: pkg.version,
  name: pkg.name,
}

const content = `/** @format */

export default ${JSON.stringify(info, ' ', 2)}
`
fs.writeFileSync('./src/pkg.ts', content)
