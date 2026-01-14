FROM node:18-slim

# 安装必要工具和 Git LFS
RUN apt-get update && \
    apt-get install -y git curl && \
    curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install -y git-lfs && \
    git lfs install && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制代码
COPY . .

# 如果仓库里有 Git LFS 文件，确保拉取
RUN git lfs pull || echo "No LFS files or pull failed, skipping"

EXPOSE 8080

CMD ["node", "public/app.js"]
