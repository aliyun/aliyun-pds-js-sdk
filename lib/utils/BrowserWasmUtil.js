export {
  buffToPtr,
  //for test
  stringToUint8Array,
}
/* istanbul ignore next */
function buffToPtr(buff, binding) {
  // eslint-disable-next-line no-unsafe-negation
  if (!buff.buffer || !buff.buffer instanceof ArrayBuffer) {
    if (typeof buff == 'string') {
      buff = stringToUint8Array(buff)
    } else {
      throw new Error('Invalid buffer type.')
    }
  }

  const buffPtr = binding._malloc(buff.length + 1)
  binding.writeArrayToMemory(buff, buffPtr)
  return buffPtr
}
/* istanbul ignore next */
function stringToUint8Array(str) {
  var arr = []
  for (var i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i))
  }

  var tmpUint8Array = new Uint8Array(arr)
  return tmpUint8Array
}
