const net = require('net')
const http = require('http')

module.exports = {
  getFreePort,
}

async function getFreePort() {
  for (let i = 1055; i < 50550; i++) {
    let isFree = (await isFreePort(i)) && (await isFreePortV2(i))
    if (isFree) return i
  }
  throw new Error('Not found available port')
}

function isFreePort(port) {
  return new Promise(resolve => {
    const server = net.createServer()

    server.on('listening', () => {
      server.close()
      resolve(true)
    })
    server.on('error', error => {
      console.log('[NetUtil] get freePortv1 err: ', error.message)
      resolve(false)
    })
    server.listen(port)
  })
}

// 使用get的方式去check端口是否启用
function isFreePortV2(port) {
  return new Promise(resolve => {
    http
      .get(`http://127.0.0.1:${port}`, () => {
        resolve(false)
      })
      .on('error', error => {
        console.error('[NetUtil] get freePortv2 err: ', error.message)
        resolve(true)
      })
  })
}
