/** @format */

const {run} = require('./node-parts-sha1')

const {workerData, parentPort} = require('worker_threads')

run(workerData, sendMessage)

function sendMessage(obj) {
  parentPort.postMessage(obj)
}
