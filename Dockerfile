# 使用 Node.js 22.17 作为基础镜像
FROM node:22.17-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 一次性安装系统依赖和Node.js依赖以减少层数
RUN apk add --no-cache python3 python3-dev py3-setuptools make g++ && \
    npm ci --only=production --prefer-offline --no-audit --silent && \
    npm install tsx --prefer-offline --silent && \
    npm cache clean --force

# 开发阶段 - 构建前端
FROM node:22.17-alpine AS build

WORKDIR /app

# 复制 package.json 和安装所有依赖（包括开发依赖）
COPY package*.json ./

# 一次性安装系统依赖和所有Node.js依赖
RUN apk add --no-cache python3 python3-dev py3-setuptools make g++ && \
    npm ci --prefer-offline --no-audit --silent && \
    npm cache clean --force

# 复制构建必需的配置文件
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY index.html ./

# 复制源代码目录
COPY src ./src
COPY public ./public
COPY api ./api

# 构建前端应用
RUN npm run build

# 生产阶段 - 使用更小的基础镜像
FROM node:22.17-alpine AS production

WORKDIR /app

# 设置环境变量（提前设置以利用缓存）
ENV NODE_ENV=production
ENV PORT=3000

# 创建数据目录
RUN mkdir -p /app/data

# 从 base 阶段复制生产依赖
COPY --from=base /app/node_modules ./node_modules

# 从 build 阶段复制构建后的前端文件
COPY --from=build /app/dist ./dist

# 复制后端代码和配置文件
COPY api ./api
COPY package*.json ./

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "--import", "tsx/esm", "api/server.ts"]