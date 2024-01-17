const {PDSClient} = require('../../..')

class TaskManager {
  #client
  #emit

  items_up_waiting = []
  items_up_running = []
  items_up_done = []
  items_down_waiting = []
  items_down_running = []
  items_down_done = []

  #con_up_running = 0
  #con_up_limit = 0
  #con_down_running = 0
  #con_down_limit = 0

  init({api_endpoint, upload_task_concurrency = 3, download_task_concurrency = 3}) {
    this.#con_up_limit = upload_task_concurrency
    this.#con_down_limit = download_task_concurrency

    if (!this.#client) {
      this.#client = new PDSClient({
        api_endpoint,
      })
    }

    setInterval(() => {
      console.log('---------------------')
      console.log('up waiting:', this.items_up_waiting.length)
      console.log('up running:', this.items_up_running.length)
      console.log('up done:', this.items_up_done.length)
      console.log('down waiting:', this.items_down_waiting.length)
      console.log('down running:', this.items_down_running.length)
      console.log('down done:', this.items_down_done.length)
      console.log('---------------------')
    }, 5000)

    this.#emit('event', {
      action: 'init',
      params: {
        items_up_waiting: this.items_up_waiting,
        items_up_running: this.items_up_running,
        items_up_done: this.items_up_done,
        items_down_waiting: this.items_down_waiting,
        items_down_running: this.items_down_running,
        items_down_done: this.items_down_done,
      },
    })
  }

  onEvent(fn) {
    this.#emit = fn
  }

  setToken({tokenInfo}) {
    this.#client.setToken(tokenInfo)
  }
  clearUploadedTask() {
    this.items_up_done = []
  }
  clearDownloadedTask() {
    this.items_down_done = []
  }

  stopTask({type, id}) {
    if (type == 'upload') {
      let ind = this.items_up_running.findIndex(n => n.id == id)
      if (ind != -1) this.items_up_running[ind].stop()
      ind = this.items_up_waiting.findIndex(n => n.id == id)
      if (ind != -1) this.items_up_waiting[ind].stop()
    } else {
      let ind = this.items_down_running.findIndex(n => n.id == id)
      if (ind != -1) this.items_down_running[ind].stop()
      ind = this.items_down_waiting.findIndex(n => n.id == id)
      if (ind != -1) this.items_down_waiting[ind].stop()
    }
  }
  startTask({type, id}) {
    if (type == 'upload') {
      let ind = this.items_up_running.findIndex(n => n.id == id)
      if (ind != -1) this.items_up_running[ind].start()
      ind = this.items_up_waiting.findIndex(n => n.id == id)
      if (ind != -1) this.items_up_waiting[ind].start()
    } else {
      let ind = this.items_down_running.findIndex(n => n.id == id)
      if (ind != -1) this.items_down_running[ind].start()
      ind = this.items_down_waiting.findIndex(n => n.id == id)
      if (ind != -1) this.items_down_waiting[ind].start()
    }
  }
  cancelTask({type, id}) {
    if (type == 'upload') {
      let ind = this.items_up_running.findIndex(n => n.id == id)
      if (ind != -1) this.items_up_running[ind].cancel()
      ind = this.items_up_waiting.findIndex(n => n.id == id)
      if (ind != -1) this.items_up_waiting[ind].cancel()
    } else {
      let ind = this.items_down_running.findIndex(n => n.id == id)
      if (ind != -1) this.items_down_running[ind].cancel()
      ind = this.items_down_waiting.findIndex(n => n.id == id)
      if (ind != -1) this.items_down_waiting[ind].cancel()
    }
  }

  createUploadTask({file, parent_file_id, drive_id, check_name_mode}) {
    console.log('[TaskManager] createUploadTask:', {file, parent_file_id, drive_id, check_name_mode})
    let task = this.#client.createUploadTask(
      {file, drive_id, parent_file_id},
      {
        check_name_mode, // refuse, auto_rename, overwrite, skip
        ignore_rapid: true, // 忽略秒传，测试用

        // limit_part_num: 9000,
        // max_chunk_size: 10 * 1024 * 1024, //每片10MB
        // init_chunk_con: 5,
        // chunk_con_auto: true,

        verbose: true, //显示详细日志

        state_changed: (cp, state, err) => {
          this.#emit('event', {
            action: 'state_changed',
            type: 'upload',

            params: {
              id: task.id,
              state,
              avg_speed: task.avg_speed,
              error: err?.message,
            },
          })

          // if (state == 'error' && err.code == 'AlreadyExists' && cp.is_skip) {
          //   let ind = this.items_running.indexOf(task)
          //   this.items_running.splice(ind, 1)
          // }
          if (['success', 'rapid_success', 'cancelled'].includes(state)) {
            let ind = this.items_up_running.indexOf(task)
            let end_task = this.items_up_running.splice(ind, 1)

            // 移到 done 列表
            this.items_up_done.unshift(end_task[0])
          }

          if (['success', 'rapid_success'].includes(state)) {
            // end state
            // this.#emit('refreshPan')
          }

          if (['success', 'rapid_success', 'error', 'stopped', 'cancelled'].includes(state)) {
            this.#con_up_running--
            if (this.#con_up_running < this.#con_up_limit && this.items_up_waiting.length > 0) {
              this.checkUploadTaskStart()
            }
          }
        },
        progress_changed: (state, progress) => {
          console.log(file.name, 'size', file.size, ' progress: ', progress)

          this.#emit('event', {
            action: 'progress_changed',
            type: 'upload',
            params: {
              id: task.id,
              state,
              progress,
              loaded: task.loaded,
              speed: task.speed,
            },
          })
        },
      },
    )

    this.#emit('event', {
      action: 'add_task',
      type: 'upload',

      params: task.getCheckpoint(),
    })

    this.items_up_waiting.unshift(task)
    task.wait()

    if (this.#con_up_running < this.#con_up_limit && this.items_up_waiting.length > 0) {
      this.checkUploadTaskStart()
    }
  }
  createDownloadTask({file, drive_id, file_id}) {
    console.log('[TaskManager] createDownloadTask:', {file, drive_id, file_id})
    let task = this.#client.createDownloadTask(
      {file, drive_id, file_id},
      {
        // limit_part_num: 9000,
        // max_chunk_size: 10 * 1024 * 1024, //每片10MB
        // init_chunk_con: 5,
        // chunk_con_auto: true,

        verbose: true, //显示详细日志

        state_changed: (cp, state, err) => {
          this.#emit('event', {
            action: 'state_changed',
            type: 'download',
            params: {
              id: task.id,
              state,
              avg_speed: task.avg_speed,
              error: err?.message,
              error_code: err?.code,
            },
          })

          // if (state == 'error' && err.code == 'AlreadyExists' && cp.is_skip) {
          //   let ind = this.items_running.indexOf(task)
          //   this.items_running.splice(ind, 1)
          // }
          if (['success', 'cancelled'].includes(state)) {
            let ind = this.items_down_running.indexOf(task)
            let end_task = this.items_down_running.splice(ind, 1)

            // 移到 done 列表
            this.items_down_done.unshift(end_task[0])
          }

          if (['success'].includes(state)) {
            // end state
            // this.#emit('refreshPan')
          }

          if (['success', 'error', 'stopped', 'cancelled'].includes(state)) {
            this.#con_down_running--
            if (this.#con_down_running < this.#con_down_limit && this.items_down_waiting.length > 0) {
              this.checkDownloadTaskStart()
            }
          }
        },
        progress_changed: (state, progress) => {
          console.log(file.name, 'size', file.size, ' progress: ', progress)

          this.#emit('event', {
            action: 'progress_changed',
            type: 'download',
            params: {
              id: task.id,
              state,
              progress,
              loaded: task.loaded,
              speed: task.speed,
            },
          })
        },
      },
    )

    this.#emit('event', {
      action: 'add_task',
      type: 'download',
      params: task.getCheckpoint(),
    })

    this.items_down_waiting.unshift(task)
    task.wait()

    if (this.#con_down_running < this.#con_down_limit && this.items_down_waiting.length > 0) {
      this.checkDownloadTaskStart()
    }
  }
  async checkUploadTaskStart() {
    console.log('check start:', this.#con_up_running, this.#con_up_limit)
    if (this.#con_up_running < this.#con_up_limit && this.items_up_waiting.length > 0) {
      let task = this.items_up_waiting.pop()
      this.items_up_running.push(task)
      task.start()
      this.#con_up_running++
      if (this.#con_up_running < this.#con_up_limit && this.items_up_waiting.length > 0) this.checkUploadTaskStart()
    }
  }
  async checkDownloadTaskStart() {
    console.log('check start:', this.#con_down_running, this.#con_down_limit)
    if (this.#con_down_running < this.#con_down_limit && this.items_down_waiting.length > 0) {
      let task = this.items_down_waiting.pop()
      this.items_down_running.push(task)
      task.start()
      this.#con_down_running++
      if (this.#con_down_running < this.#con_down_limit && this.items_down_waiting.length > 0)
        this.checkDownloadTaskStart()
    }
  }
}

module.exports = {
  TaskManager,
}
