/** @format */
const {dialog, getCurrentWindow} = require('@electron/remote')
window.PDS_SDK = require('../..')
const currentWindow = getCurrentWindow()

window.ClientBridge = {
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
