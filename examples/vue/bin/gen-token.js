/** @format */

const {getSuperToken} = require('../../../tests/ft/token-util')
const fs = require('fs')
const {join} = require('path')

init()

async function init() {
  fs.copyFileSync(
    join(__dirname, '../../../dist/aliyun-pds-js-sdk.min.js'),
    join(__dirname, '../public/aliyun-pds-js-sdk.min.js'),
  )

  const tokenInfo = await getSuperToken('StandardMode')
  fs.writeFileSync(join(__dirname, '../public/StandardMode-token.json'), JSON.stringify(tokenInfo, ' ', 2))

  const tokenInfo2 = await getSuperToken('HostingMode')
  fs.writeFileSync(join(__dirname, '../public/HostingMode-token.json'), JSON.stringify(tokenInfo2, ' ', 2))
}
