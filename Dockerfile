FROM node:18-slim

WORKDIR /app

# 只拷贝依赖声明
COPY package*.json ./

# 安装生产依赖
RUN npm install --production

# 拷贝代码
COPY . .

# 如果你是前端构建（可选）
# RUN npm run build

# 云托管不看 EXPOSE，但可以留
EXPOSE 8080

# 启动服务
CMD ["node", "app.js"]
