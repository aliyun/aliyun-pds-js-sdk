import {IContextExt, IClientParams, IPDSRequestConfig, IListRes} from '../Types'
import {PDSAuthClient} from './api_auth'

export class PDSBaseAPIClient extends PDSAuthClient {
  constructor(opt: IClientParams, contextExt: IContextExt) {
    super(opt, contextExt)
  }

  async listAllItems<T, P>(
    url: string,
    params: P,
    options?: IPDSRequestConfig,
    reserve?: string,
  ): Promise<IListRes<T>> {
    const param = Object.assign({limit: 100, marker: ''}, params)
    let t: any[] = []
    let key = ''
    do {
      const result = (await this.postAPI<IListRes<T>>(url, param, options)) || {items: [], next_marker: ''}
      t = t.concat(result.items || [])
      param.marker = result.next_marker || ''
      if (reserve) key = key || result[reserve]
    } while (param.marker)
    return reserve ? {items: t, [reserve]: key} : {items: t}
  }

  /**
   * （企业版）获取总体资源和已用资源。
   */
  getQuota(options?: IPDSRequestConfig) {
    return this.postAPI<IQuotaRes>('/domain/get_quota', {}, options)
  }

  // 获取异步任务详情
  getAsyncTask(async_task_id: string, options: IPDSRequestConfig = {}) {
    return this.postAPI<IAsyncTaskRes>('/async_task/get', {async_task_id}, options)
  }

  async pollingAsyncTask(async_task_id: string, ttl_ms: number = 5000, options: IPDSRequestConfig = {}) {
    let state: string
    let info: IAsyncTaskRes
    do {
      info = await this.getAsyncTask(async_task_id, options)
      state = info.state
      await new Promise<void>(a => setTimeout(a, ttl_ms))
    } while (['succeed', 'failed'].indexOf(state.toLowerCase()) === -1)

    return info
  }

  // 原始批量操作
  async batch(req: IBatchReq, options: IPDSRequestConfig = {}): Promise<IBatchRes> {
    return await this.postAPI<IBatchRes>('/batch', req, options)
  }
  // 批量操作文件
  async batchApi(params: IBatchParamsReq, options: IPDSRequestConfig = {}) {
    const {batchArr, num} = params
    const successItems: any[] = []
    const errorItems: any[] = []
    const responseArr: any = []
    const newBatchArr = spArr(batchArr, num)

    for (let index = 0; index < newBatchArr.length; index++) {
      const {responses: resArr} = await this.batch(
        {
          requests: newBatchArr[index],
          resource: 'file',
        },
        options,
      )
      responseArr.push(...resArr)
    }

    responseArr.forEach(item => {
      if (item.status >= 400) errorItems.push(item.body)
      else successItems.push(item.body)
    })

    return {successItems, errorItems}
  }
}

export function spArr(arr: any[], num: number) {
  const spArray: any = []
  for (let i = 0; i < arr.length; ) {
    spArray.push(arr.slice(i, (i += num)))
  }
  return spArray
}

export interface IAsyncTaskRes {
  async_task_id: string
  state: 'Failed' | 'Running' | 'PartialSucceed' | 'Succeed' | string

  // 可选项
  consumed_process?: number
  punished_file_count?: number
  total_process?: number
  error_message?: string
  error_code?: number

  url?: string

  created_at?: string
  started_at?: string
  finished_at?: string

  /**
   * @deprecated use error_message instead
   */
  message?: string
  /**
   * @deprecated use error_code instead
   */
  err_code?: string

  category?: string // 任务自定义类别, 如 album

  [propName: string]: any
}

export interface IQuotaRes {
  size_quota: number
  size_used: number
  user_count_quota: number
  user_count_used: number
}

// 批量操作接口
export interface IBatchBaseReq {
  body: {
    drive_id?: string
    file_id?: string

    permanently?: boolean
    [propName: string]: any
  }
  headers: {
    'Content-Type': 'application/json'
    [propName: string]: any
  }
  id: string // 子请求 id，用于request 和 response关联， 不允许重复
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | string
  url: string
  [propName: string]: any
}
export interface IBatchParamsReq {
  batchArr: IBatchBaseReq[]
  num: number // 几个一组
}

// 批量操作返回值
export interface IBatchBaseRes {
  // body?: {
  //   async_task_id: string
  //   domain_id: string
  //   drive_id: string
  //   file_id: string
  // }
  id: string
  status: number
  [propName: string]: any
}
export interface IBatchRes {
  responses: IBatchBaseRes[]
}

export interface IBatchReq {
  requests: IBatchBaseReq[]
  resource: 'file' | 'drive' | 'user' | 'group' | 'membership' | 'share_link' | 'async_task' | string
}
