/** @format */
const {dialog, getCurrentWindow} = require('@electron/remote')
window.PDS_SDK = require('../..')
const currentWindow = getCurrentWindow()
// const {platform, AxiosNodeAdapter} = window.PDS_SDK.Context

// const Axios = require('axios')
// const os = require('os')
// const cp = require('child_process')
// const fs = require('fs')
// const path = require('path')
// const crypto = require('crypto')
// const http = require('http')
// const https = require('https')

window.ClientBridge = {
  // Context: {
  //   isNode: true,
  //   Axios,
  //   platform,
  //   os,
  //   fs,
  //   path,
  //   cp,
  //   http,
  //   https,
  //   crypto,
  //   AxiosNodeAdapter,
  // },
  openUploadDialog,
}

function openUploadDialog(type) {
  const prop = {
    folder: ['openDirectory', 'multiSelections', 'treatPackageAsDirectory', 'showHiddenFiles'],
    file: ['openFile', 'multiSelections', 'treatPackageAsDirectory', 'showHiddenFiles'],
  }

  return dialog.showOpenDialog(currentWindow, {
    title: 'Upload',
    buttonLabel: 'Upload',
    properties: prop[type],
  })
}
