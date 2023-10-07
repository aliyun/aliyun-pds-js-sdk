function base64(s) {
  return btoa(unescape(encodeURIComponent(s)))
}
function debase64(s) {
  return decodeURIComponent(escape(atob(s)))
}

function base64Buffer(buf) {
  const bytes = new Uint8Array(buf)
  const str = bytes.map(n => String.fromCharCode(n)).join('')
  return window.btoa(str)
}
function debase64Buffer(str) {
  const b = window.atob(str)
  const len = b.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = b.charCodeAt(i)
  }
  return bytes.buffer
}
export {base64, debase64, base64Buffer, debase64Buffer}
