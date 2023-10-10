const {dialog, getCurrentWindow} = require('@electron/remote')
window.NODE_SDK = require('../..')
const currentWindow = getCurrentWindow()
// const {platform, AxiosNodeAdapter} = window.NODE_SDK.Context

// const Axios = require('axios')
// const os = require('os')
// const cp = require('child_process')
// const fs = require('fs')
// const path = require('path')
// const crypto = require('crypto')
// const http = require('http')
// const https = require('https')
const {DataTransfer} = require('./datatransfer/preload.js')
window.ClientBridge = {
  Context: {
    isNode: true,
    ...window.NODE_SDK.Context,
  },

  openDialog,

  DataTransfer,
}
function openDialog(options) {
  return dialog.showOpenDialog(currentWindow, options)
}
