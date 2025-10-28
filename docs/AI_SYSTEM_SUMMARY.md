# AI 志愿填报系统 - 完整实现总结

## 概述

本文档总结了志愿填报系统中 AI 功能的完整实现,包括 AI 对话、Function Calling、异步任务处理和 12 个工具 API。

---

## 实现内容

### 1. 核心功能

#### 1.1 AI 对话系统
- **会话管理**: 支持创建、暂停、恢复会话
- **流式响应**: SSE (Server-Sent Events) 实现实时对话
- **上下文记忆**: 完整的对话历史存储和检索
- **智能推荐**: 基于对话内容生成个性化志愿推荐

#### 1.2 AI Function Calling
- **12 个工具 API**: 覆盖院校查询、专业搜索、推荐、志愿表操作等功能
- **自动调用**: AI 根据用户意图自动选择和调用合适的工具
- **结果反馈**: 工具执行结果返回给 AI,生成自然语言回复

#### 1.3 异步任务处理
- **长时间操作优化**: 推荐生成使用异步任务模式
- **任务状态查询**: 支持轮询查询任务进度和结果
- **超时防护**: 避免前端请求超时问题

---

## 新增 API 列表

### Agent 模块 API

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/agent/session/current` | 获取当前活跃会话 | ✅ NEW |
| GET | `/api/agent/session/:sessionId/messages` | 获取会话完整消息历史 | ✅ NEW |
| POST | `/api/agent/generate` | 启动异步推荐生成任务 | ✅ UPDATED |
| GET | `/api/agent/generate/status/:taskId` | 查询任务状态 | ✅ NEW |

### AI 工具模块 API (12 个工具)

#### 查询工具 (1-8)

| 工具 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 1 | GET | `/api/agent/tools/search-college` | 搜索院校信息 |
| 2 | GET | `/api/agent/tools/search-major` | 搜索专业信息 |
| 3 | GET | `/api/agent/tools/recommend-colleges` | 根据分数推荐院校 |
| 4 | GET | `/api/agent/tools/admission-scores` | 查询历年录取分数线 |
| 5 | GET | `/api/agent/tools/score-rank` | 查询分数对应排名 |
| 6 | GET | `/api/agent/tools/city-info` | 查询城市信息 |
| 7 | GET | `/api/agent/tools/college-detail/:id` | 查询院校详细信息 |
| 8 | GET | `/api/agent/tools/major-detail/:id` | 查询专业详细信息 |

#### 志愿表操作工具 (9-12)

| 工具 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 9 | GET | `/api/agent/tools/volunteers` | 获取用户志愿表 |
| 10 | POST | `/api/agent/tools/volunteers` | 添加志愿 |
| 11 | DELETE | `/api/agent/tools/volunteers/:id` | 删除志愿 |
| 12 | PUT | `/api/agent/tools/volunteers/:id/order` | 调整志愿顺序 |

---

## 文件结构

```
zy_backend/
├── src/
│   ├── controllers/
│   │   ├── agent.controller.ts          ✅ UPDATED
│   │   └── tools.controller.ts          ✅ NEW
│   ├── services/
│   │   └── agent/
│   │       ├── agent.service.ts         ✅ UPDATED
│   │       └── tools.service.ts         ✅ NEW
│   ├── routes/
│   │   ├── agent.routes.ts              ✅ UPDATED
│   │   ├── tools.routes.ts              ✅ NEW
│   │   └── index.ts                     ✅ UPDATED
│   └── models/
│       ├── College.ts                   (已存在)
│       ├── Major.ts                     (已存在)
│       ├── AdmissionScore.ts            (已存在)
│       ├── ScoreRanking.ts              (已存在)
│       └── Volunteer.ts                 (已存在)
├── docs/
│   ├── AI_TOOLS_FRONTEND_INTEGRATION.md ✅ NEW (完整前端集成指南)
│   ├── AGENT_ASYNC_GENERATION_GUIDE.md  ✅ NEW (异步任务指南)
│   └── AI_SYSTEM_SUMMARY.md             ✅ NEW (本文档)
├── api-test.http                        ✅ UPDATED (新增 80+ 测试用例)
└── .env                                 ✅ UPDATED (端口修改)
```

---

## 技术实现细节

### 1. 异步任务处理

**实现方式**:
```typescript
// 内存任务存储
private static generateTasks: Map<string, GenerateTask> = new Map();

// 启动异步任务
async startGenerateRecommendationsTask(sessionId: string, userId: string, targetCount: number) {
  const taskId = uuidv4();
  const task: GenerateTask = {
    taskId,
    sessionId,
    userId,
    status: 'pending',
    progress: 0,
    startedAt: new Date()
  };
  AgentService.generateTasks.set(taskId, task);

  // 后台执行任务
  this.executeGenerateTask(taskId, sessionId, targetCount);

  return taskId;
}

// 查询任务状态
getGenerateTaskStatus(taskId: string) {
  return AgentService.generateTasks.get(taskId);
}
```

**优点**:
- 避免前端请求超时
- 支持进度跟踪
- 可扩展到分布式任务队列

### 2. AI 工具服务架构

**三层架构**:
```
Routes (路由层)
  ↓
Controllers (控制器层)
  ↓
Services (业务逻辑层)
  ↓
Repositories (数据访问层)
```

**示例**:
```typescript
// 路由层
router.get('/search-college', authMiddleware, ToolsController.searchCollege);

// 控制器层
static async searchCollege(req: Request, res: Response) {
  const results = await toolsService.searchCollege(req.query);
  ResponseUtil.success(res, results);
}

// 服务层
async searchCollege(params: SearchCollegeParams) {
  const query = this.collegeRepo.createQueryBuilder('college');
  // 复杂查询逻辑
  return await query.getMany();
}
```

### 3. TypeORM 查询优化

**使用 QueryBuilder**:
```typescript
const query = this.collegeRepo
  .createQueryBuilder('college')
  .where('college.name LIKE :keyword', { keyword: `%${keyword}%` })
  .andWhere('college.province = :province', { province })
  .orderBy('college.rank', 'ASC')
  .take(limit);
```

**关联查询**:
```typescript
const volunteers = await this.volunteerRepo.find({
  where: { userId },
  relations: ['college', 'major'],
  order: { priority: 'ASC' }
});
```

### 4. 认证中间件

所有工具 API 都通过认证中间件保护:
```typescript
router.get('/search-college', authMiddleware, ToolsController.searchCollege);
```

认证流程:
1. 从 Header 提取 JWT Token
2. 验证 Token 有效性
3. 解析 userId 并注入到 `req.userId`
4. Controller 使用 `req.userId` 进行权限控制

---

## 前端集成方案

### 1. 左右分栏布局

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │                  │  │                 │ │
│  │   AI 对话界面    │  │  志愿表管理界面  │ │
│  │                  │  │                 │ │
│  │  - 用户消息输入  │  │  - 显示志愿列表 │ │
│  │  - AI 回复显示   │  │  - 拖拽调整顺序 │ │
│  │  - 工具调用可视化│  │  - 删除志愿     │ │
│  │                  │  │  - 实时更新     │ │
│  └──────────────────┘  └─────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Function Calling 流程

```
用户: "帮我推荐适合600分的院校"
  ↓
前端发送到 AI 对话 API
  ↓
AI 识别需要调用 recommend_colleges 工具
  ↓
前端调用 GET /api/agent/tools/recommend-colleges?score=600&...
  ↓
获取推荐结果
  ↓
AI 生成自然语言回复
  ↓
显示给用户 + 更新志愿表界面
```

### 3. API 封装示例

```typescript
// src/api/tools.ts
export const toolsAPI = {
  searchCollege: (params) =>
    apiClient.get('/agent/tools/search-college', { params }),

  searchMajor: (params) =>
    apiClient.get('/agent/tools/search-major', { params }),

  recommendColleges: (params) =>
    apiClient.get('/agent/tools/recommend-colleges', { params }),

  // ... 其他 9 个工具
};
```

### 4. 工具执行器

```typescript
// src/ai/toolExecutor.ts
export async function executeToolCall(toolName: string, parameters: any) {
  switch (toolName) {
    case 'search_college':
      return await toolsAPI.searchCollege(parameters);
    case 'recommend_colleges':
      return await toolsAPI.recommendColleges(parameters);
    case 'add_volunteer':
      return await toolsAPI.addVolunteer(parameters);
    // ... 其他工具
  }
}
```

---

## 测试

### API 测试文件

`api-test.http` 文件包含 **140+ 个测试用例**:
- 健康检查 (1 个)
- 用户模块 (10 个)
- 院校模块 (15 个)
- 专业模块 (10 个)
- 志愿模块 (10 个)
- 系统模块 (8 个)
- 业务场景测试 (25 个)
- 边界条件测试 (10 个)
- Agent 模块 (15 个)
- **AI 工具模块 (40+ 个)** ✅ NEW

### 测试工具推荐

1. **VS Code REST Client**
   - 安装插件: REST Client
   - 打开 `api-test.http`
   - 点击 "Send Request" 发送请求

2. **Postman**
   - 导入 API 文档
   - 配置环境变量
   - 批量运行测试

### 快速测试流程

```bash
# 1. 启动服务器
npm run dev

# 2. 测试健康检查
GET http://localhost:11452/api/health

# 3. 用户登录获取 Token
POST http://localhost:11452/api/user/login

# 4. 测试 AI 工具
GET http://localhost:11452/api/agent/tools/search-college?keyword=北京
```

---

## 配置说明

### 环境变量 (.env)

```env
# 服务器端口
PORT=11452

# 数据库配置
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=123456
DB_NAME=volunteer_system

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# AI 模型配置
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.ai.five-plus-one.com/v1
LLM_MODEL=deepseek-chat
```

### 数据库表

相关数据表:
- `colleges` - 院校信息
- `majors` - 专业信息
- `admission_scores` - 录取分数线
- `score_rankings` - 分数排名对照表
- `volunteers` - 用户志愿表
- `agent_sessions` - AI 会话记录
- `agent_messages` - 对话消息记录

---

## 性能优化

### 1. 数据库索引

```sql
-- 院校表索引
CREATE INDEX idx_college_province ON colleges(province);
CREATE INDEX idx_college_rank ON colleges(rank);
CREATE INDEX idx_college_name ON colleges(name);

-- 录取分数线索引
CREATE INDEX idx_admission_province_year ON admission_scores(sourceProvince, year);
CREATE INDEX idx_admission_college ON admission_scores(collegeId);

-- 志愿表索引
CREATE INDEX idx_volunteer_user ON volunteers(userId);
```

### 2. 查询优化

- 使用 `take()` 限制返回结果数量
- 避免 N+1 查询问题,使用 `relations` 预加载
- 使用 QueryBuilder 构建复杂查询

### 3. 缓存策略

```typescript
// 可选: Redis 缓存院校/专业基础数据
// 降低数据库查询压力
```

---

## 常见问题

### Q1: 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use :::11452`

**解决方案**:
```bash
# Windows
netstat -ano | findstr :11452
taskkill //F //PID <PID>

# Linux/Mac
lsof -i :11452
kill -9 <PID>
```

### Q2: TypeScript 编译错误

**问题**: 字段名不匹配导致编译错误

**解决方案**:
- 查看实际的 Model 定义
- 确保使用正确的字段名
- 删除 TypeScript 缓存重新编译

### Q3: Token 认证失败

**问题**: 401 Unauthorized

**解决方案**:
- 检查 Token 是否过期
- 确认 Header 格式: `Authorization: Bearer <token>`
- 重新登录获取新 Token

### Q4: 工具调用无数据返回

**问题**: 工具 API 返回空数组

**解决方案**:
- 确认数据库有数据
- 检查查询参数是否正确
- 查看服务器日志排查问题

---

## 部署建议

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境

```bash
# 编译 TypeScript
npm run build

# 启动生产服务器
npm start

# 使用 PM2 进程管理
pm2 start dist/app.js --name zy_backend
pm2 startup
pm2 save
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 11452
CMD ["npm", "start"]
```

---

## 文档索引

1. **前端集成指南**: [AI_TOOLS_FRONTEND_INTEGRATION.md](./AI_TOOLS_FRONTEND_INTEGRATION.md)
   - 完整的 API 文档
   - React/Vue 代码示例
   - Function Calling 集成方案

2. **异步任务指南**: [AGENT_ASYNC_GENERATION_GUIDE.md](./AGENT_ASYNC_GENERATION_GUIDE.md)
   - 异步推荐生成
   - 任务状态查询
   - 前端轮询实现

3. **API 测试文件**: [../api-test.http](../api-test.http)
   - 140+ 个测试用例
   - 完整业务场景
   - 边界条件测试

---

## 下一步计划

### 短期 (1-2 周)

- [ ] 前端实现左右分栏布局
- [ ] 集成 AI Function Calling
- [ ] 完善错误处理和用户提示
- [ ] 添加工具调用日志记录

### 中期 (1 个月)

- [ ] 优化 AI 推荐算法
- [ ] 添加更多工具(如院校对比、专业匹配度分析)
- [ ] 实现志愿表拖拽排序
- [ ] 添加数据可视化图表

### 长期 (3 个月)

- [ ] 引入向量数据库优化语义搜索
- [ ] 实现分布式任务队列(Bull/RabbitMQ)
- [ ] 添加实时协作功能(WebSocket)
- [ ] 性能监控和日志分析系统

---

## 联系方式

如有问题或建议,请通过以下方式联系:

- **Issues**: 在项目仓库提交 Issue
- **Email**: [your-email@example.com]
- **文档**: 参考 `docs/` 目录下的详细文档

---

**最后更新**: 2025-01-26

**版本**: v2.0.0

**状态**: ✅ 全部功能已完成并测试
