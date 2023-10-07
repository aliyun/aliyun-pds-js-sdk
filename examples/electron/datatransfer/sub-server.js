const {TaskManager} = require('./task-manager')

const httpServer = require('http').createServer()
const {Server} = require('socket.io')

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173'],
  },
})

const {getFreePort} = require('../utils/net-util')

start()
async function start() {
  let port = await getFreePort()

  let tm = new TaskManager()

  process.send({type: 'ready', port})

  io.on('connection', client => {
    console.log('[ws server] client connected:', client.id)

    // 反向
    tm.onEvent((eventName, data) => client.emit(eventName, data))

    client.on('event', data => {
      console.log('[ws server] receive event', data)

      if (typeof tm[data.action] == 'function') {
        tm[data.action](data.params)
      } else {
        console.error('Not found method on TaskManager:', data.action)
      }
    })
    client.on('disconnect', () => {})
  })

  io.on('error', err => {
    console.log('[ws server] error:', err)
  })

  httpServer.on('error', err => {
    console.log('httpServer error:', err)
  })

  console.log('[ws server] listen on ' + port)

  httpServer.listen(port)
}
