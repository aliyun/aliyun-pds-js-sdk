/**
 * Usage:
 *    TEST_TYPE=browser node --max_old_space_size=9000 --experimental-modules ./test.js
 */
import {execSync, exec} from 'child_process'
import {appendFileSync, writeFileSync, existsSync, unlinkSync} from 'fs'

const TEST_FILE = 'test.log'
const TEST_FILE_JSON = 'test-result.json'

let failed = 0
let passed = 0
let skipped = 0
let total = 0

let covLine = ''
let covBranch = ''
let covFunction = ''

let testType = process.env.TEST_TYPE || 'node'
let isWindows = process.platform == 'win32'

init()

async function init() {
  try {
    if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE)

    await new Promise((resolve, reject) => {
      let child = exec(`npm run cov:${testType}2 -- --no-color --silent`, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NO_COLOR: 1,
        },
      })
      child.on('error', err => {
        console.log('[error]', err)
        reject(err)
      })
      child.on('exit', code => {
        if (code !== 0) {
          reject(new Error(`exit code: ${code}`))
          return
        }
        resolve()
      })
      child.stdout.on('data', msg => {
        console.log('[stdout]', msg)
        appendFileSync(TEST_FILE, '[stdout]' + msg)
      })
      child.stderr.on('data', msg => {
        console.log('[stderr]', msg)
        appendFileSync(TEST_FILE, '[stderr]' + msg)
      })
    })
  } catch (e) {
    console.error(e.stack)
    // 覆盖率不通过，强制失败
    // console.log(`TEST_CASE_AMOUNT:{"passed": 0, "failed": 9999, "skipped":0 }`)
    // throw e
  }

  try {
    const str = execSync(
      isWindows ? `powershell gc -tail 500 -encoding utf8 ${TEST_FILE}` : `tail -n 500 ./${TEST_FILE}`,
      {
        cwd: process.cwd(),
      },
    ).toString()

    str.split('\n').forEach(line => {
      if (/failed/.test(line)) {
        failed = line.match(/.*\s(\d+)\sfailed.*/)?.[1] || 0
      }
      if (/passed/.test(line)) {
        passed = line.match(/.*\s(\d+)\spassed.*/)?.[1] || 0
      }
      if (/skipped/.test(line)) {
        skipped = line.match(/.*\s(\d+)\sskipped.*/)?.[1] || 0
      }
      if (/total/.test(line)) {
        total = line.match(/,\s(\d+)\stotal.*/)?.[1] || 0
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

  const msg = `TEST_CASE_AMOUNT:{"passed": ${passed},"failed": ${failed},"skipped":${skipped},"total":${total} }`
  console.log(msg)
  writeFileSync(TEST_FILE_JSON, JSON.stringify({passed, failed, skipped, total}))

  execSync(`${isWindows ? 'powershell ' : ''}cp ./${TEST_FILE} coverage/${testType}`, {cwd: process.cwd()})
  execSync(`${isWindows ? 'powershell ' : ''}cp ./${TEST_FILE_JSON} coverage/${testType}`, {cwd: process.cwd()})
}
