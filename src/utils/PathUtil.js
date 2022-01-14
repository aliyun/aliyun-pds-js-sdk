/** @format */

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path))
  }
}

function dirname(path) {
  assertPath(path)
  if (path.length === 0) return '.'
  var code = path.charCodeAt(0)
  var hasRoot = code === 47 /*/*/
  var end = -1
  var matchedSlash = true
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i)
    if (code === 47 /*/*/) {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      // We saw the first non-path separator
      matchedSlash = false
    }
  }

  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}
function basename(path, ext = '') {
  if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string')
  assertPath(path)

  var start = 0
  var end = -1
  var matchedSlash = true
  var i

  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path) return ''
    var extIdx = ext.length - 1
    var firstNonSlashEnd = -1
    for (i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i)
      if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1
          break
        }
      } else {
        if (firstNonSlashEnd === -1) {
          // We saw the first non-path separator, remember this index in case
          // we need it if the extension ends up not matching
          matchedSlash = false
          firstNonSlashEnd = i + 1
        }
        if (extIdx >= 0) {
          // Try to match the explicit extension
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1) {
              // We matched the extension, so mark this as the end of our path
              // component
              end = i
            }
          } else {
            // Extension does not match, so our result is the entire path
            // component
            extIdx = -1
            end = firstNonSlashEnd
          }
        }
      }
    }

    if (start === end) end = firstNonSlashEnd
    else if (end === -1) end = path.length
    return path.slice(start, end)
  } else {
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1
          break
        }
      } else if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // path component
        matchedSlash = false
        end = i + 1
      }
    }

    if (end === -1) return ''
    return path.slice(start, end)
  }
}

export {basename, dirname}
