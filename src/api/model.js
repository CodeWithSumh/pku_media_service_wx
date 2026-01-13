import request from '@/utils/request'

// 获取ply文件的请求ID
export function getPlyId(params) {
  return request({
    url: '/ply/adjacent_temp',
    method: 'get',
    params
  })
}

// 获取ply文件内容
export function getPly(params) {
  return request({
    url: '/ply/get_file',
    method: 'get',
    params
  })
}