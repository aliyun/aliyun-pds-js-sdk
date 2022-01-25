/** @format */

const {mkdirSync} = require('fs')
const {join} = require('path')
mkdirSync(join(__dirname, 'tmp'), {recursive: true})

export * from '../../src/index' // from src
// module.exports = require('../../')  // after make lib
