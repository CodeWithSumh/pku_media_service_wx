import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import compression from 'vite-plugin-compression'
import path from 'path'
import fs from 'fs'
import fsExtra from 'fs-extra'
import zlib from 'zlib'


// 引入dotenv，手动加载.env文件
import dotenv from 'dotenv'

const apiBaseUrl = 'https://172.22.23.117:8932'
function resolve(dir) {
  return path.join(__dirname, dir)
}

// ✅ 多路径排除插件配置
const excludePaths = [
  'public/resources/dash',
  'public/resources/huabiao.splat',
  'public/resources/boya.splat',
  'public/resources/lidazhao.splat'
]

const backupRoot = path.resolve(__dirname, '.vite_exclude_backup')

function excludeMultiplePublicPathsPlugin() {
  return {
    name: 'exclude-multiple-public-paths',
    apply: 'build',
    buildStart() {
      if (!fs.existsSync(backupRoot)) {
        fs.mkdirSync(backupRoot)
      }

      for (const relPath of excludePaths) {
        const absPath = path.resolve(__dirname, relPath)
        const backupPath = path.join(backupRoot, relPath)
        if (fs.existsSync(absPath)) {
          fsExtra.moveSync(absPath, backupPath)
          console.log(`🔧 移除 ${relPath}`)
        }
      }
    },
    closeBundle() {
      for (const relPath of excludePaths) {
        const absPath = path.resolve(__dirname, relPath)
        const backupPath = path.join(backupRoot, relPath)
        if (fs.existsSync(backupPath)) {
          fsExtra.moveSync(backupPath, absPath)
          console.log(`✅ 恢复 ${relPath}`)
        }
      }
      // 清理备份目录
      fsExtra.removeSync(backupRoot)
    }
  }
}
export default defineConfig(({ mode }, command) => {
  // 1. 加载通用env + 对应mode的env（后加载的覆盖先加载的，符合Vite规则）
  dotenv.config({ path: path.resolve(__dirname, '.env') }) // 通用配置
  const envResult = dotenv.config({
    path: path.resolve(__dirname, `.env.${mode}`) // 开发/生产专属配置
  })

  // 2. 核心：直接从parsed对象取值，不碰process.env！加多层容错，防止解析失败
  const envData = envResult.parsed || {}
  // 从解析后的对象中获取VITE_BASE_URL，兜底为根路径/
  const VITE_BASE_URL = envData.VITE_BASE_URL || '/'

  // 调试打印：验证是否取到值（必看！确认envData里有VITE_BASE_URL）
  console.log('dotenv解析的所有变量：', envData, JSON.stringify(VITE_BASE_URL))
  console.log('最终使用的VITE_BASE_URL：', VITE_BASE_URL)


  return {
    // 核心修改：读取环境变量中的VITE_BASE_URL
    base: VITE_BASE_URL,
    plugins: [
      vue(),
      compression({
        ext: '.gz',
        algorithm: 'gzip',
        threshold: 1024,
        deleteOriginFile: false,
        filter: /\.(js|css|html|ply|splat)$/,
      }),
      excludeMultiplePublicPathsPlugin()
    ],
    // 核心新增：注入全局变量window.BASE_URL
    define: {
      'window.BASE_URL': JSON.stringify(VITE_BASE_URL)
    },

    resolve: {
      alias: {
        '@': resolve('src'),
      },
      extensions: ['.js', '.vue', '.json'],
    },

    server: {
      host: '0.0.0.0',
      port: 8088,
      open: false,
      allowedHosts: [
        'xp-smallest-comfortable-cancellation.trycloudflare.com'
      ],
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "cross-origin-resource-policy": "cross-origin",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      },
      proxy: {
        '/ply': {
          target: apiBaseUrl,
          changeOrigin: true,
          pathRewrite: {
            '^/ply': '',
          },
          onProxyReq(proxyReq) {
            proxyReq.setHeader('Access-Control-Allow-Origin', '*')
          },
          onProxyRes(proxyRes) {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
          }
        },
      },
      watch: {
        ignored: [
          '**/media_data/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
        ]
      },

      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith('.ply')) {
            const filePath = path.join(__dirname, 'public', req.url)
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Encoding', 'gzip')
              res.setHeader('Content-Type', 'application/octet-stream')
              fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res)
            } else {
              res.statusCode = 404
              res.end('File not found')
            }
          } else {
            next()
          }
        })
      },

      hot: true,
      historyApiFallback: true,
    },
  }
}

)
