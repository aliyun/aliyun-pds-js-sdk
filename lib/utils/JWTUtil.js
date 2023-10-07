import {createSign} from 'crypto'

const algMap = {
  RS256: 'RSA-SHA256',
}

export {sign}

// node.js only
function sign(content, secret, algorithm = 'RS256') {
  if (!algMap[algorithm]) {
    throw new Error('Unsupported algorithm:' + algorithm)
  }
  let _header = json2Base64({alg: algorithm, typ: 'JWT'})
  let _content = json2Base64(content)
  let _sign = signContent([_header, _content].join('.'), secret, algMap[algorithm])
  return [_header, _content, _sign].join('.')
}
function signContent(content, secret, algorithm) {
  let r = createSign(algorithm).update(Buffer.from(content, 'utf-8')).sign(secret, 'base64')
  return base64urlEscape(r)
}
function json2Base64(content) {
  return base64urlEscape(Buffer.from(JSON.stringify(content)).toString('base64'))
}
function base64urlEscape(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
