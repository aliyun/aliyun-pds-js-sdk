/** @format */

import {readdirSync, unlinkSync, mkdirSync} from 'fs'
import {join} from 'path'
mkdirSync(join(__dirname, 'tmp'), {recursive: true})

function rmTmpData(p: string) {
  console.log('----清空测试数据-----', p)
  let arr = readdirSync(p)
  for (let n of arr) {
    if (n.startsWith('tmp-')) {
      unlinkSync(join(p, n))
    }
  }
  console.log('----清空测试数据 done-----')
}

rmTmpData(join(__dirname, 'tmp'))
