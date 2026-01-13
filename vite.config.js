import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import compression from 'vite-plugin-compression'
import path from 'path'
import fs from 'fs'
import fsExtra from 'fs-extra'
import zlib from 'zlib'

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

export default defineConfig({
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

  build: {
    // ...其他 build 设置
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
})
