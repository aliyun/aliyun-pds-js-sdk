/** @format */

import * as Context from '../../src/context/NodeContext'
import FileUtil = require('../../src/utils/FileUtil')
import assert = require('assert')
import fs = require('fs')
import {join} from 'path'

describe('FileUtil', function () {
  this.timeout(60000)
  describe('getFreeDiskSize', () => {
    it('ok', async () => {
      let s = await FileUtil.getFreeDiskSize('/', Context)
      // console.log('--free size:',s)
      assert(!isNaN(s))
    })
  })

  describe('getFreeDiskSize_win', () => {
    it('网络挂载', async () => {
      let p = '\\\\Client\\$H\\Desktop'

      let x = await FileUtil.getFreeDiskSize_win(p, {})
      assert(x == Infinity)
    })
  })

  describe('_parse_free_size_windows', () => {
    it('parse success', async () => {
      // cd / && dir
      var str = `
 驱动器 C 中的卷是 OSDisk
 卷的序列号是 229B-0A9F

 C:\\Users\\zu 的目录

2021/11/22  20:47    <DIR>          .
2021/11/22  20:47    <DIR>          ..
2021/11/22  20:50    <DIR>          Desktop
2021/11/04  14:48    <DIR>          Documents
2021/11/22  17:12    <DIR>          Downloads
2021/09/07  08:43    <DIR>          Favorites
2021/09/15  17:40        50,101,024 Git-2.33.0.2-64-bit.exe
2021/09/07  08:43    <DIR>          Links
2021/09/07  08:43    <DIR>          Music
               5 个文件     52,209,323 字节
              28 个目录 59,933,294,592 可用字节

`

      let num = await FileUtil._parse_free_size_windows(str)
      assert(59933294592 === num)
    })
  })

  describe('_parse_free_size_unix', () => {
    it('parse success for mac', async () => {
      // df -hl
      var str = `
Filesystem       Size   Used  Avail Capacity iused      ifree %iused  Mounted on
/dev/disk3s1s1  460Gi   15Gi  187Gi     8%  575614 1957366400    0%   /
/dev/disk3s6    460Gi  7.0Gi  187Gi     4%       7 1957366400    0%   /System/Volumes/VM
/dev/disk3s2    460Gi  454Mi  187Gi     1%    1784 1957366400    0%   /System/Volumes/Preboot
/dev/disk3s4    460Gi  9.7Mi  187Gi     1%      50 1957366400    0%   /System/Volumes/Update
/dev/disk1s2    500Mi  6.0Mi  481Mi     2%       3    4928880    0%   /System/Volumes/xarts
/dev/disk1s1    500Mi  7.2Mi  481Mi     2%      26    4928880    0%   /System/Volumes/iSCPreboot
/dev/disk1s3    500Mi  676Ki  481Mi     1%      40    4928880    0%   /System/Volumes/Hardware
/dev/disk3s5    460Gi  251Gi  187Gi    58% 4902069 1957366400    0%   /System/Volumes/Data
/dev/disk4      278Mi  278Mi    0Bi   100%       0          0  100%   /Volumes/企业文件管理
`

      let num = await FileUtil._parse_free_size_unix(str, '/')
      // console.log(num)
      assert(200789721088 === num)
    })

    it('parse success for linux', async () => {
      // df -hl
      var str = `
文件系统        容量  已用  可用 已用% 挂载点
udev            3.9G     0  3.9G    0% /dev
tmpfs           787M  3.0M  784M    1% /run
/dev/sda3        99G   87G  7.4G   93% /
tmpfs           3.9G   14M  3.9G    1% /dev/shm
tmpfs           5.0M  4.0K  5.0M    1% /run/lock
tmpfs           3.9G     0  3.9G    0% /sys/fs/cgroup
tmpfs           787M   24K  787M    1% /run/user/1000
/dev/sda2       130G   67G   63G   52% /media/zuzu/OSDisk  
`

      let num = await FileUtil._parse_free_size_unix(str, '/')
      // console.log(num)
      assert(7945689497.6 === num)
    })
  })

  describe('parseSize', () => {
    it('test', () => {
      const m = {
        K: 1024,
        M: 1024 * 1024,
        G: 1024 * 1024 * 1024,
        T: 1024 * 1024 * 1024 * 1024,
        P: Math.pow(1024, 5),
        E: Math.pow(1024, 6),
        Z: Math.pow(1024, 7),
        Y: Math.pow(1024, 8),
      }
      assert(FileUtil.parseSize('6.0K') == 6 * m.K)
      assert(FileUtil.parseSize('3Mi') == 3 * m.M)
      assert(FileUtil.parseSize('3Gi') == 3 * m.G)
      assert(FileUtil.parseSize('2Ti') == 2 * m.T)
      assert(FileUtil.parseSize('4P') == 4 * m.P)
      assert(FileUtil.parseSize('5E') == 5 * m.E)
      assert(FileUtil.parseSize('1Z') == 1 * m.Z)
      assert(FileUtil.parseSize('2Y') == 2 * m.Y)
    })
  })

  describe('doesFileExist', () => {
    it('no error', async () => {
      let err = await FileUtil.doesFileExist({path: join(__dirname, 'index.ts')}, {fs, isNode: true})
      assert(!err)
    })
    it('has error', async () => {
      let err = await FileUtil.doesFileExist({path: 'abcccc'}, {fs, isNode: true})
      assert(err.message == 'A requested file or directory could not be found')
    })
  })
})
