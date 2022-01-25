/** @format */

export {signJWT}

function signJWT(a, b, c) {
  if (typeof process) {
    const JWT = require('jsonwebtoken')
    return JWT.sign(a, b, c)
  } else {
    throw new Error('node.js only')
  }
}
