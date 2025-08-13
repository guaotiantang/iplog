# IP日志系统 API 文档

## 基础信息

- **基础URL**: `http://localhost:3001/api`
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述"
}
```

## IP管理接口

### 1. 添加IP记录

**接口地址**: `GET /api/ip/add`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| ip | string | 是 | IP地址 |

**请求示例**:
```
GET /api/ip/add?ip=192.168.1.100
```

**响应示例**:
```json
{
  "success": true,
  "message": "IP添加成功"
}
```

**错误码**:
- `400`: IP地址参数缺失或无效
- `500`: 服务器内部错误

---

### 2. 检查IP是否存在

**接口地址**: `GET /api/ip/check`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| ip | string | 是 | IP地址 |

**请求示例**:
```
GET /api/ip/check?ip=192.168.1.100
```

**响应示例**:
```json
{
  "exists": true,
  "message": "IP存在"
}
```

**错误码**:
- `400`: IP地址参数缺失或无效
- `500`: 服务器内部错误

---

### 3. 获取IP列表

**接口地址**: `GET /api/ip/list`

**请求参数**: 无

**请求示例**:
```
GET /api/ip/list
```

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "ip": "192.168.1.100",
      "created_at": "2024-01-01T12:00:00.000Z",
      "expires_at": "2024-01-01T13:00:00.000Z"
    }
  ]
}
```

**错误码**:
- `500`: 服务器内部错误

---

### 4. 删除IP记录

**接口地址**: `DELETE /api/ip/delete/:id`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | IP记录ID (路径参数) |

**请求示例**:
```
DELETE /api/ip/delete/1
```

**响应示例**:
```json
{
  "success": true,
  "message": "IP记录删除成功"
}
```

**错误码**:
- `400`: ID参数无效
- `404`: 记录不存在
- `500`: 服务器内部错误

---

### 5. 清空所有IP记录

**接口地址**: `DELETE /api/ip/clear`

**请求参数**: 无

**请求示例**:
```
DELETE /api/ip/clear
```

**响应示例**:
```json
{
  "success": true,
  "message": "所有IP记录已清空",
  "deletedCount": 10
}
```

**错误码**:
- `500`: 服务器内部错误

---

## 配置管理接口

### 6. 设置超时配置

**接口地址**: `GET /api/ip/set`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| timeout | number | 是 | 超时时间(秒) |

**请求示例**:
```
GET /api/ip/set?timeout=3600
```

**响应示例**:
```json
{
  "success": true,
  "message": "超时配置更新成功"
}
```

**错误码**:
- `400`: 超时参数缺失或无效
- `500`: 服务器内部错误

---

### 7. 获取当前超时配置

**接口地址**: `GET /api/ip/timeout`

**请求参数**: 无

**请求示例**:
```
GET /api/ip/timeout
```

**响应示例**:
```json
{
  "timeout": 3600
}
```

**错误码**:
- `500`: 服务器内部错误

---

### 8. 获取自动清理配置

**接口地址**: `GET /api/ip/auto-cleanup`

**请求参数**: 无

**请求示例**:
```
GET /api/ip/auto-cleanup
```

**响应示例**:
```json
{
  "enabled": true,
  "interval": 300
}
```

**错误码**:
- `500`: 服务器内部错误

---

### 9. 设置自动清理配置

**接口地址**: `POST /api/ip/auto-cleanup`

**请求头**:
```
Content-Type: application/json
```

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| enabled | boolean | 是 | 是否启用自动清理 |
| interval | number | 是 | 清理间隔(秒) |

**请求示例**:
```json
{
  "enabled": true,
  "interval": 300
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "自动清理配置更新成功"
}
```

**错误码**:
- `400`: 参数无效
- `500`: 服务器内部错误

---

### 10. 获取下次清理时间

**接口地址**: `GET /api/ip/next-cleanup`

**请求参数**: 无

**请求示例**:
```
GET /api/ip/next-cleanup
```

**响应示例**:
```json
{
  "success": true,
  "nextCleanupTime": 1704110400000,
  "remainingSeconds": 300
}
```

**字段说明**:
- `nextCleanupTime`: 下次清理的时间戳(毫秒)
- `remainingSeconds`: 距离下次清理的剩余秒数

**错误码**:
- `500`: 服务器内部错误

---

## 健康检查接口

### 11. 健康检查

**接口地址**: `GET /api/health`

**请求参数**: 无

**请求示例**:
```
GET /api/health
```

**响应示例**:
```json
{
  "success": true,
  "message": "ok"
}
```

---

## 错误处理

### HTTP状态码说明

- `200`: 请求成功
- `304`: 资源未修改(缓存有效)
- `400`: 请求参数错误
- `404`: 资源不存在或API路径错误
- `500`: 服务器内部错误

### 通用错误响应

所有接口在发生错误时都会返回统一格式的错误响应:

```json
{
  "success": false,
  "message": "具体的错误描述"
}
```

---

## 使用示例

### 使用curl命令调用API

```bash
# 添加IP
curl "http://localhost:3001/api/ip/add?ip=192.168.1.100"

# 检查IP
curl "http://localhost:3001/api/ip/check?ip=192.168.1.100"

# 获取IP列表
curl "http://localhost:3001/api/ip/list"

# 设置超时
curl "http://localhost:3001/api/ip/set?timeout=7200"

# 设置自动清理
curl -X POST "http://localhost:3001/api/ip/auto-cleanup" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "interval": 600}'

# 删除IP记录
curl -X DELETE "http://localhost:3001/api/ip/delete/1"

# 清空所有记录
curl -X DELETE "http://localhost:3001/api/ip/clear"
```

### 使用JavaScript调用API

```javascript
// 添加IP
fetch('/api/ip/add?ip=192.168.1.100')
  .then(response => response.json())
  .then(data => console.log(data));

// 设置自动清理配置
fetch('/api/ip/auto-cleanup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: true,
    interval: 300
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

---

## 注意事项

1. **IP地址格式**: 支持IPv4格式，如 `192.168.1.100`
2. **时间格式**: 所有时间字段均为ISO 8601格式的UTC时间
3. **超时配置**: 超时时间单位为秒，最小值为1秒
4. **自动清理间隔**: 最小间隔为30秒
5. **数据持久化**: 所有数据存储在SQLite数据库中
6. **并发安全**: API支持并发访问，数据库操作具有事务保护

---

## 更新日志

- **v1.0.0** (2024-01-01): 初始版本，包含基础IP管理和配置功能