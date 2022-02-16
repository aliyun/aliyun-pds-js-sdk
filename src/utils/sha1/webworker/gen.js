/** @format */

export {createSha1WebWorkerBlob}
/* istanbul ignore next */
function createSha1WebWorkerBlob() {
  let str = `$replace$`
  let blob = new Blob([str], {type: 'text/javascript'})
  return window.URL.createObjectURL(blob)
}
