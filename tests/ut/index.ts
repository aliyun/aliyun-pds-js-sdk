/** @format */

import {rmSync, mkdirSync} from 'fs'
import {join} from 'path'

const p = join(__dirname, 'tmp')

function rmTmpData(p: string) {
  console.log('----清空测试数据-----', p)
  rmSync(p, {force: true, recursive: true})
  console.log('----清空测试数据 done-----')
}

rmTmpData(p)
mkdirSync(p, {recursive: true})
