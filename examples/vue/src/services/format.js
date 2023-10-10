import moment from 'moment'
const unit = ['BB', 'YB', 'ZB', 'EB', 'PB', 'TB', 'GB', 'MB', 'KB', 'B']

export function parseSize(byte) {
  if (!isNaN(byte)) return byte
  if (!byte) return 0
  if (typeof byte !== 'string') {
    window.console.error(`${byte} is not a valid string.`)
    return 0
  }
  let num = 0
  const index = unit.findIndex(b => {
    const isUnit = byte.toUpperCase().indexOf(b) > 0
    if (isUnit) num = byte.replace(b, '')
    return isUnit
  })
  num *= Math.pow(1024, unit.length - index - 1)
  return num
}
export function formatSize(num) {
  if (isNaN(num)) {
    window.console.error(`${num} is not a valid number.`)
    return num
  }
  let index = unit.length - 1
  while (num >= 1024) {
    num = Number((num / 1024).toFixed(2))
    index--
  }
  return num + unit[index]
}

export function formatTime(s, f = 'YYYY-MM-DD HH:mm', defaultValue) {
  if (!s) return defaultValue || ''
  return moment(new Date(s)).format(f)
}

export function formatElapse(s ,defaultValue) {
  if (!s) return defaultValue || ''
  return moment(new Date(s+Date.now())).fromNow(true)
}
