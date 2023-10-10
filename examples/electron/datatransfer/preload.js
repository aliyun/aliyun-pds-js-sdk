const {ipcRenderer} = require('electron')
const {EventEmitter} = require('events')
const debug = require('debug')('PDSDT:preload')
class DataTransfer extends EventEmitter {
  #ws

  #resumeInit

  upload = {
    waiting: [],
    running: [],
    done: [],
  }
  download = {
    waiting: [],
    running: [],
    done: [],
  }

  onError = err => {
    console.warn('[Not found onError Callback]', err)
  }

  constructor() {
    super()
  }

  setToken(tokenInfo) {
    this.#ws.emit('event', {action: 'setToken', params: {tokenInfo}})
  }

  bindTaskListStates(obj) {
    let down_waiting = this.download.waiting
    let down_running = this.download.running
    let down_done = this.download.done
    let up_waiting = this.upload.waiting
    let up_running = this.upload.running
    let up_done = this.upload.done

    this.download.waiting = obj.waitingDownloadTasks
    this.download.running = obj.downloadingTasks
    this.download.done = obj.downloadedTasks

    this.upload.waiting = obj.waitingUploadTasks
    this.upload.running = obj.uploadingTasks
    this.upload.done = obj.uploadedTasks

    if (down_waiting.length > 0) this.download.waiting.push(...down_waiting)
    if (down_running.length > 0) this.download.running.push(...down_running)
    if (down_done.length > 0) this.download.done.push(...down_done)
    if (up_waiting.length > 0) this.upload.waiting.push(...up_waiting)
    if (up_running.length > 0) this.upload.running.push(...up_running)
    if (up_done.length > 0) this.upload.done.push(...up_done)
  }

  async init({api_endpoint, upload_task_concurrency, download_task_concurrency, itemsState}) {
    const port = await ipcRenderer.invoke('getDTPort')
    debug('[ws client] get dt port:', port)
    this.#ws = window.io(`ws://localhost:${port}`)
    debug(`[ws client] connect to ws://localhost:${port}`)

    this.#ws.on('event', event => {
      debug('[ws client] onEvent', event)

      this.handleEvents(event)
    })

    this.#ws.on('error', err => {
      console.error('[ws client] error', err)
      this.onError(err)
    })

    this.#ws.emit('event', {action: 'init', params: {api_endpoint, upload_task_concurrency, download_task_concurrency}})
    let params = await new Promise(resolve => (this.#resumeInit = resolve))

    this.upload.waiting = params.items_up_waiting
    this.upload.running = params.items_up_running
    this.upload.done = params.items_up_done
    this.download.waiting = params.items_down_waiting
    this.download.running = params.items_down_running
    this.download.done = params.items_down_done

    if (itemsState) this.bindTaskListStates(itemsState)
  }
  createUploadTask(params) {
    this.#ws.emit('event', {action: 'createUploadTask', params})
  }
  createDownloadTask(params) {
    this.#ws.emit('event', {action: 'createDownloadTask', params})
  }
  clearUploadedTask() {
    this.#ws.emit('event', {action: 'clearUploadedTask'})
    this.upload.done.splice(0, this.upload.done.length)
  }
  clearDownloadedTask() {
    this.#ws.emit('event', {action: 'clearDownloadedTask'})
    this.download.done.splice(0, this.download.done.length)
  }
  stopTask(type, id) {
    this.#ws.emit('event', {action: 'stopTask', params: {id, type}})
  }
  startTask(type, id) {
    this.#ws.emit('event', {action: 'startTask', params: {id, type}})
  }
  cancelTask(type, id) {
    this.#ws.emit('event', {action: 'cancelTask', params: {id, type}})
  }
  handleEvents({action, type, params} = {}) {
    switch (action) {
      case 'init':
        this.#resumeInit?.(params)
        break
      case 'add_task':
        debug('add_task:', type, params)
        this[type].waiting.push(params)
        break

      case 'progress_changed':
        debug('progress_changed:', type, params.id, params.progress)
        if (params.id) {
          let n = this[type].running.find(n => n.id == params.id)
          if (n) {
            n.progress = params.progress
            n.loaded = params.loaded
            n.speed = params.speed
          }
        }
        break
      case 'state_changed':
        debug('state_changed:', type, params.id, params.state, params.error)

        if (['running'].includes(params.state)) {
          let task
          let ind = this[type].waiting.findIndex(n => n.id == params.id)
          if (ind != -1) {
            let tasks = this[type].waiting.splice(ind, 1)
            task = tasks?.[0]
            if (task) this[type].running.push(task)
          } else {
            task = this[type].running.find(n => n.id == params.id)
          }

          if (task) {
            task.state = params.state
            task.error = params.error 
          }
        }

        if (['stopped','error'].includes(params.state)) {
          let task
          let ind = this[type].waiting.findIndex(n => n.id == params.id)
          if (ind != -1) {
            let tasks = this[type].waiting.splice(ind, 1)
            task = tasks[0]
            if (task) this[type].running.push(task)
          } else {
            task = this[type].running.find(n => n.id == params.id)
          }

          if (task) {
            task.state = params.state
            task.error = params.error
            task.error_code = params.error_code
          }
        }

        if (['success', 'rapid_success', 'cancelled'].includes(params.state)) {
          let task

          let ind = this[type].waiting.findIndex(n => n.id == params.id)
          if (ind != -1) {
            let tasks = this[type].waiting.splice(ind, 1)
            task = tasks[0]
          } else {
            let ind = this[type].running.findIndex(n => n.id == params.id)
            if (ind != -1) {
              let tasks = this[type].running.splice(ind, 1)
              task = tasks[0]
            }
          }

          if (task) this[type].done.unshift(task)

          // 移到 done 列表
          if (task) {
            task.state = params.state
            task.error = params.error
            task.avg_speed = params.avg_speed
          }
        }
        break

      default:
        console.warn('Unsupported Action:', action)
        break
    }
  }
}

module.exports = {
  DataTransfer,
}
