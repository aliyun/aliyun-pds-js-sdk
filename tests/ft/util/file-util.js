import audio from '../resources/audio-test.mp3-base64'
import video from '../resources/video-test.mov-base64'

export {getDownloadLocalPath, mockFile, generateFile, getTestAudioFile, getTestVideoFile}

async function generateFile(name, size, type = 'text/plain') {
  let str = ''.padEnd(size, 'a')
  return await mockFile(name, str, type)
}

async function mockFile(name, content, type) {
  if (typeof window == 'object') return getWebFile(name, content, type)
  else return await getNodeFile(name, content)
}

async function getDownloadLocalPath(name) {
  if (typeof window == 'object') return name
  else {
    let path = await import('path')
    let fs = await import('fs')

    let p = path.join(__dirname, '../tmp', name)

    if (fs.existsSync(p)) fs.unlinkSync(p)
    return p
  }
}

async function getNodeFile(name, content) {
  let path = await import('path')
  let fs = await import('fs')
  let up_file = path.join(__dirname, '../tmp', name)
  fs.writeFileSync(up_file, content)
  let f = {
    name: path.basename(up_file),
    size: fs.statSync(up_file).size,
    type: 'file',
    path: up_file,
  }
  return f
}
function getWebFile(name, content, type) {
  let f = new File([content], name, {type})
  f.path = name
  return f
}
async function getTestAudioFile() {
  if (typeof window == 'object') {
    // 浏览器需要构造 File
    let buf = atob(audio.content_base64)
    let arrBuf = Buffer2ArrayBuffer(buf)
    // console.log(arrBuf)
    return getWebFile(audio.name, arrBuf, 'audio/x-mpeg')
  }
  //  node.js 只需要路径
  return __dirname + '/../resources/audio-test.mp3'
}
async function getTestVideoFile() {
  if (typeof window == 'object') {
    // 浏览器需要构造 File
    let buf = atob(video.content_base64)
    let arrBuf = Buffer2ArrayBuffer(buf)
    // console.log(arrBuf)
    return getWebFile(video.name, arrBuf, 'video/quicktime')
  }
  // node.js 只需要路径
  return __dirname + '/../resources/video-test.mov'
}

function Buffer2ArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf.charCodeAt(i)
  }
  return view.buffer
}
