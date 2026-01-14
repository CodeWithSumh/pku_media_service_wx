FROM node:18-slim

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源码
COPY . .

# 构建前端
RUN npm run build   # 或者 vue-cli-service build / react build，根据项目命令

EXPOSE 8080

# 启动 Node.js 后端
CMD ["node", "public/app.js"]
