import axios from 'axios'

// 创建axios实例
const baseUrl = 'https://172.22.23.117:8932'

const service = axios.create({
  // axios中请求配置有baseURL选项，表示请求URL公共部分
  // baseURL: baseUrl + '/ply/', // 此处的 /ply/ 地址，原因是后端的基础路径为 /ply/
  baseURL: baseUrl,
  timeout: 30000,
  withCredentials: false,
})

// 请求拦截器
service.interceptors.request.use(config => {
  // 这里可以添加自定义请求逻辑
  // 例如：config.headers['Custom-Header'] = 'value'
  // get请求映射params参数
  if (config.method === 'get' && config.params) {
    let url = config.url + '?';
    for (const propName of Object.keys(config.params)) {
      const value = config.params[propName];
      var part = encodeURIComponent(propName) + "=";
      if (value !== null && typeof(value) !== "undefined") {
        if (typeof value === 'object') {
          for (const key of Object.keys(value)) {
            let params = propName + '[' + key + ']';
            var subPart = encodeURIComponent(params) + "=";
            url += subPart + encodeURIComponent(value[key]) + "&";
          }
        } else {
          url += part + encodeURIComponent(value) + "&";
        }
      }
    }
    url = url.slice(0, -1);
    config.params = {};
    config.url = url;
  }
  return config
}, error => {
  return Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

export default service