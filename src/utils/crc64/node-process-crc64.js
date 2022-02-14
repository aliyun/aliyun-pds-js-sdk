/** @format */
const {run} = require('./node-crc64')

let obj = JSON.parse(Buffer.from(process.argv[2], 'base64').toString())

run(obj, sendMessage)

function sendMessage(data) {
  process.send(data)
}
