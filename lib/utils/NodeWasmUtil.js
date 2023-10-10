export {buffToPtr}

/* istanbul ignore next */
function buffToPtr(buff, binding) {
  if (typeof buff == 'string') {
    buff = Buffer.from(buff)
  }

  const buffPtr = binding._malloc(buff.length + 1)
  binding.writeArrayToMemory(buff, buffPtr)
  return buffPtr
}
