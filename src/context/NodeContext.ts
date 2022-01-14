/** @format */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as cp from 'child_process'
import * as http from 'http'
import * as crypto from 'crypto'
import * as https from 'https'
import Axios from 'axios'
import AxiosNodeAdapter from '../utils/axios-node-adapter'

const isNode = true
const platform = process.platform

export {isNode, Axios, platform, os, fs, path, cp, http, https, crypto, AxiosNodeAdapter}
