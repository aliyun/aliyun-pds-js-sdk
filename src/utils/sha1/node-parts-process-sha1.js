/** @format */
const {run} = require('./node-parts-sha1')
const {inProcess} = require('../ForkUtil')
inProcess(run)
