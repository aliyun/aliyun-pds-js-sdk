const fs = require('fs')
const {join} = require('path')
var UglifyJS = require("uglify-js");

const PRE = join(__dirname,'../src/utils/sha1/webworker')

let code = fs.readFileSync(join(PRE, 'src.js')).toString()

var result = UglifyJS.minify(code);

let exp = fs.readFileSync(join(PRE, 'gen.js')).toString()
fs.writeFileSync(join(PRE, 'index.js'), exp.replace(/\$replace\$/,  result.code))
 