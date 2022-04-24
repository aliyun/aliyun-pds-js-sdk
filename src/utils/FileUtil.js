/** @format */

export {
  doesFileExist,
  getFreeDiskSize,
  getByteLength,
  // for test
  parseSize,
  getFreeDiskSize_win,
  _parse_free_size_windows,
  _parse_free_size_unix,
}

function getByteLength(str) {
  return new TextEncoder().encode(str).byteLength
}

async function doesFileExist(file, context) {
  /* istanbul ignore else */
  if (context.isNode) {
    return Promise.resolve(
      context.fs.existsSync(file.path) ? null : new Error('A requested file or directory could not be found'),
    )
  } else {
    return await doesFileExistInBrowser(file)
  }
}

/* istanbul ignore next */
function doesFileExistInBrowser(file) {
  return new Promise(res => {
    const fr = new FileReader()
    fr.onabort = function () {
      // 文件可能已经被删除
      if (fr.error.message.indexOf('A requested file or directory could not be found') === 0) res(fr.error)
      else res()
    }
    fr.onerror = fr.onabort

    fr.onload = function () {
      res()
    }
    fr.readAsArrayBuffer(file)
  })
}

async function getFreeDiskSize(p, context) {
  var {os, cp} = context

  /* istanbul ignore next  */
  if (!cp) {
    //兼容 老的客户端没有cp
    return Number.POSITIVE_INFINITY
  }

  if (os.platform() == 'win32') {
    //windows
    return await getFreeDiskSize_win(p, context)
  } else {
    //linux or mac
    return await getFreeDiskSize_unix(p, context)
  }
}
async function getFreeDiskSize_unix(p, context) {
  var {cp} = context
  try {
    let {stdout} = await cp_exec(cp, 'df -hl')
    let num = _parse_free_size_unix(stdout.trim(), p)
    return num
  } catch (e) {
    console.warn(e)
    // throw new Error('Failed to get free disk size, path=' + p)
    return Infinity
  }
}
/* istanbul ignore next  */
async function getFreeDiskSize_win(p, context) {
  var {path, cp} = context
  try {
    // 挂载盘格式： \\Client\$e\abc\
    // 正常驱动格式:  C:\\Users\\zb\\
    if (!/^[a-z]:/i.test(p)) return Infinity

    var driver = path.parse(p).root.substring(0, 2)
    let {stdout} = await cp_exec(cp, driver + ' && cd / && dir')
    let num = _parse_free_size_windows(stdout.trim())
    return num
  } catch (e) {
    console.warn(e)
    // throw new Error('Failed to get free disk size, path=' + p)
    return Infinity
  }
}

function cp_exec(cp, str) {
  return new Promise((resolve, reject) => {
    cp.exec(str, function (err, stdout, stderr) {
      // console.log(err, '--stdout:', stdout, '--stderr:', stderr)
      if (err) reject(err)
      else resolve({stdout, stderr})
    })
  })
}

function _parse_free_size_windows(str) {
  var num
  var arr = str.trim().split('\n')
  var lastLine = arr.slice(arr.length - 1)
  lastLine = (lastLine + '').trim()

  num = lastLine.match(/\s+([\d,]+)\s+/)[1]
  num = parseInt(num.replace(/,/g, ''))

  /* istanbul ignore else */
  if (num != null) return num
  else throw new Error('Failed to get free disk size')
}

function _parse_free_size_unix(str, p) {
  var size

  var arr = str.trim().split('\n')
  arr.splice(0, 1)

  var t = []
  for (let n of arr) {
    var arr2 = n.split(/\s+/)
    t.push({
      pre: arr2[arr2.length - 1],
      freeSize: arr2[3],
      deep: arr2[arr2.length - 1].split('/').length,
    })
  }

  t.sort((a, b) => {
    if (a.deep < b.deep) return 1
    else return -1
  })

  for (let n of t) {
    if (p.startsWith(n.pre)) {
      size = parseSize(n.freeSize)
      break
    }
  }

  /* istanbul ignore else */
  if (size != null) return size
  else throw new Error('Failed to get free disk size')
}

function parseSize(s) {
  var arr = s.match(/([\d.]+)(\D?).*/)
  return parseFloat(arr[1]) * parseSizeUnit(arr[2])
}
function parseSizeUnit(g) {
  switch (g.toUpperCase()) {
    default:
      return 1
    case 'K':
      return 1024
    case 'M':
      return Math.pow(1024, 2)
    case 'G':
      return Math.pow(1024, 3)
    case 'T':
      return Math.pow(1024, 4)
    case 'P':
      return Math.pow(1024, 5)
    case 'E':
      return Math.pow(1024, 6)
    case 'Z':
      return Math.pow(1024, 7)
    case 'Y':
      return Math.pow(1024, 8)
  }
}
