export default {
  beforeMount(el, binding, vnode) {
    if (!vnode.props) return
    const target = vnode.props ? vnode.props['scroll-target'] : null
    const scrollEle = target ? el.querySelector(target) : el

    const distance = vnode.props
      ? parseInt(vnode.props['scroll-bottom-distance'] || document.documentElement.clientHeight * 2, 10)
      : 100

    el._tid = 0

    el.scrollFun = scrollFun

    function debounceScrollFun(e, callback) {
      if (!e.target) return

      // 判断是否向下滚动
      const scrollDistance = e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight

      if (scrollDistance <= distance) {
        callback()
      }
    }
    function scrollFun(e) {
      if (typeof binding.value !== 'function') return

      window.clearTimeout(el._tid)
      el._tid = setTimeout(() => {
        debounceScrollFun(e, binding.value)
      }, 200)
    }
    scrollEle.addEventListener('scroll', el.scrollFun)
  },
  unmounted(el, binding, vnode) {
    const target = vnode.props ? vnode.props['scroll-target'] : null
    const scrollEle = target ? el.querySelector(target) : el
    scrollEle.removeEventListener('scroll', el.scrollFun)
  },
}
