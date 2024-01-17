import {
  PDSClient,
  PDSError,
  CalcUtil,
  ChunkUtil,
  Context as bContext,
} from '../../../../dist/browser/aliyun-pds-js-sdk.js'
import tokenStore from './token-store.js'
import {getTokenThrottle} from './auth.js'

let Context = bContext
window.CalcUtil = CalcUtil
window.PDSError = PDSError

// if (window.ClientBridge.Context) {
//   const {Context: nContext} = require('../../../../dist/node/node-pds.js')
//   Context = nContext
// }

function init() {
  try {
    const t = tokenStore.get()
    if (t?.access_token) {
      SDK.setToken(t)
    }
  } catch (e) {
    window.console.warn('Failed to set token.', e)
  }
}
let SDK = new PDSClient({
  api_endpoint: new URL(window.Global.api_endpoint).origin,
  refresh_token_fun: getTokenThrottle,
})

window.SDK = SDK
SDK.on('error', async (e, req_opt = {}) => {
  console.info(e, '[url]', req_opt)

  if (window.Global.DEBUG) {
    console.info('%c[SDK ERROR]', 'color:#f30; font-weight:bold', e.stack)
  }

  const {code, message, status} = e

  if (/AccessTokenInvalid/.test(code)) {
    window.console.error('token过期被删除，或者没有token')
    await getTokenThrottle()
    location.reload()
    return
  }
  // 用户被禁用，
  if (/TokenExpired/.test(code) && /UserNotEnabled/.test(message)) {
    window.Toast.error('用户被禁用')

    return
  }
  if (status === 403 && /UserRoleChanged/.test(message)) {
    window.Toast.error('用户角色切换')
    await getTokenThrottle()
    location.reload()
    return
  }
  if (code === 'Forbidden') {
    window.Toast.error('用户被禁用2')

    return
  }

  if (!(req_opt?.ignoreToast || req_opt?.data?.ignoreToast)) {
    // 网络错误
    if (message === 'Network Error' || message?.includes('getaddrinfo ENOTFOUND')) {
      window.Toast.error(window.$t('please_check_network'))
      window.console.error('网络错误')
      return
    }
    // fix: The resource file has already exists. file_id 62313c65f.....579acdd is already availabe
    if (status === 409 && message?.includes('is already availabe')) {
      // 不toast
      window.console.warn(message)
    } else if (status === 404) {
      if (/^NotFound/.test(code)) {
        window.Toast.error(e.message)
        // throttleToastError(e);
      } else {
        window.Toast.error(window.$t('unsupported_request'))
      }
    } else {
      if (message?.includes('token')) {
        // throttleToastError(e)
        window.Toast.error(e.message)
      }
    }
  }
})

init()

export {init, SDK, CalcUtil, ChunkUtil, Context}
