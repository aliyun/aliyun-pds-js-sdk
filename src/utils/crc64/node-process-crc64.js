/** @format */
const {run} = require('./node-crc64')
const {inProcess} = require('../ForkUtil')
inProcess(run)
