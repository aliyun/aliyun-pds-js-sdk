import {SDK} from './js-sdk'

export default {
  listMyDrives,
  get,
}

async function listMyDrives(opt) {
  console.log('----listMyDrives', opt)
  return await SDK.listMyDrives(opt)
}
async function get(opt) {
  console.log('----getDrive', opt)
  return await SDK.getDrive(opt)
}
