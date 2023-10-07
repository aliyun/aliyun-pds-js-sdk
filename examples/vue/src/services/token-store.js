export default {
  get,
  save,
  remove,
}

function get() {
  try {
    let info = JSON.parse(localStorage.getItem('token'))
    return info || {}
  } catch (e) {
    return {}
  }
}
function save(info) {
  localStorage.setItem('token', typeof info == 'object' ? JSON.stringify(info) : info)
}
function remove() {
  localStorage.removeItem('token')
}
