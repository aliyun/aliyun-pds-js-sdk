import {
  wasm_calc_file_crc64 as calc_file_crc64,
  wasm_calc_file_hash as calc_file_hash,
  wasm_calc_file_hash_parts as calc_file_hash_parts,
} from '../browser-wasm-hash'

self.addEventListener('message', async function (e) {
  try {
    if (['sha1', 'sha256'].includes(e.data.code)) {
      let res1 = await calc_file_hash(e.data.code, e.data.file, e.data.preSize, progress => {
        self.postMessage({sid: e.data.sid, code: 'progress', progress})
      })
      self.postMessage({sid: e.data.sid, code: 'result', result: res1})
    } else if (['sha1_parts', 'sha256_parts'].includes(e.data.code)) {
      const calc_type = e.data.code == 'sha1_parts' ? 'sha1' : 'sha256'
      let res2 = await calc_file_hash_parts(calc_type, e.data.file, e.data.parts, progress => {
        self.postMessage({sid: e.data.sid, code: 'progress', progress})
      })
      self.postMessage({sid: e.data.sid, code: 'result', result: res2})
    } else if ('crc64' == e.data.code) {
      let res3 = await calc_file_crc64(e.data.file, progress => {
        self.postMessage({sid: e.data.sid, code: 'progress', progress})
      })
      self.postMessage({sid: e.data.sid, code: 'result', result: res3})
    }
  } catch (err) {
    self.postMessage({sid: e.data.sid, code: 'error', message: err.message, error: err.stack})
  }
})
self.postMessage({code: 'ready'})
