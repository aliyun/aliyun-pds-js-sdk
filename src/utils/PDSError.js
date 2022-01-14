/** @format */

class PDSError extends Error {
  message
  code
  status
  reqId
  stack
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
  return `${obj.status ? '[' + obj.status + '] ' : ''}${obj.code}:${obj.message}${
    obj.reqId ? ' [requestId]:' + obj.reqId : ''
  }`
}

function initFields(err, code, status, reqId) {
  let obj = {}

  if (err && err.isAxiosError) {
    obj = initAxiosError(err)
  } else {
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

    obj.reqId = err.response.headers['X-Ca-Request-Id'] || err.response.headers['x-ca-request-id']

    if (err.response.data) {
      let contentType = err.response.headers['content-type']
      if (contentType.startsWith('application/json')) {
        obj.code = err.response.data.code
        obj.message = err.response.data.message
      } else {
        obj.code = 'ServerError'
        obj.message = err.response.data
      }
    } else {
      obj.code = 'ServerError'
      obj.message =
        err.response.headers['X-Ca-Error-Message'] ||
        err.response.headers['x-ca-error-message'] ||
        JSON.stringify(err.response.data)
    }
  } else {
    obj.code = 'ClientError'
    obj.message = err.message
  }

  return obj
}

export {PDSError, initAxiosError, initFields, getMessage}
