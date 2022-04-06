/** @format */
import {IContext, IClientParams, AxiosRequestConfig, IListRes} from '../Types'
import {delay} from '../utils/HttpUtil'
import {PDSAuthClient} from './api_auth'
// import {PDSError} from '../utils/PDSError'

export class PDSBaseAPIClient extends PDSAuthClient {
  constructor(opt: IClientParams, customContext: IContext) {
    super(opt, customContext)
  }

  async listAllItems<T, P>(
    url: string,
    params: P,
    options?: AxiosRequestConfig,
    reserve?: string,
  ): Promise<IListRes<T>> {
    const param = Object.assign({limit: 100, marker: ''}, params)
    let t: any[] = []
    let key = ''
    do {
      const result = (await this.postAPI<IListRes<T>>(url, param, options)) || {items: [], next_marker: ''}
      t = t.concat(result.items || [])
      param.marker = result.next_marker
      if (reserve) key = key || result[reserve]
    } while (param.marker)
    return reserve ? {items: t, [reserve]: key} : {items: t}
  }

  /**
   * （企业版）获取总体资源和已用资源。
   */
  getQuota(options?: AxiosRequestConfig) {
    return this.postAPI<IQuotaRes>('/domain/get_quota', {}, options)
  }

  // 获取异步任务详情
  getAsyncTask(async_task_id: string, options: AxiosRequestConfig = {}) {
    return this.postAPI<IAsyncTaskRes>('/async_task/get', {async_task_id}, options)
  }

  async pollingAsyncTask(async_task_id: string, ttl_ms: number = 5000, options: AxiosRequestConfig = {}) {
    let state: string
    let info: IAsyncTaskRes
    do {
      info = await this.getAsyncTask(async_task_id, options)
      state = info.state
      await delay(ttl_ms)
    } while (['succeed', 'failed'].indexOf(state.toLowerCase()) === -1)

    return info
  }

  // 批量操作
  async batchApi(params: IBatchParamsReq, options: AxiosRequestConfig = {}) {
    const {batchArr, num} = params
    const successItems: any[] = []
    const errorItems: any[] = []
    const responseArr = []
    const newBatchArr = spArr(batchArr, num)
    if (this.path_type === 'HostingMode') {
      for (const item of newBatchArr) {
        await Promise.all(
          item.map(async ({body, url}) => {
            try {
              successItems.push(await this.postAPI(url, body, options))
            } catch (e) {
              errorItems.push(body)
            }
          }),
        )
      }
      return {successItems, errorItems}
    }
    for (let index = 0; index < newBatchArr.length; index++) {
      const {responses: resArr} = await this.postAPI<IBatchStandardRes>(
        '/batch',
        {
          requests: newBatchArr[index],
          resource: 'file',
        },
        options,
      )
      responseArr.push(...resArr)
    }
    responseArr.forEach(item => {
      const code = item.status.toString()
      if (code.indexOf('4') === 0 || code.indexOf('5') === 0) {
        errorItems.push(item.body)
      } else {
        successItems.push(item.body)
      }
    })
    return {successItems, errorItems}
  }
}

function spArr(arr: any[], num: number) {
  const spArray = []
  for (let i = 0; i < arr.length; ) {
    spArray.push(arr.slice(i, (i += num)))
  }
  return spArray
}

interface IAsyncTaskRes {
  async_task_id: string
  state: string

  // 可选项
  consumed_process?: number
  punished_file_count?: number
  total_process?: number
  message?: string
  err_code?: number
  url?: string

  [propName: string]: any
}

interface IQuotaRes {
  size_quota: number
  size_used: number
  user_count_quota: number
  user_count_used: number
}

// 批量操作接口
interface IBatchBaseReq {
  body: {
    share_id?: string
    drive_id: string
    file_id?: string
    file_path?: string
    permanently?: boolean
    [propName: string]: any
  }
  headers: {
    'Content-Type': 'application/json'
  }
  id: string
  method: string
  url: string
  [propName: string]: any
}
interface IBatchParamsReq {
  batchArr: IBatchBaseReq[]
  num: number // 几个一组
}

// 批量操作返回值
interface IBatchApiRes {
  body: {
    async_task_id: string
    domain_id: string
    drive_id: string
    file_id: string
  }
  id: string
  status: number
}
interface IBatchStandardRes {
  responses: IBatchApiRes[]
}

export {IAsyncTaskRes, spArr, IQuotaRes, IBatchBaseReq, IBatchParamsReq, IBatchApiRes, IBatchStandardRes}
