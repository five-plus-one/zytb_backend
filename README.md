# 志愿填报系统 - 后端

基于 Node.js + TypeScript + Express + MySQL 的志愿填报系统后端服务。

## 功能特性

✅ **用户模块**
- 用户注册/登录
- JWT 认证
- 用户信息管理
- 手机验证码

✅ **院校模块**
- 院校列表查询(支持筛选、排序、分页)
- 院校详情
- 招生计划查询(已集成真实数据)
- 历年分数线
- 院校对比
- Excel数据导入

✅ **专业模块**
- 专业列表查询
- 专业详情
- 开设院校查询

✅ **志愿模块**
- 志愿填报(保存/提交)
- 我的志愿
- 智能推荐
- 志愿分析

✅ **系统模块**
- 省份/城市数据
- 数据字典
- 系统配置
- 文件上传
- 数据统计

✅ **招生计划模块** 🆕
- 招生计划列表查询(多维度筛选)
- 按院校/专业查询招生计划
- 招生计划统计分析
- Excel批量导入
- 年份/省份选项查询
- 与院校数据关联

## 技术栈

- **运行环境**: Node.js 18+
- **编程语言**: TypeScript
- **Web 框架**: Express.js
- **数据库**: MySQL 8.0
- **ORM**: TypeORM
- **认证**: JWT (jsonwebtoken)
- **验证**: express-validator
- **日志**: winston
- **文件上传**: multer

## 项目结构

```
zy_backend/
├── src/
│   ├── config/              # 配置文件
│   │   ├── index.ts         # 主配置
│   │   ├── database.ts      # 数据库配置
│   │   └── logger.ts        # 日志配置
│   ├── controllers/         # 控制器
│   │   ├── user.controller.ts
│   │   ├── college.controller.ts
│   │   ├── major.controller.ts
│   │   ├── volunteer.controller.ts
│   │   ├── enrollmentPlan.controller.ts  # 🆕 招生计划
│   │   └── system.controller.ts
│   ├── models/              # 数据模型
│   │   ├── User.ts
│   │   ├── College.ts
│   │   ├── Major.ts
│   │   ├── Volunteer.ts
│   │   └── EnrollmentPlan.ts             # 🆕 招生计划
│   ├── routes/              # 路由
│   │   ├── index.ts
│   │   ├── user.routes.ts
│   │   ├── college.routes.ts
│   │   ├── major.routes.ts
│   │   ├── volunteer.routes.ts
│   │   ├── enrollmentPlan.routes.ts      # 🆕 招生计划
│   │   └── system.routes.ts
│   ├── services/            # 业务逻辑
│   │   ├── user.service.ts
│   │   ├── college.service.ts
│   │   ├── major.service.ts
│   │   ├── volunteer.service.ts
│   │   ├── enrollmentPlan.service.ts     # 🆕 招生计划
│   │   └── system.service.ts
│   ├── middlewares/         # 中间件
│   │   ├── auth.ts          # JWT 认证
│   │   └── error.ts         # 错误处理
│   ├── utils/               # 工具函数
│   │   ├── response.ts      # 响应封装
│   │   ├── auth.ts          # 认证工具
│   │   ├── validator.ts     # 验证工具
│   │   └── sms.ts           # 短信工具
│   ├── types/               # 类型定义
│   │   └── index.ts
│   └── app.ts               # 应用入口
├── scripts/                 # 脚本工具
│   ├── importColleges.ts    # 院校数据导入
│   ├── importEnrollmentPlans.ts          # 🆕 招生计划导入
│   ├── createEnrollmentPlanSample.ts     # 🆕 示例数据生成
│   ├── IMPORT_GUIDE.md      # 院校导入指南
│   └── ENROLLMENT_PLAN_IMPORT_GUIDE.md   # 🆕 招生计划导入指南
├── docs/                    # 文档
│   ├── ENROLLMENT_PLAN_API.md            # 🆕 招生计划API文档
│   ├── ENROLLMENT_PLAN_SUMMARY.md        # 🆕 开发总结
│   └── QUICK_START.md                    # 🆕 快速开始指南
├── database/                # 数据库相关
│   └── init.sql             # 初始化脚本
├── data/                    # 🆕 数据文件目录
├── logs/                    # 日志目录
├── uploads/                 # 上传文件目录
├── .env.example             # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`,并修改配置:

```bash
cp .env.example .env
```

编辑 `.env` 文件:

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volunteer_system

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here

# 其他配置...
```

### 4. 初始化数据库

```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本
source database/init.sql
```

或者使用 MySQL Workbench 等工具导入 `database/init.sql` 文件。

### 5. 启动服务

```bash
# 开发模式(热重载)
npm run dev

# 生产模式
npm run build
npm start
```

服务将在 http://localhost:3000 启动。

### 6. 导入数据（可选）

#### 导入院校数据
```bash
npm run import-colleges ./data/colleges.xlsx
```

#### 导入招生计划数据
```bash
# 先生成示例数据
npm run create-enrollment-sample

# 导入示例数据
npm run import-enrollment-plans ./data/enrollment_plans_sample.xlsx
```

详细的导入指南请查看:
- [院校数据导入指南](scripts/IMPORT_GUIDE.md)
- [招生计划导入指南](scripts/ENROLLMENT_PLAN_IMPORT_GUIDE.md)
- [招生计划快速开始](docs/QUICK_START.md)

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **请求格式**: `application/json`
- **响应格式**: `application/json`

### 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 主要接口

#### 用户模块

- `POST /api/user/register` - 用户注册
- `POST /api/user/login` - 用户登录
- `GET /api/user/info` - 获取用户信息 (需要认证)
- `PUT /api/user/info` - 更新用户信息 (需要认证)
- `PUT /api/user/password` - 修改密码 (需要认证)
- `POST /api/user/verify-code` - 发送验证码

#### 院校模块

- `GET /api/college/list` - 获取院校列表
- `GET /api/college/:id` - 获取院校详情
- `GET /api/college/:id/plan` - 获取招生计划(已集成真实数据)
- `GET /api/college/:id/scores` - 获取历年分数线
- `POST /api/college/compare` - 院校对比

#### 招生计划模块 🆕

- `GET /api/enrollment-plan/list` - 获取招生计划列表(支持多维度筛选)
- `GET /api/enrollment-plan/:id` - 获取招生计划详情
- `GET /api/enrollment-plan/college/:collegeCode` - 按院校查询
- `GET /api/enrollment-plan/major/:majorCode` - 按专业查询
- `GET /api/enrollment-plan/statistics/overview` - 获取统计信息
- `GET /api/enrollment-plan/options/years` - 获取可用年份
- `GET /api/enrollment-plan/options/provinces` - 获取可用省份

详细的API文档请查看: [招生计划API文档](docs/ENROLLMENT_PLAN_API.md)

#### 专业模块

- `GET /api/major/list` - 获取专业列表
- `GET /api/major/:id` - 获取专业详情
- `GET /api/major/:id/colleges` - 获取开设院校

#### 志愿模块

- `GET /api/volunteer/my` - 获取我的志愿 (需要认证)
- `POST /api/volunteer/save` - 保存志愿 (需要认证)
- `POST /api/volunteer/submit` - 提交志愿 (需要认证)
- `DELETE /api/volunteer/:id` - 删除志愿 (需要认证)
- `POST /api/volunteer/recommend` - 智能推荐 (需要认证)
- `POST /api/volunteer/analyze` - 志愿分析 (需要认证)

#### 系统模块

- `GET /api/system/provinces` - 获取省份列表
- `GET /api/system/dict` - 获取数据字典
- `GET /api/system/config` - 获取系统配置
- `GET /api/system/statistics` - 数据统计
- `POST /api/system/upload` - 文件上传 (需要认证)

完整的 API 文档请参考项目根目录下的接口文档。

## 认证说明

需要认证的接口在请求头中携带 token:

```
Authorization: Bearer {token}
```

token 通过登录接口获取,有效期为 7 天。

## 测试

### 使用 curl 测试

```bash
# 用户注册
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test001",
    "password": "123456",
    "nickname": "测试用户",
    "phone": "13800138000",
    "verifyCode": "123456"
  }'

# 用户登录
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test001",
    "password": "123456"
  }'

# 获取院校列表
curl http://localhost:3000/api/college/list?pageNum=1&pageSize=10
```

### 使用 Postman

导入以下环境变量:
- `base_url`: http://localhost:3000/api
- `token`: (登录后获取的 token)

## 开发指南

### 添加新接口

1. 在 `src/models/` 创建数据模型
2. 在 `src/services/` 添加业务逻辑
3. 在 `src/controllers/` 添加控制器
4. 在 `src/routes/` 添加路由
5. 在 `src/routes/index.ts` 挂载路由

### 日志

日志文件存储在 `logs/` 目录:
- `error.log` - 错误日志
- `combined.log` - 所有日志

### 数据库迁移

使用 TypeORM 的同步功能(开发环境):

```typescript
// src/config/index.ts
database: {
  synchronize: true // 开发环境自动同步
}
```

生产环境建议使用迁移:

```bash
npm run typeorm migration:generate -- -n MigrationName
npm run typeorm migration:run
```

## 部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 构建
npm run build

# 启动
pm2 start dist/app.js --name volunteer-backend

# 查看日志
pm2 logs volunteer-backend

# 重启
pm2 restart volunteer-backend

# 停止
pm2 stop volunteer-backend
```

### 使用 Docker

```bash
# 构建镜像
docker build -t volunteer-backend .

# 运行容器
docker run -d -p 3000:3000 \
  -e DB_HOST=your_db_host \
  -e DB_PASSWORD=your_db_password \
  --name volunteer-backend \
  volunteer-backend
```

## 注意事项

1. **安全性**
   - 生产环境务必修改 `JWT_SECRET`
   - 数据库密码使用强密码
   - 启用 HTTPS

2. **性能优化**
   - 使用 Redis 缓存热点数据
   - 数据库索引优化
   - 启用 gzip 压缩

3. **短信服务**
   - 当前为模拟实现,生产环境需接入真实短信服务商(阿里云/腾讯云)

4. **文件上传**
   - 生产环境建议使用对象存储服务(OSS/COS)

## 常见问题

### 数据库连接失败

检查 `.env` 中的数据库配置是否正确,确保 MySQL 服务已启动。

### 端口被占用

修改 `.env` 中的 `PORT` 配置。

### TypeORM 同步问题

开发环境设置 `synchronize: true`,生产环境使用迁移。

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

MIT License

## 联系方式

- 技术支持: tech@example.com
- 问题反馈: https://github.com/xxx/issues
