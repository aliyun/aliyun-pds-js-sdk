import * as fs from 'fs'
import * as path from 'path'
import * as NodeContext from '../../lib/context/NodeContext'
import {delay} from '../../lib/utils/HttpUtil'
import {beforeAll, describe, expect, it} from 'vitest'
import {
  calc_sha1,
  calc_sha256,
  calc_crc64,
  calc_file_sha1,
  calc_file_sha256,
  calc_file_crc64,
  calc_file_parts_sha256,
  calc_file_parts_sha1,
  _parse_free_size_unix,
  _parse_free_size_windows,
} from '../../lib/context/NodeFileUtil'
import {init_chunks_sha} from '../../lib/utils/ChunkUtil'

describe('src/context/NodeFileUtil', () => {
  beforeAll(async () => {
    // 等待，防止wasm未初始化 calcCrc64 报错
    await delay(500)
  })

  describe('calc_crc64', () => {
    it('calc_crc64', () => {
      expect(calc_crc64('abc', '0')).toBe('3231342946509354535')
      expect(calc_crc64('中文')).toBe('16371802884590399230')
    })
  })

  describe('calc_sha1', () => {
    it('calc_sha1', () => {
      expect(calc_sha1('abc')).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
      expect(calc_sha1('中文')).toBe('7BE2D2D20C106EEE0836C9BC2B939890A78E8FB3')
    })
  })
  describe('calc_sha256', () => {
    it('calc_sha256', () => {
      expect(calc_sha256('abc')).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD')
      expect(calc_sha256('中文')).toBe('72726D8818F693066CEB69AFA364218B692E62EA92B385782363780F47529C21')
    })
  })

  describe('calc_file_sha1', () => {
    it('calc_file_sha1', async () => {
      // 生成测试文件
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_sha1.txt')
      fs.writeFileSync(p1, 'abc')

      let prog = 0
      let result = await calc_file_sha1(
        p1,
        0,
        p => {
          prog = p
          console.log(p)
        },
        () => false,
        NodeContext,
      )
      expect(fs.statSync(p1).size).toBe(3)
      expect(result).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
      expect(prog).toBe(100)

      // 删除
      fs.unlinkSync(p1)
    })
    it('calc_file_sha1 0-2', async () => {
      // 生成测试文件
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_sha1.txt')
      fs.writeFileSync(p1, 'abc')

      let prog = 0
      let result = await calc_file_sha1(
        p1,
        2,
        p => {
          prog = p
          console.log(p)
        },
        () => false,
        NodeContext,
      )
      expect(fs.statSync(p1).size).toBe(3)
      expect(result).toBe('DA23614E02469A0D7C7BD1BDAB5C9C474B1904DC')
      expect(prog).toBe(100)

      // 删除
      fs.unlinkSync(p1)
    })

    it('progress throw error, still ok', async () => {
      // 生成测试文件
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_sha1.txt')
      fs.writeFileSync(p1, 'abc')

      let prog = 0
      let result = await calc_file_sha1(
        p1,
        0,
        p => {
          prog = p
          throw new Error('test err')
        },
        () => false,
        NodeContext,
      )
      expect(fs.statSync(p1).size).toBe(3)
      expect(result).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
      expect(prog).toBe(100)

      // 删除
      fs.unlinkSync(p1)
    })
  })

  describe('calc_file_parts_sha1', () => {
    it('empty file', async () => {
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_parts_sha1-empty.txt')
      fs.writeFileSync(p1, '')
      let [part_info_list, chunk_size] = init_chunks_sha(fs.statSync(p1).size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(1)
      expect(part_info_list[0]).toEqual({part_number: 1, part_size: 0, from: 0, to: 0})

      expect(chunk_size).toBe(64)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha1(
        p1,
        part_info_list,
        pp => {
          prog = pp
        },
        () => false,
        NodeContext,
      )

      expect(content_hash).toBe('DA39A3EE5E6B4B0D3255BFEF95601890AFD80709')
      expect(content_hash_name).toBe('sha1')
      expect(prog).toBe(100)

      fs.unlinkSync(p1)
    })
    it('calc_file_parts_sha1', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_parts_sha1.txt')
      fs.writeFileSync(p1, t.join('\n'))
      let [part_info_list, chunk_size] = init_chunks_sha(fs.statSync(p1).size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(7)
      expect(part_info_list[6]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
      expect(chunk_size).toBe(128)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha1(
        p1,
        part_info_list,
        pp => {
          prog = pp
        },
        () => false,
        NodeContext,
      )

      expect(content_hash).toBe('392AF61CCA9BC02502B0BB03B45ABD78601DD1DF')
      expect(content_hash_name).toBe('sha1')
      expect(arr[6].parallel_sha1_ctx).toEqual({
        h: [2781477636, 2167910136, 4107292220, 1153442652, 2872263382],
        part_offset: 768,
      })

      expect(prog).toBe(100)

      fs.unlinkSync(p1)
    })
    it('on progress throw error, still ok', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_parts_sha1.txt')
      fs.writeFileSync(p1, t.join('\n'))
      let [part_info_list, chunk_size] = init_chunks_sha(fs.statSync(p1).size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(7)
      expect(part_info_list[6]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
      expect(chunk_size).toBe(128)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha1(
        p1,
        part_info_list,
        pp => {
          prog = pp
          throw new Error('xxxx')
        },
        () => false,
        NodeContext,
      )

      expect(content_hash).toBe('392AF61CCA9BC02502B0BB03B45ABD78601DD1DF')
      expect(content_hash_name).toBe('sha1')
      expect(arr[6].parallel_sha1_ctx).toEqual({
        h: [2781477636, 2167910136, 4107292220, 1153442652, 2872263382],
        part_offset: 768,
      })

      expect(prog).toBe(100)

      fs.unlinkSync(p1)
    })
  })

  describe('calc_file_sha256', () => {
    it('calc_file_sha256', async () => {
      // 生成测试文件
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_sha256.txt')
      fs.writeFileSync(p1, 'abc')

      let prog = 0
      let result = await calc_file_sha256(
        p1,
        0,
        p => {
          prog = p
          console.log(p)
        },
        () => false,
        NodeContext,
      )
      expect(fs.statSync(p1).size).toBe(3)
      expect(result).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD')
      expect(prog).toBe(100)

      // 删除
      fs.unlinkSync(p1)
    })
    it('calc_file_sha256 0-2', async () => {
      // 生成测试文件
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_sha256.txt')
      fs.writeFileSync(p1, 'abc')

      let prog = 0
      let result = await calc_file_sha256(
        p1,
        2,
        p => {
          prog = p
          console.log(p)
        },
        () => false,
        NodeContext,
      )
      expect(fs.statSync(p1).size).toBe(3)
      expect(result).toBe('FB8E20FC2E4C3F248C60C39BD652F3C1347298BB977B8B4D5903B85055620603')
      expect(prog).toBe(100)

      // 删除
      fs.unlinkSync(p1)
    })

    it('progress throw error, still ok', async () => {
      // 生成测试文件
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_sha256.txt')
      fs.writeFileSync(p1, 'abc')

      let prog = 0
      let result = await calc_file_sha256(
        p1,
        0,
        p => {
          prog = p
          throw new Error('test err')
        },
        () => false,
        NodeContext,
      )
      expect(fs.statSync(p1).size).toBe(3)
      expect(result).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD')
      expect(prog).toBe(100)

      // 删除
      fs.unlinkSync(p1)
    })
  })

  describe('calc_file_parts_sha256', () => {
    it('empty file', async () => {
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_parts_sha256-empty.txt')
      fs.writeFileSync(p1, '')
      let [part_info_list, chunk_size] = init_chunks_sha(fs.statSync(p1).size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(1)
      expect(part_info_list[0]).toEqual({part_number: 1, part_size: 0, from: 0, to: 0})

      expect(chunk_size).toBe(64)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha256(
        p1,
        part_info_list,
        pp => {
          prog = pp
        },
        () => false,
        NodeContext,
      )

      expect(content_hash).toBe('E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855')
      expect(content_hash_name).toBe('sha256')
      expect(prog).toBe(100)

      fs.unlinkSync(p1)
    })
    it('calc_file_parts_sha256', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_parts_sha256.txt')
      fs.writeFileSync(p1, t.join('\n'))
      let [part_info_list, chunk_size] = init_chunks_sha(fs.statSync(p1).size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(7)
      expect(part_info_list[6]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
      expect(chunk_size).toBe(128)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha256(
        p1,
        part_info_list,
        pp => {
          prog = pp
        },
        () => false,
        NodeContext,
      )

      expect(content_hash).toBe('D248EBFB21764620F802BB87A2DF6BBE0CAA6F55657B842025F5B01C0525A7ED')
      expect(content_hash_name).toBe('sha256')
      expect(arr[6].parallel_sha256_ctx).toEqual({
        h: [2156254178, 2271146846, 3285757422, 4079239336, 3289954368, 3496897604, 1490423711, 2468994605],

        part_offset: 768,
      })

      expect(prog).toBe(100)

      fs.unlinkSync(p1)
    })
    it('on progress throw error, still ok', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_parts_sha256.txt')
      fs.writeFileSync(p1, t.join('\n'))
      let [part_info_list, chunk_size] = init_chunks_sha(fs.statSync(p1).size, [], 64)
      console.log(part_info_list, chunk_size)

      expect(part_info_list.length).toBe(7)
      expect(part_info_list[6]).toEqual({part_number: 7, part_size: 21, from: 768, to: 789})
      expect(chunk_size).toBe(128)

      let prog
      let {
        part_info_list: arr,
        content_hash_name,
        content_hash,
      } = await calc_file_parts_sha256(
        p1,
        part_info_list,
        pp => {
          prog = pp
          throw new Error('xxxx')
        },
        () => false,
        NodeContext,
      )

      expect(content_hash).toBe('D248EBFB21764620F802BB87A2DF6BBE0CAA6F55657B842025F5B01C0525A7ED')
      expect(content_hash_name).toBe('sha256')
      expect(arr[6].parallel_sha256_ctx).toEqual({
        h: [2156254178, 2271146846, 3285757422, 4079239336, 3289954368, 3496897604, 1490423711, 2468994605],
        part_offset: 768,
      })

      expect(prog).toBe(100)

      fs.unlinkSync(p1)
    })
  })

  describe('calc_file_crc64', () => {
    it('file', async () => {
      let t: string[] = []
      for (let i = 0; i < 100; i++) t.push(`test-${i}`)

      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_crc64.txt')

      fs.writeFileSync(p1, t.join('\n'))

      // const file = new File([t.join('\n')], 'hello.txt', {type: 'plain/text'})
      let prog = 0
      let last = await calc_file_crc64(
        p1,
        p => {
          prog = p
        },
        () => false,
        NodeContext,
      )

      expect(prog).toBe(100)
      expect(last).toBe('4762498020522648846')

      fs.unlinkSync(p1)
    })
    it('empty file', async () => {
      let p1 = path.join(__dirname, 'tmp/tmp-calc_file_crc64-empty.txt')

      fs.writeFileSync(p1, '')

      let prog = 0
      let last = await calc_file_crc64(
        p1,
        p => {
          prog = p
          console.log('-----prog', p)
        },
        () => false,
        NodeContext,
      )

      expect(last).toBe('0')
      expect(prog).toBe(100)
      fs.unlinkSync(p1)
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

      let num = await _parse_free_size_windows(str)
      expect(num).toBe(59933294592)
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

      let num = await _parse_free_size_unix(str, '/')
      console.log(num)
      expect(num).toBe(200789721088)
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

      let num = await _parse_free_size_unix(str, '/')
      console.log(num)
      expect(num).toBe(7945689497.6)
    })
  })
})
