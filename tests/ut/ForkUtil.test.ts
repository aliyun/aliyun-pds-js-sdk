/** @format */

import {nodeProcessCalc} from '../../src/utils/ForkUtil'
import assert = require('assert')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const FORK_JS = path.join(__dirname, 'tmp/tmp-node-fork.js')

describe('ForkUtil', function () {
  this.timeout(60 * 1000)
  describe('nodeProcessCalc', () => {
    it('ok', async () => {
      let onProgress = prog => {
        console.log('--------prog', prog)
      }
      let getStopFlag = () => false

      let file_path = path.join(__dirname, 'tmp/tmp-dir', 'abc-123456/'.repeat(10), 'abc.js')
      // let file_path = path.join(__dirname, 'tmp/tmp-dir', 'abc-123456/'.repeat(80), 'abc.js')

      let dir_path = path.dirname(file_path)

      fs.mkdirSync(dir_path, {recursive: true, mode: 0o777})

      fs.writeFileSync(file_path, 'abc')

      const script = `
let params
process.on('message',data=>{
  switch(data.type){
    case 'params':
      params = data.params
      
      process.send({
        type: 'result',
        result: {
          test: 123,
          params
        }
      })

      break;
    case 'end':
      process.exit(0)   
  }
})
process.send({type:'ready'})
`
      fs.writeFileSync(FORK_JS, script)

      let size = fs.statSync(file_path).size

      let params = {
        file_path,
        size,
        progress_emit_step: 0.2,
        m: {},
      }
      const LEN = 20000
      // params 伪造大量数据。 验证已修复 Error: ENAMETOOLONG
      for (let i = 0; i < LEN; i++) {
        params.m['aaaaa-' + i] = Math.random()
      }

      let s = await nodeProcessCalc(FORK_JS, params, onProgress, getStopFlag, {cp})
      assert(s.test === 123)
      assert(s.params.file_path === file_path)
      assert(s.params.size === size)
      assert(Object.keys(s.params.m).length === LEN)
    })
  })
})
