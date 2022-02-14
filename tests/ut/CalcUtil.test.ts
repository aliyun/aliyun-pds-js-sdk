/** @format */

import {calcFileSha1, calcFilePartsSha1, calcFileCrc64} from '../../lib/cjs/utils/CalcUtil'

import fs = require('fs')
import cp = require('child_process')
import path = require('path')
import * as Context from '../../src/context/NodeContext'

import {formatSize} from '../../src/utils/Formatter'
import {init_chunks_parallel} from '../../src/utils/ChunkUtil'

import assert = require('assert')

function genFile(file_path: string, size_MB: number) {
  let cmd = `dd if=/dev/zero of=${file_path} bs=1048576 count=${size_MB}`
  cp.execSync(cmd, {cwd: __dirname})
}

describe('CalcUtil', function () {
  this.timeout(600 * 1000)

  describe('calcFileSha1', () => {
    it('calcFileSha1Process', async () => {
      let p = path.join(__dirname, 'tmp/tmp-calc-sha1-test.txt')

      fs.writeFileSync(p, 'abc')
      let prog1 = 0
      let result = await calcFileSha1({
        file: null,
        file_path: p,
        pre_size: 0,
        process_calc_sha1_size: 2,
        onProgress: prog => {
          prog1 = prog
        },
        getStopFlagFun: () => false,
        context: Context,
      })
      assert(prog1 == 100)

      assert(result == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })

    it('calcFileSha1', async () => {
      let p = path.join(__dirname, 'tmp/tmp-calc-sha1-test.txt')

      fs.writeFileSync(p, 'abc')

      let prog1 = 0
      let result = await calcFileSha1({
        file: null,
        file_path: p,
        pre_size: 0,
        process_calc_sha1_size: 10,
        onProgress: prog => {
          prog1 = prog
        },
        getStopFlagFun: () => false,
        context: Context,
      })
      assert(prog1 == 100)

      assert(result == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
  })

  describe('calcFilePartsSha1', () => {
    it('calcFilePartsSha1Process', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-file-10MB.data')
      genFile(p, 10) //10MB

      let file = {size: fs.statSync(p).size, path: p}

      console.log(`文件大小：${formatSize(file.size)} (${file.size}), path=${p}`)

      console.log('-------------并行计算 start------------------')
      let start = Date.now()
      let [parts, part_size] = init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
      console.log('分片:', parts.length, '每片大小:', formatSize(part_size))

      let prog1 = 0
      let result = await calcFilePartsSha1({
        file: null,
        file_path: p,
        part_info_list: parts,
        process_calc_sha1_size: 2,
        onProgress: prog => {
          prog1 = prog
        },
        getStopFlagFun: () => false,
        context: Context,
      })
      assert(prog1 == 100)
      assert(result.content_hash == '8C206A1A87599F532CE68675536F0B1546900D7A')
    })
    it('calcFilePartsSha1', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-file-10MB.data')
      genFile(p, 10) //10MB

      let file = {size: fs.statSync(p).size, path: p}

      console.log(`文件大小：${formatSize(file.size)} (${file.size}), path=${p}`)

      console.log('-------------并行计算 start------------------')
      let start = Date.now()
      let [parts, part_size] = init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
      console.log('分片:', parts.length, '每片大小:', formatSize(part_size))
      let prog1 = 0
      let result = await calcFilePartsSha1({
        file: null,
        file_path: p,
        part_info_list: parts,
        process_calc_sha1_size: 100 * 1024 * 1024,
        onProgress: prog => {
          prog1 = prog
        },
        getStopFlagFun: () => false,
        context: Context,
      })
      assert(prog1 == 100)

      assert(result.content_hash == '8C206A1A87599F532CE68675536F0B1546900D7A')
    })
  })
  describe('calcFileCrc64', () => {
    it('calcFileCrc64Process', async () => {
      let p = path.join(__dirname, 'tmp/tmp-calc-crc64-test.txt')

      fs.writeFileSync(p, 'abc')
      let prog1 = 0
      let result = await calcFileCrc64({
        file: null,
        file_path: p,
        process_calc_crc64_size: 10,
        onProgress: prog => {
          prog1 = prog
        },
        getStopFlagFun: () => false,
        context: Context,
      })
      assert(prog1 == 100)

      assert(result == '3231342946509354535')
    })
    it('calcFileCrc64', async () => {
      let p = path.join(__dirname, 'tmp/tmp-calc-crc64-test.txt')

      fs.writeFileSync(p, 'abc')

      let prog1 = 0
      let result = await calcFileCrc64({
        file: null,
        file_path: p,
        process_calc_crc64_size: 2,
        onProgress: prog => {
          prog1 = prog
        },
        getStopFlagFun: () => false,
        context: Context,
      })
      assert(prog1 == 100)

      assert(result == '3231342946509354535')
    })
  })
})
