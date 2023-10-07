const SIZE_UNITS_2 = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB']

/**
 * 1024 --> 1KB
 * @param value
 * @param forceInt 返回整形
 * @returns
 */
function formatSize(value: number | string, forceInt: boolean = false): string {
  if (value == -1) return 'Infinity'
  if (value) {
    let index = 0
    const srcSize = typeof value == 'number' ? value : parseFloat(value)
    index = Math.floor(Math.log(srcSize) / Math.log(1024))
    let size = srcSize / Math.pow(1024, index)
    //  保留的小数位数
    if (SIZE_UNITS[index] !== 'B' && !forceInt) {
      return size.toFixed(2) + SIZE_UNITS[index]
    } else return size.toFixed(0) + SIZE_UNITS[index]
  }
  return '0B'
}

function parseSize(byte: string): number {
  if (!byte) return 0

  let num = parseFloat(byte)
  if (isNaN(num)) return 0

  let unit = byte.match(/[\d.]+(\D)(i|B)?/)?.[1]
  unit = unit || 'B'
  let ind = SIZE_UNITS_2.indexOf(unit)

  if (ind == -1) return 0
  return num * Math.pow(1024, ind)
}

function elapse(dur: number, dateStr: string = '天'): string {
  if (dur == Infinity || !dur) return '-'
  dur = Math.round(dur)

  if (dur < 1000) {
    return `${dur}ms`
  }

  const t: string[] = []
  if (dur >= 24 * 3600000) {
    t.push(`${Math.floor(dur / (24 * 3600000))}${dateStr}`)
    dur %= 24 * 3600000
  }
  if (dur >= 3600 * 1000) {
    t.push(`${iz(Math.floor(dur / 3600000))}:`)
    dur %= 3600000
  } else {
    t.push('00:')
  }
  if (dur >= 60000) {
    t.push(`${iz(Math.floor(dur / 60000))}:`)
    dur %= 60000
  } else {
    t.push('00:')
  }
  if (dur >= 1000) {
    t.push(`${iz(Math.floor(dur / 1000))}`)
    dur %= 1000
  } else {
    t.push('00')
  }
  return t.join('')
}

function iz(a: number): string {
  return a < 10 ? `0${a}` : `${a}`
}

function formatUsedSpace(num1: number, num2: number, percentage: boolean = false): string {
  if (num2 == -1) return percentage ? '0%' : '0'
  return percentage ? `${((100 * num1) / num2).toFixed(2)}%` : (num1 / num2).toFixed(2)
}

function formatPercents(progress: number | string, num: number = 0): number {
  let p
  if (typeof progress == 'number') {
    p = progress || 0
  } else {
    p = parseFloat(progress) || 0
  }
  return parseFloat(p.toFixed(num))
}

function randomHex() {
  return Math.random().toString(36).padEnd(12, '0').substring(2, 12)
}

export {formatSize, parseSize, formatUsedSpace, formatPercents, randomHex, elapse}
