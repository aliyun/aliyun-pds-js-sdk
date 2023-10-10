const {dialog, getCurrentWindow} = process.type !== 'browser' ? require('@electron/remote') : require('electron')
const currentWindow = getCurrentWindow()

module.exports = {
  alert,
  confirm,
  openDialog,
  openDownloadDialog,
  openUploadDialog,
}
/////////////////////////////////
async function alert(message, title, {closeText} = {}) {
  const options = {
    type: 'warning',
    title: title,
    message: message,
    buttons: [closeText || '关闭'],
  }
  await dialog.showMessageBox(currentWindow, options)
  return true
}

async function confirm(message, title, {buttons} = {}) {
  const options = {
    type: 'warning',
    title: title || '警告',
    message: message,
    buttons: buttons || ['否', '是'],
  }
  let {response} = await dialog.showMessageBox(currentWindow, options)
  return response === 1 ? true : false
}

//*****  electron >= 8.x ***** */
function openDialog(options, fn) {
  if (typeof fn == 'function') {
    dialog.showOpenDialog(currentWindow, options).then(
      ({filePaths}) => fn(filePaths),
      () => fn(),
    )
  } else {
    return dialog.showOpenDialog(currentWindow, options)
  }
}

function openDownloadDialog(fn, {confirmText, title} = {}) {
  if (typeof fn == 'function') {
    dialog
      .showOpenDialog(currentWindow, {
        title: title || 'Download',
        buttonLabel: confirmText || 'Download',
        properties: ['openDirectory'],
      })
      .then(
        ({filePaths}) => fn(filePaths),
        () => fn(),
      )
  } else {
    return dialog.showOpenDialog(currentWindow, {
      title: title || 'Download',
      buttonLabel: confirmText || 'Download',
      properties: ['openDirectory'],
    })
  }
}

function openUploadDialog(type, fn, {confirmText, title} = {}) {
  const prop = {
    folder: ['openDirectory', 'multiSelections', 'treatPackageAsDirectory', 'showHiddenFiles'],
    file: ['openFile', 'multiSelections', 'treatPackageAsDirectory', 'showHiddenFiles'],
  }

  if (typeof fn == 'function') {
    dialog
      .showOpenDialog(currentWindow, {
        title: title || 'Upload',
        buttonLabel: confirmText || 'Upload',
        properties: prop[type],
      })
      .then(
        ({filePaths}) => fn(filePaths),
        () => fn(),
      )
  } else {
    return dialog.showOpenDialog(currentWindow, {
      title: title || 'Upload',
      buttonLabel: confirmText || 'Upload',
      properties: prop[type],
    })
  }
}
