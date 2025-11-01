# 志愿填报智能推荐系统 - 后端

基于 AI 驱动的智能志愿填报推荐系统，采用 Node.js + TypeScript + Express + MySQL + AI Agent 技术栈。

## 🎯 核心特性

### 🤖 AI 智能推荐（核心功能）
- **智能推荐引擎**: 基于数学模型实时计算录取概率
- **冲稳保分类**: 自动分类（冲<35%, 稳35-90%, 保90-99%）
- **个性化推荐**: 根据用户分数、位次、偏好智能筛选
- **批量推荐**: 一次性返回40个精选专业组（冲12 + 稳20 + 保8）
- **结构化数据**: 前端友好的 JSON 格式，支持一键操作

### 📊 专业组功能
- **详情查询**: 完整的专业组信息、历年录取数据
- **智能对比**: 20+维度对比分析，智能建议生成
- **概率计算**: 7因素算法（分数差、位次差、波动性等）
- **数据导出**: Excel 导出推荐结果

### 💾 数据管理
- **招生计划**: 2025年江苏省招生计划数据（18万+条）
- **历年分数**: 2021-2024年录取数据（1.8万+条）
- **院校数据**: 3000+所院校信息（985/211/双一流标签）
- **专业数据**: 700+个专业信息

### 🔧 其他功能
- 用户认证（JWT）
- 志愿表管理
- 数据导入工具
- RESTful API

---

## 🚀 快速开始

### 1. 环境要求
- Node.js 18+
- MySQL 8.0+
- TypeScript 5.0+

### 2. 安装依赖
```bash
npm install
```

### 3. 配置数据库
```bash
# 复制配置文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=zy_backend
```

### 4. 运行数据库迁移
```bash
# 创建数据库表
npm run migration:run

# 导入招生计划数据
npm run import:enrollment

# 导入历年分数数据
npm run import:scores
```

### 5. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务启动后访问：
- API 服务: http://localhost:3000/api
- API 文档: [docs/api/](docs/api/)

---

## 📁 项目结构

```
zy_backend/
├── src/
│   ├── ai/                      # AI Agent 模块
│   │   ├── agent.service.ts    # AI Agent 服务
│   │   ├── tools/              # AI 工具集
│   │   └── utils/              # AI 工具类
│   │
│   ├── controllers/             # 控制器
│   │   ├── ai.controller.ts    # AI 接口
│   │   └── structuredRecommendation.controller.ts
│   │
│   ├── services/                # 业务逻辑
│   │   ├── smartRecommendation.service.ts
│   │   ├── admissionProbability.service.ts
│   │   ├── groupDetail.service.ts
│   │   ├── groupComparison.service.ts
│   │   └── structuredDataTransformer.service.ts
│   │
│   ├── models/                  # 数据模型（TypeORM）
│   ├── routes/                  # 路由
│   ├── types/                   # TypeScript 类型定义
│   └── utils/                   # 工具函数
│
├── docs/                        # 文档
│   ├── api/                    # API 文档
│   ├── development/            # 开发指南
│   └── frontend/               # 前端集成
│
├── scripts/                     # 数据导入脚本
└── tests/                       # 测试文件
```

---

## 📚 文档导航

### API 文档
- [结构化推荐 API](docs/api/structured-recommendations.md) - 核心推荐 API
- [API 测试指南](docs/api/testing.md) - 完整测试示例
- [AI Agent API](docs/AI_AGENT_API.md) - AI 对话接口

### 开发指南
- [智能推荐系统](docs/development/smart-recommendation-system.md) - 推荐算法详解
- [数据导入指南](docs/development/data-import.md) - 数据导入流程
- [快速开始](QUICK_START.md) - 快速入门教程

### 前端集成
- [组件设计](docs/frontend/components.md) - 前端组件设计方案
- [集成指南](docs/FRONTEND_AI_INTEGRATION_GUIDE.md) - 前端集成步骤

### 更新日志
- [CHANGELOG](CHANGELOG.md) - 版本更新记录

---

## 🔥 核心 API

### 1. 获取智能推荐
```http
POST /api/recommendations/structured
Content-Type: application/json

{
  "userProfile": {
    "score": 620,
    "rank": 8500,
    "province": "江苏",
    "category": "物理类",
    "year": 2025
  },
  "preferences": {
    "majors": ["计算机科学与技术", "软件工程"],
    "locations": ["江苏", "上海"]
  }
}
```

### 2. 查询专业组详情
```http
GET /api/recommendations/group/10284_01?score=620&rank=8500
```

### 3. 对比专业组
```http
POST /api/recommendations/compare
Content-Type: application/json

{
  "groupIds": ["10284_01", "10247_02", "10287_01"],
  "userProfile": {
    "score": 620,
    "rank": 8500
  }
}
```

完整 API 文档请查看：[docs/api/](docs/api/)

---

## 🛠️ 技术栈

### 后端
- **运行环境**: Node.js 18+
- **编程语言**: TypeScript 5.0+
- **Web 框架**: Express 4.x
- **ORM**: TypeORM 0.3.x
- **数据库**: MySQL 8.0+
- **认证**: JWT + bcrypt
- **AI**: AI Agent SDK

### 开发工具
- **代码规范**: ESLint + Prettier
- **测试**: Jest
- **API 文档**: Markdown
- **版本控制**: Git

---

