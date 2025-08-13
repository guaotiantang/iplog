# Docker 部署指南

本项目已配置好 Docker 支持，可以通过以下方式进行容器化部署。

## 快速开始

### 使用 Docker Compose（推荐）

1. 确保已安装 Docker 和 Docker Compose
2. 在项目根目录执行：

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 使用 Docker 命令

```bash
# 构建镜像
docker build -t iplog .

# 运行容器
docker run -d \
  --name iplog-app \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  iplog

# 查看日志
docker logs -f iplog-app

# 停止容器
docker stop iplog-app
docker rm iplog-app
```

## 配置说明

### 端口配置
- 应用默认运行在端口 **3000**
- 可通过环境变量 `PORT` 修改端口

### 数据持久化
- 数据库文件存储在 `/app/data` 目录
- 建议挂载本地目录以持久化数据：`-v ./data:/app/data`

### 环境变量
- `NODE_ENV`: 运行环境（默认：production）
- `PORT`: 应用端口（默认：3000）

## 健康检查

容器配置了健康检查，会定期检查 `/api/health` 端点的可用性。

## 访问应用

部署成功后，可通过以下地址访问：
- Web 界面：http://localhost:3000
- API 接口：http://localhost:3000/api

## 故障排除

### 查看容器状态
```bash
docker ps
docker-compose ps
```

### 查看日志
```bash
docker logs iplog-app
docker-compose logs iplog
```

### 进入容器调试
```bash
docker exec -it iplog-app sh
```

## 生产环境建议

1. 使用反向代理（如 Nginx）
2. 配置 HTTPS
3. 设置适当的资源限制
4. 定期备份数据目录
5. 监控容器健康状态

## 更新部署

```bash
# 停止当前服务
docker-compose down

# 重新构建镜像
docker-compose build

# 启动新版本
docker-compose up -d
```