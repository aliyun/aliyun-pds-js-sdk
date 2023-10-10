const {fork} = require('child_process')
const {app, ipcMain} = require('electron')
const {join} = require('path')
let port
module.exports = {
  createDataTransfer,
}

function createDataTransfer() {
  console.log('---------DataTransfer start---------')
  let child = fork(join(__dirname, './sub-server'), {
    stdio: 'inherit',
  })

  child.on('message', data => {
    if (data.type == 'ready') {
      port = data.port
    }
  })
  child.on('error', err => {
    console.error(err)
  })

  ipcMain.handle('getDTPort', () => {
    return port
  })
}
