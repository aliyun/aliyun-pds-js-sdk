/** @format */

class PDSError extends Error {
  message
  code
  status
  reqId
  stack
  type = 'ClientError'
  constructor(err, customCode, status, reqId) {
    let obj = initFields(err, customCode, status, reqId)
    let msg = err instanceof PDSError ? err.message : getMessage(obj)
    super(msg)
    Object.assign(this, obj)
    // this.message = msg
    this.name = err.name || 'PDSError'
    // this.origin = err
    this.stack = err.stack || new Error(err).stack
  }
}
// PDSError.prototype = Object.create(Error.prototype);

function getMessage(obj) {
  return `[${obj.type}]${obj.status ? '[' + obj.status + '] ' : ''}${obj.code}:${obj.message}${
    obj.reqId ? ' [requestId]:' + obj.reqId : ''
  }`
}

function initFields(err, code, status, reqId) {
  let obj = {}

  if (err && err.isAxiosError) {
    obj = initAxiosError(err)
  } else {
    obj.type = 'ClientError'
    obj.message = err.message || err || ''
    obj.code = code || (err ? err.code : 'ClientError') || 'ClientError'
    obj.status = status || err.status
    obj.reqId = reqId || err.reqId
  }
  obj.stack = err ? err.stack : ''
  return obj
}

function initAxiosError(err) {
  let obj = {}
  if (err.response != null) {
    obj.response = err.response
    obj.status = err.response.status
    obj.type = 'ServerError'
    obj.reqId = err.response.headers['X-Ca-Request-Id'] || err.response.headers['x-ca-request-id']

    if (err.response.data) {
      let contentType = err.response.headers['content-type']
      if (contentType.startsWith('application/json')) {
        obj.code = err.response.data.code
        obj.message = err.response.data.message
      } else if (
        contentType.startsWith('application/xml') &&
        typeof err.response.data == 'string' &&
        err.response.data.startsWith('<?xml')
      ) {
        let xml = parseErrorXML(err.response.data)
        obj.code = xml.code
        obj.message = xml.message
        if (xml.reqId) obj.reqId = xml.reqId
      } else {
        obj.code = 'ServerError'
        obj.message = err.response.data
      }
    } else {
      obj.code = err.response.headers['X-Ca-Error-Code'] || err.response.headers['x-ca-error-code'] || 'ServerError'
      obj.message =
        err.response.headers['X-Ca-Error-Message'] ||
        err.response.headers['x-ca-error-message'] ||
        JSON.stringify(err.response.data)
    }
  } else {
    obj.type = 'ClientError'
    obj.code = 'ClientError'
    obj.message = err.message
  }

  return obj
}

function parseErrorXML(str) {
  let code, message, reqId
  code = str.match(/<code>([^<]+)/i)[1]
  message = str.match(/<message>([^<]+)/i)[1]
  reqId = str.match(/<requestId>([^<]+)/i)[1]
  return {code, message, reqId}
}
export {PDSError, initAxiosError, initFields, getMessage, parseErrorXML}
