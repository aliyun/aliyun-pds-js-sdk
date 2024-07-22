import {beforeAll, describe, expect, it} from 'vitest'
import * as NodeContext from '../../lib/context/NodeContext'
import {delay} from '../../lib/utils/HttpUtil'
import {NodeContextExt, streamToString, pipeWS} from '../../lib/context/NodeContextExt'

describe('src/context/NodeContextExt', () => {
  let ext
  beforeAll(async () => {
    ext = new NodeContextExt(NodeContext)
    // 等待，防止wasm未初始化 calcCrc64 报错
    await delay(500)
  })
  it('calcCrc64', () => {
    expect(ext.calcCrc64(undefined, '123')).toBe('123')
    expect(ext.calcCrc64('abc', '0')).toBe('3231342946509354535')
    expect(ext.calcCrc64('中文')).toBe('16371802884590399230')
  })
  it('calcSha1', () => {
    expect(ext.calcSha1('abc')).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
    expect(
      ext.calcSha1(
        `"中共中央总书记、国家主席、中央军委主席习近平近日在黑龙江考察时强调，要牢牢把握在国家发展大局中的战略定位，扭住推动高质量发展这个首要任务，落实好党中央关于推动东北全面振兴的决策部署，扬长补短，把资源优势、生态优势、科研优势、产业优势、区位优势转化为发展新动能新优势，建好建强国家重要商品粮生产基地、重型装备生产制造基地、重要能源及原材料基地、北方生态安全屏障、向北开放新高地，在维护国家国防安全、粮食安全、生态安全、能源安全、产业安全中积极履职尽责，在全面振兴、全方位振兴中奋力开创黑龙江高质量发展新局面。"`,
      ),
    ).toBe('3D49C6771C466A2EF81456DEC93B09DEDB01C1F8')
    expect(ext.calcSha1('中文')).toBe('7BE2D2D20C106EEE0836C9BC2B939890A78E8FB3')
  })
  it('calcSha256', () => {
    expect(ext.calcHash('sha256', 'abc')).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD')
    expect(
      ext.calcHash(
        'sha256',
        `"中共中央总书记、国家主席、中央军委主席习近平近日在黑龙江考察时强调，要牢牢把握在国家发展大局中的战略定位，扭住推动高质量发展这个首要任务，落实好党中央关于推动东北全面振兴的决策部署，扬长补短，把资源优势、生态优势、科研优势、产业优势、区位优势转化为发展新动能新优势，建好建强国家重要商品粮生产基地、重型装备生产制造基地、重要能源及原材料基地、北方生态安全屏障、向北开放新高地，在维护国家国防安全、粮食安全、生态安全、能源安全、产业安全中积极履职尽责，在全面振兴、全方位振兴中奋力开创黑龙江高质量发展新局面。"`,
      ),
    ).toBe('B14F92E6DD519D2539AF71D4E07BFE0B60223074C873464308A0E2F89364C7C3')
    expect(ext.calcHash('sha256', '中文')).toBe('72726D8818F693066CEB69AFA364218B692E62EA92B385782363780F47529C21')
  })

  describe('streamToString', () => {
    it('streamToString', async () => {
      let {path, fs} = NodeContext
      let p = path.join(__dirname, 'tmp', 'tmp-streamToStream.txt')
      fs.writeFileSync(p, 'abc')
      let stream = fs.createReadStream(p)

      let content = await streamToString(stream)
      expect(content).toBe('abc')
    })

    it('is not a stream', async () => {
      let content = await streamToString('a')
      expect(content).toBe('a')
    })

    it('renameFile', async () => {
      let {path, fs} = NodeContext
      let p = path.join(__dirname, 'tmp', 'tmp-streamToStream.txt')
      fs.writeFileSync(p, 'abc')
      let p2 = path.join(__dirname, 'tmp', 'tmp-streamToStream2.txt')

      await ext.renameFile(p, p2)
      let content = fs.readFileSync(p2).toString()
      expect(content).toBe('abc')
    })
  })

  describe('pipeWS', () => {
    it('pipeWS', async () => {
      let {path, fs} = NodeContext
      let content = 'abc'
      let p = path.join(__dirname, 'tmp', 'tmp-streamToStream.txt')
      let p2 = path.join(__dirname, 'tmp', 'tmp-streamToStream2.txt')
      fs.writeFileSync(p, content)
      fs.writeFileSync(p2, '')
      let stream = fs.createReadStream(p)

      await pipeWS({
        fs,
        stream,
        downloadPath: p2,
        start: 0,
        loaded: 0,
        total: 3,
        block_size: 1,
        onProgress: a => {
          console.log(a)
        },
        getStopFlag: () => false,
      })

      let p2Content = fs.readFileSync(p2).toString()
      expect(p2Content).toBe(content)

      fs.unlinkSync(p)
      fs.unlinkSync(p2)
    })

    it('stop', async () => {
      let {path, fs} = NodeContext
      let content = 'abc'
      let p = path.join(__dirname, 'tmp', 'tmp-streamToStream.txt')
      let p2 = path.join(__dirname, 'tmp', 'tmp-streamToStream2.txt')
      fs.writeFileSync(p, content)
      fs.writeFileSync(p2, '')
      let stream = fs.createReadStream(p)

      try {
        await pipeWS({
          fs,
          stream,
          downloadPath: p2,
          start: 0,
          loaded: 0,
          total: 3,
          block_size: 1,
          onProgress: a => {
            console.log(a)
          },
          getStopFlag: () => true,
        })
      } catch (err) {
        expect(err.code).toBe('stopped')
      }

      fs.unlinkSync(p)
      fs.unlinkSync(p2)
    })
    it('size not match', async () => {
      let {path, fs} = NodeContext
      let content = 'abc'
      let p = path.join(__dirname, 'tmp', 'tmp-streamToStream.txt')
      let p2 = path.join(__dirname, 'tmp', 'tmp-streamToStream2.txt')
      fs.writeFileSync(p, content)
      fs.writeFileSync(p2, '')
      let stream = fs.createReadStream(p)

      try {
        await pipeWS({
          fs,
          stream,
          downloadPath: p2,
          start: 0,
          loaded: 0,
          total: 4,
          block_size: 1,
          onProgress: a => {
            console.log(a)
          },
          getStopFlag: () => false,
        })
      } catch (err) {
        expect(err.message).toBe('LengthNotMatchError')
      }

      fs.unlinkSync(p)
      fs.unlinkSync(p2)
    })
  })

  describe('calcFileHash', () => {
    let ext
    beforeAll(async () => {
      ext = new NodeContextExt(NodeContext)
      // 等待，防止wasm未初始化 calcCrc64 报错
      await delay(500)
    })
    it('sha1', async () => {
      let content = 'abc'
      let {path, fs} = NodeContext
      let p = path.join(__dirname, 'tmp', 'tmp-calcFileHash-test1.txt')
      fs.writeFileSync(p, content)

      let opt = {
        hash_name: 'sha1',
        // file: p,
        file_path: p,
        verbose: true,
        pre_size: 1024,
        process_calc_hash_size: 50 * 1024 * 1024, // 文件大小超过将启用子进程计算 sha1
        onProgress: () => {},
        getStopFlag: () => false,
      }

      let str = await ext.calcFileHash(opt)
      expect(str).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
    it('sha256', async () => {
      let content = 'abc'
      let {path, fs} = NodeContext
      let p = path.join(__dirname, 'tmp', 'tmp-calcFileHash-test2.txt')
      fs.writeFileSync(p, content)

      let opt = {
        hash_name: 'sha256',
        // file: p,
        file_path: p,
        verbose: true,
        pre_size: 1024,
        process_calc_hash_size: 50 * 1024 * 1024, // 文件大小超过将启用子进程计算 sha1
        onProgress: () => {},
        getStopFlag: () => false,
      }

      let str = await ext.calcFileHash(opt)
      expect(str).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD')
    })
    it('invalid sha555', async () => {
      let content = 'abc'
      let {path, fs} = NodeContext
      let p = path.join(__dirname, 'tmp', 'tmp-calcFileHash-test2.txt')
      fs.writeFileSync(p, content)

      let opt = {
        hash_name: 'sha555',
        // file: p,
        file_path: p,
        verbose: true,
        pre_size: 1024,
        process_calc_hash_size: 50 * 1024 * 1024, // 文件大小超过将启用子进程计算 sha1
        onProgress: () => {},
        getStopFlag: () => false,
      }

      try {
        await ext.calcFileHash(opt)
        expect(1).toBe(2)
      } catch (err) {
        expect(err.code).toBe('InvalidHashName')
      }
    })
  })
})
