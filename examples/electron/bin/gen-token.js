/** @format */
const {join} = require('path')
const {getSuperToken} = require(join(__dirname, '../../../tests/ft/token-util'))
const fs = require('fs')

init()

async function init() {
  const tokenInfo = await getSuperToken('StandardMode')
  fs.writeFileSync(join(__dirname, 'StandardMode-token.json'), JSON.stringify(tokenInfo, ' ', 2))

  const tokenInfo2 = await getSuperToken('HostingMode')
  fs.writeFileSync(join(__dirname, 'HostingMode-token.json'), JSON.stringify(tokenInfo2, ' ', 2))

  initData()
}

function initData() {
  const p = join(__dirname, 'tmp-electron-test.txt')
  fs.writeFileSync(p, 'abc')
}
