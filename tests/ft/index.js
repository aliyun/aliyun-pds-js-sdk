/** @format */

const {mkdirSync} = require('fs')
const {join} = require('path')
mkdirSync(join(__dirname, 'tmp'), {recursive: true})

module.exports = require('../../src/index') // from src
// module.exports = require('../../')  // after make lib
