/** @format */

import assert = require('assert')

import fs = require('fs')
import crypto = require('crypto')
import path = require('path')
import cp = require('child_process')

import {formatSize, elapse} from '../../src/utils/Formatter'
import JS_SHA1 = require('../../src/utils/JS_SHA1')
import {init_chunks_parallel} from '../../src/utils/ChunkUtil'

function genFile(file_path: string, size_MB: number) {
  let cmd = `dd if=/dev/zero of=${file_path} bs=1048576 count=${size_MB}`
  cp.execSync(cmd, {cwd: __dirname})
}

describe('JS_SHA1', function () {
  this.timeout(60 * 1000)

  describe('calcFilePartsSha1Node', () => {
    it('abc', async () => {
      // let p = join('/Users/zu/Downloads/Win10_1803_China_GGK_Chinese(Simplified)_x64.iso')

      let p = path.join(__dirname, 'tmp/tmp-sha1-test-abc.txt')

      if (!fs.existsSync(p)) fs.writeFileSync(p, 'abc')

      let file = {size: fs.statSync(p).size, path: p}

      let [parts, part_size] = init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
      // let parts = [
      //   {
      //     part_number: 1,
      //     part_size: 5242944,
      //     from: 0,
      //     to: 5242944
      //   },
      //   {
      //     part_number: 2,
      //     part_size: 4997056,
      //     from: 5242944,
      //     to: 10240000
      //   }]

      let start = Date.now()

      let result = await JS_SHA1.calcFilePartsSha1Node(file, parts, null, null, {fs, crypto})
      console.log(JSON.stringify(result, [' '], 2), Date.now() - start)
      assert(result.content_hash == 'A9993E364706816ABA3E25717850C26C9CD0D89D')

      let start2 = Date.now()
      let result2 = await JS_SHA1.calcFileSha1Node(file, null, null, null, {fs, crypto})
      console.log(result2, Date.now() - start2)

      assert(result2 == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
    it('10MB', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-file-10MB.data')
      genFile(p, 10) //10MB

      //let p = `/Users/zu/Documents/ubuntu-14.04.5-desktop-amd64+mac.iso`
      // if (!fs.existsSync(p)) fs.writeFileSync(p, 'abc')

      let file = {size: fs.statSync(p).size, path: p}

      console.log(`文件大小：${formatSize(file.size)} (${file.size}), path=${p}`)

      console.log('-------------并行计算 start------------------')
      let start = Date.now()
      let [parts, part_size] = init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
      console.log('分片:', parts.length, '每片大小:', formatSize(part_size))

      let result = await JS_SHA1.calcFilePartsSha1Node(
        file,
        parts,
        (prog: number) => {
          // console.log(prog)
        },
        null,
        {fs, crypto},
      )

      const content_hash = result.content_hash
      console.log(`结果：${result.content_hash} 耗时：${elapse(Date.now() - start)}`)
      console.log('-------------并行计算 end------------------')

      console.log('-------------串行计算 start------------------')
      let start2 = Date.now()
      let result2 = await JS_SHA1.calcFileSha1Node(file, null, null, null, {fs, crypto})
      console.log(`结果：${result2} 耗时：${elapse(Date.now() - start2)}`)
      console.log('-------------串行计算 end------------------')

      assert(content_hash == result2)
    })

    it('stop', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-test-stop.txt')

      if (!fs.existsSync(p)) fs.writeFileSync(p, 'abc')

      let file = {size: fs.statSync(p).size, path: p}

      console.log(`文件大小：${formatSize(file.size)} (${file.size}), path=${p}`)
      let start = Date.now()
      let [parts, part_size] = init_chunks_parallel(file.size, [], 5 * 1024 * 1024)
      console.log('分片:', parts.length, '每片大小:', formatSize(part_size))

      try {
        await JS_SHA1.calcFilePartsSha1Node(
          file,
          parts,
          (prog: number) => {
            // console.log(prog)
          },
          () => {
            return true
          },
          {fs, crypto},
        )
        assert(false, 'should throw error')
      } catch (e) {
        assert(e.message == 'stopped')
      }
    })
  })
  describe('calcFileSha1Node', () => {
    it('ok', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-test-range.txt')

      if (!fs.existsSync(p)) fs.writeFileSync(p, 'abcdef123456')

      let file = {size: fs.statSync(p).size, path: p}

      let result = await JS_SHA1.calcFileSha1Node(file, null, null, null, {fs, crypto, highWaterMark: 3})

      assert(result == '6740D1ECB48C5C9CA3B2A3CB1CA2F4B4D4487473')
    })
    it('part size', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-test-range.txt')

      if (!fs.existsSync(p)) fs.writeFileSync(p, 'abcdef123456')

      let file = {size: fs.statSync(p).size, path: p}

      let result = await JS_SHA1.calcFileSha1Node(file, 3, null, null, {fs, crypto, highWaterMark: 3})

      assert(result == 'A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
    it('stop', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-test-stop.txt')

      if (!fs.existsSync(p)) fs.writeFileSync(p, 'abc')

      let file = {size: fs.statSync(p).size, path: p}
      try {
        await JS_SHA1.calcFileSha1Node(file, null, null, () => true, {fs, crypto})

        assert(false, 'should throw error')
      } catch (e) {
        assert(e.message == 'stopped')
      }
    })
    it('error', async () => {
      let p = path.join(__dirname, 'tmp/tmp-sha1-test-error.txt')

      if (!fs.existsSync(p)) fs.writeFileSync(p, 'abc')

      let file = {size: fs.statSync(p).size, path: p}
      try {
        await JS_SHA1.calcFileSha1Node(file, null, null, () => true, {fs, crypto})

        assert(false, 'should throw error')
      } catch (e) {
        assert(e.message == 'stopped')
      }
    })
  })
})
