import {beforeAll, describe, expect, it} from 'vitest'
import * as BrowserContext from '../../lib/context/BrowserContext'
import {BrowserContextExt} from '../../lib/context/BrowserContextExt'

describe('src/context/BrowserContextExt', () => {
  let ext
  beforeAll(() => {
    ext = new BrowserContextExt(BrowserContext)
  })
  it('constructor', () => {
    try {
      new BrowserContextExt({isNode: true, Axios: {}})
      expect('should throw').toBe(false)
    } catch (e) {
      expect(e.message).toBe('BrowserContextExt should not be used in node')
    }
  })
  it('calcCrc64', async () => {
    expect(await ext.calcCrc64(null, '123')).toBe('123')
    expect(await ext.calcCrc64('abc', '0')).toBe('3231342946509354535')
    expect(await ext.calcCrc64('中文')).toBe('16371802884590399230')
  })
  it('calcSha1', async () => {
    expect(await ext.calcHash('sha1', 'abc')).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
    expect(
      await ext.calcHash(
        'sha1',
        `"中共中央总书记、国家主席、中央军委主席习近平近日在黑龙江考察时强调，要牢牢把握在国家发展大局中的战略定位，扭住推动高质量发展这个首要任务，落实好党中央关于推动东北全面振兴的决策部署，扬长补短，把资源优势、生态优势、科研优势、产业优势、区位优势转化为发展新动能新优势，建好建强国家重要商品粮生产基地、重型装备生产制造基地、重要能源及原材料基地、北方生态安全屏障、向北开放新高地，在维护国家国防安全、粮食安全、生态安全、能源安全、产业安全中积极履职尽责，在全面振兴、全方位振兴中奋力开创黑龙江高质量发展新局面。"`,
      ),
    ).toBe('3D49C6771C466A2EF81456DEC93B09DEDB01C1F8')
    expect(await ext.calcHash('sha1', '中文')).toBe('7BE2D2D20C106EEE0836C9BC2B939890A78E8FB3')
  })
  it('calcSha256', async () => {
    expect(await ext.calcHash('sha256', 'abc')).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD')
    expect(
      await ext.calcHash(
        'sha256',
        `"中共中央总书记、国家主席、中央军委主席习近平近日在黑龙江考察时强调，要牢牢把握在国家发展大局中的战略定位，扭住推动高质量发展这个首要任务，落实好党中央关于推动东北全面振兴的决策部署，扬长补短，把资源优势、生态优势、科研优势、产业优势、区位优势转化为发展新动能新优势，建好建强国家重要商品粮生产基地、重型装备生产制造基地、重要能源及原材料基地、北方生态安全屏障、向北开放新高地，在维护国家国防安全、粮食安全、生态安全、能源安全、产业安全中积极履职尽责，在全面振兴、全方位振兴中奋力开创黑龙江高质量发展新局面。"`,
      ),
    ).toBe('B14F92E6DD519D2539AF71D4E07BFE0B60223074C873464308A0E2F89364C7C3')
    expect(await ext.calcHash('sha256', '中文')).toBe(
      '72726D8818F693066CEB69AFA364218B692E62EA92B385782363780F47529C21',
    )
  })
})

describe('calcFileHash', () => {
  let ext
  beforeAll(async () => {
    ext = new BrowserContextExt(BrowserContext)
    // 等待，防止wasm未初始化 calcCrc64 报错
    // await delay(500)
  })
  it('sha1', async () => {
    let opt = {
      hash_name: 'sha1',
      file: new File(['abc'], 'a.txt'),
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
    let opt = {
      hash_name: 'sha256',
      file: new File(['abc'], 'a.txt'),
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
    let opt = {
      hash_name: 'sha555',
      file: new File(['abc'], 'a.txt'),
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
