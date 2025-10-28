# 快速启动指南

## 前置条件

确保已安装:
- Node.js (>= 18.0)
- MySQL (>= 8.0)
- npm 或 yarn

## 第一步：安装依赖

```bash
npm install
```

## 第二步：配置环境变量

已经创建了 `.env` 文件,修改数据库配置:

```bash
# 编辑 .env 文件
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=volunteer_system
```

## 第三步：初始化数据库

### 方法一：使用 MySQL 命令行

```bash
# 1. 登录 MySQL
mysql -u root -p

# 2. 执行初始化脚本
source database/init.sql

# 3. 退出
exit
```

### 方法二：使用 MySQL Workbench

1. 打开 MySQL Workbench
2. 连接到数据库
3. 打开 `database/init.sql` 文件
4. 执行脚本

## 第四步：启动服务

### 开发模式(推荐)

```bash
npm run dev
```

开发模式会自动监听文件变化并重启服务。

### 生产模式

```bash
# 构建
npm run build

# 启动
npm start
```

## 第五步：测试接口

服务启动后,访问:
- API 地址: http://localhost:3000/api
- 健康检查: http://localhost:3000/api/health

### 使用 curl 测试

```bash
# 健康检查
curl http://localhost:3000/api/health

# 获取系统配置
curl http://localhost:3000/api/system/config

# 获取院校列表
curl http://localhost:3000/api/college/list?pageNum=1&pageSize=5
```

### 测试用户注册登录

1. 注册用户（无需验证码）:
```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "123456",
    "nickname": "测试用户",
    "phone": "13800138000",
    "email": "test@example.com"
  }'
```

2. 登录:
```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "123456"
  }'
```

3. 保存返回的 token,用于后续需要认证的接口

> **注意**: 注册已简化，无需验证码。如需使用验证码功能，可通过 `/api/user/verify-code` 接口发送验证码。

## 常见问题

### 1. 数据库连接失败

**错误**: `❌ 数据库连接失败: Access denied for user 'root'@'localhost'`

**解决**:
- 检查 `.env` 文件中的数据库用户名和密码
- 确保 MySQL 服务已启动

### 2. 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决**:
- 修改 `.env` 文件中的 `PORT` 配置
- 或关闭占用 3000 端口的程序

### 3. TypeScript 编译错误

**解决**:
```bash
# 清除旧的编译文件
rm -rf dist

# 重新编译
npm run build
```

### 4. 模块找不到

**错误**: `Cannot find module 'express'`

**解决**:
```bash
# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

## 下一步

- 查看完整 API 文档: [README.md](README.md)
- 测试所有接口: [API_TEST.md](API_TEST.md)
- 根据需求添加更多功能

## 技术支持

如遇到问题:
1. 查看服务器日志: `logs/error.log` 和 `logs/combined.log`
2. 查看控制台输出
3. 检查环境配置

## 项目结构预览

```
zy_backend/
├── src/                 # 源代码
│   ├── config/         # 配置
│   ├── controllers/    # 控制器
│   ├── models/         # 数据模型
│   ├── routes/         # 路由
│   ├── services/       # 业务逻辑
│   ├── middlewares/    # 中间件
│   ├── utils/          # 工具函数
│   └── app.ts          # 入口文件
├── database/           # 数据库脚本
├── dist/              # 编译输出
├── logs/              # 日志文件
├── uploads/           # 上传文件
├── .env               # 环境变量
└── package.json       # 项目配置
```

祝开发愉快! 🎉
