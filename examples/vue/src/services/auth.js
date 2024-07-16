import tokenStore from './token-store'
import {throttle} from 'lodash'
export async function getToken(user_id) {
  console.log('-----------call refresh_token_fun----------')
  let info = await fetch('/token', {
    method: 'POST',
    body: JSON.stringify({user_id}),
    headers: {'content-type': 'application/json'},
  }).then(r => r.json())
  tokenStore.save(info)
  return info
}

export const getTokenThrottle = throttle(getToken, 300)
