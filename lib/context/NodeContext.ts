import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as cp from 'child_process'
import * as http from 'http'
import * as https from 'https'
import * as crypto from 'crypto'
import * as worker_threads from 'worker_threads'
import Axios from 'axios'
import AxiosNodeAdapter from '../utils/axios-node-adapter/index.js'

const isNode = true
const platform = process.platform

Axios.defaults.adapter = AxiosNodeAdapter
Axios.defaults.httpsAgent = new https.Agent({rejectUnauthorized: false})

export {isNode, Axios, platform, os, fs, path, cp, http, https, crypto, worker_threads, AxiosNodeAdapter}
