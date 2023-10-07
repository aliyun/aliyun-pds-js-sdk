export class EventEmitter {
  constructor() {
    if (!this.handles) {
      this.handles = {}
    }
  }

  on(evt, cb) {
    if (typeof cb !== 'function') {
      throw new Error('callback is not a function')
    }
    if (!this.handles[evt]) {
      this.handles[evt] = []
    }
    this.handles[evt].push(cb)
  }
  off(evt, cb) {
    if (!this.handles[evt]) return
    if (cb) {
      if (typeof cb !== 'function') {
        throw new Error('callback is not a function')
      }

      let ind = this.handles[evt].indexOf(cb)
      if (ind != -1) {
        this.handles[evt].splice(ind, 1)
      }
    } else {
      delete this.handles[evt]
    }
  }

  emit(evt, ...arg) {
    if (this.handles[evt] && this.handles[evt].length > 0) {
      this.handles[evt].forEach((item, i) => {
        item.apply(null, arg)
        // Reflect.apply(item, this, arg);
      })
    }
  }
}
