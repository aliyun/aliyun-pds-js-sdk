import {extname} from './PathUtil'
export {checkAllowExtName, fix_filename_4_windows}

// windows下， 文件名不能包含： \/:*?"<>|
function fix_filename_4_windows(p) {
  return p
    .split(/\\|\//)
    .map(name => (/^[a-z]:$/i.test(name) ? name : name.replace(/[/:*?"<>|]/g, '_')))
    .join('\\')
}

function checkAllowExtName(allow_ext_list, file_name) {
  if (Array.isArray(allow_ext_list) && allow_ext_list.length > 0) {
    // .txt or ''
    let extName = extname(file_name)

    if (extName) {
      let arr = allow_ext_list.map(n => n.toLowerCase())
      return arr.includes(extName.toLowerCase())
    } else return false
  }
  return true
}
