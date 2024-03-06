/**
 * Usage:
 *    TEST_TYPE=browser node --max_old_space_size=9000 --experimental-modules ./test.js
 */
import {execSync} from 'child_process'

let failed = 0
let passed = 0
let skipped = 0
let covLine = ''
let covBranch = ''
let covFunction = ''

let testType = process.env.TEST_TYPE || 'node'
let isWindows = process.platform == 'win32'
try {
  execSync(`npm run cov:${testType}2 -- --silent --run --no-color	> ./test.log`, {cwd: process.cwd()})
} catch (e) {
  // 覆盖率不通过，强制失败
  // console.log(`TEST_CASE_AMOUNT:{"passed": 0, "failed": 9999, "skipped":0 }`)
  // throw e
}

try {
  const str = execSync(isWindows ? 'powershell gc -tail 500 -encoding utf8 test.log' : `tail -n 500 ./test.log`, {
    cwd: process.cwd(),
  }).toString()
  str.split('\n').forEach(line => {
    if (/failed/.test(line)) {
      failed = line.match(/.*\s(\d+)\sfailed.*/)[1] || 0
    }
    if (/passed/.test(line)) {
      passed = line.match(/.*\s(\d+)\spassed.*/)[1] || 0
    }
    if (/skipped/.test(line)) {
      skipped = line.match(/.*\s(\d+)\sskipped.*/)[1] || 0
    }
    if (/Statements/.test(line)) {
      covLine = line.match(/.*\(\s(.*)\s\)/)[1] || 0
      console.log(`CODE_COVERAGE_LINES: ${covLine}\nCODE_COVERAGE_NAME_LINES: 行`)
    }
    if (/Branches/.test(line)) {
      covBranch = line.match(/.*\(\s(.*)\s\)/)[1] || 0
      console.log(`CODE_COVERAGE_BRANCHES: ${covBranch}\nCODE_COVERAGE_NAME_BRANCHES: 分支`)
    }
    if (/Functions/.test(line)) {
      covFunction = line.match(/.*\(\s(.*)\s\)/)[1] || 0
      console.log(`CODE_COVERAGE_FUNCTION: ${covFunction}\nCODE_COVERAGE_NAME_FUNCTION: 函数`)
    }
  })
} catch (e) {
  console.log('Failed to parse stdout.', e)
}

const msg = `TEST_CASE_AMOUNT:{"passed": ${passed},"failed": ${failed},"skipped":${skipped} }`
console.log(msg)

execSync(`${isWindows ? 'powershell ' : ''}cp ./test.log coverage/${testType}`, {cwd: process.cwd()})
