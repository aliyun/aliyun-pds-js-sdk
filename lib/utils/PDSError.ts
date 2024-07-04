import {AxiosError} from 'axios'
import {IPDSRequestConfig, IPDSResponse} from '../Types'

interface IPDSError {
  message: string
  code?: string
  status?: number
  reqId?: string
  type?: string
  stack?: string
  requestConfig?: IPDSRequestConfig
  response?: IPDSResponse
}

class PDSError extends Error implements IPDSError {
  name: string = 'PDSError'
  message: string = ''
  code?: string
  status?: number
  reqId?: string
  type: string = 'ClientError'
  requestConfig?: IPDSRequestConfig
  response?: IPDSResponse
  constructor(
    err: IPDSError | PDSError | AxiosError | Error | string,
    customCode?: string,
    status?: number,
    reqId?: string,
  ) {
    // let initErr = typeof err == 'string' ? err : err
    let obj: IPDSError = initFields(err, customCode, status, reqId)
    let msg: string = obj.message
    super(msg)
    this.name = 'PDSError'
    // make instanceof effact:  assert(e instanceof PDSError)
    Object.setPrototypeOf(this, PDSError.prototype)
    Object.assign(this, obj)
  }
}

function initFields(
  err: IPDSError | PDSError | AxiosError | Error | string,
  code?: string,
  status?: number,
  reqId?: string,
): IPDSError {
  let obj: IPDSError = {message: ''}

  if (err instanceof PDSError) {
    // Object.assign(obj, err)
    // return obj
    obj.message = err.message
    obj.code = code || err.code
    obj.status = status || err.status
    obj.reqId = reqId || err.reqId
    obj.type = err.type || 'ClientError'

    obj.requestConfig = initRequestConfig(err.requestConfig)
    obj.response = initResponse(err.response)
    return obj
  }
  if ((err as AxiosError)?.isAxiosError) {
    obj = initAxiosError(err as AxiosError)
    if (code) obj.code = code
    if (status) obj.status = status
    if (reqId) obj.reqId = reqId
  } else if (typeof err === 'string') {
    obj.type = 'ClientError'
    obj.message = err
    obj.code = code || 'ClientError'
    obj.status = status
    obj.reqId = reqId
  } else if (err instanceof Error || (err as IPDSError)?.message) {
    obj.type = 'ClientError'
    obj.message = err.message
    obj.code = code || (err as IPDSError)?.code || 'ClientError'
    obj.status = (err as IPDSError)?.status || status
    obj.reqId = (err as IPDSError)?.reqId || reqId
  }

  // refactor: console.log(err) 展示 status 和 reqId 等必要信息
  if (obj.status) obj.message += ` [status: ${obj.status}]`
  if (obj.code) obj.message += ` [code: ${obj.code}]`
  if (obj.reqId) obj.message += ` [reqId: ${obj.reqId}]`

  return obj
}

function initAxiosError(err: AxiosError): IPDSError {
  let obj: IPDSError = {
    message: '',
  }

  if (err.response != null) {
    obj.requestConfig = initRequestConfig(err.config)
    obj.response = initResponse(err.response)
    obj.status = err.response.status
    obj.type = 'ServerError'
    obj.reqId = err.response.headers['x-ca-request-id']

    if (err.response.data) {
      let contentType = err.response.headers['content-type'] || ''

      if (contentType.startsWith('application/json')) {
        let info = err.response.data as {code?: string; message?: string}
        obj.code = info?.code || ''
        obj.message = info?.message || ''
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
        obj.message = parseErrorData(err.response?.data)
      }
    } else {
      obj.code = err.response.headers['x-ca-error-code'] || 'ServerError'
      obj.message = err.response.headers['x-ca-error-message'] || JSON.stringify(err.response.data)
    }
  } else {
    obj.type = 'ClientError'
    obj.code = 'ClientError'
    obj.message = err.message
  }
  return obj
}
function initRequestConfig(config) {
  if (!config) return undefined
  let {method, url, data, params, headers, responseType} = config || {}
  return {
    method,
    url,
    data,
    params,
    headers,
    responseType,
  } as IPDSRequestConfig
}
function initResponse(res) {
  if (!res) return undefined
  let {data, headers, statusText, status: _status} = res || {}
  return {data, headers, statusText, status: _status} as IPDSResponse
}

function parseErrorData(data) {
  switch (typeof data) {
    case 'string':
      return data

    case 'object':
      return JSON.stringify(data)

    default:
      return data + ''
  }
}
function parseErrorXML(str: string): {code?: string; message: string; reqId?: string} {
  let code, message, reqId
  code = str.match(/<code>([^<]+)/i)?.[1]
  message = str.match(/<message>([^<]+)/i)?.[1] || ''
  reqId = str.match(/<requestId>([^<]+)/i)?.[1]
  return {code, message, reqId}
}
export type {IPDSError}
export {PDSError, initAxiosError, initFields, parseErrorXML, parseErrorData}
