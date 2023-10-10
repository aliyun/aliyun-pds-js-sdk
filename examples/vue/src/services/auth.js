import tokenStore from './token-store'
import {throttle} from 'lodash'
export async function getToken() {
  console.log('-----------call refresh_token_fun----------')
  let info = await fetch('/token').then(r => r.json())
  tokenStore.save(info)
  return info
}

export const getTokenThrottle = throttle(getToken, 300)
