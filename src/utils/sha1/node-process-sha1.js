/** @format */
const {run} = require('./node-sha1')
const {inProcess} = require('../ForkUtil')
inProcess(run)
