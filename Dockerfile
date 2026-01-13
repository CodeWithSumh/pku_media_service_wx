FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 安装生产依赖到dist目录
RUN cd dist && npm install .

# 复制Express服务器文件
COPY public/app.js ./dist/

# 切换到dist目录
WORKDIR /app/dist

# 暴露端口
EXPOSE 8082

# 启动服务器
CMD ["node", "app.js"]