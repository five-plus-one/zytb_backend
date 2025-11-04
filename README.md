# 元知航标 - 后端

基于 AI 驱动的智能志愿填报推荐系统，采用 Node.js + TypeScript + Express + MySQL + AI Agent 技术栈。

- **轻量级推荐**: Token消耗降低97.5%（20k → 500 tokens）
- **极速响应**: 响应时间提升70-80%（15-20秒 → 3-5秒）
- **智能推荐引擎**: 基于数学模型实时计算录取概率
- **冲稳保分类**: 自动分类（冲<35%, 稳35-90%, 保90-99%）
- **个性化推荐**: 根据用户分数、位次、偏好智能筛选
- **批量推荐**: 一次性返回40个精选专业组（冲12 + 稳20 + 保8）
- **推荐卡片**: 前端交互式卡片，支持一键操作
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
│   │   ├── recommendationCard.service.ts      # 🆕 V2卡片数据服务
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
│   ├── V2_COMPLETION_SUMMARY.md              # 🆕 V2完成总结
│   ├── TESTING_GUIDE_V2.md                   # 🆕 V2测试指南
│   ├── RECOMMENDATION_V2_QUICK_REFERENCE.md  # 🆕 V2快速参考
│   ├── RECOMMENDATION_CARDS_V2_IMPLEMENTATION.md  # 🆕 V2实施文档
│   ├── api/                    # API 文档
│   ├── development/            # 开发指南
│   └── frontend/               # 前端集成
│
├── scripts/                     # 数据导入脚本
└── tests/                       # 测试文件
```

---

## 📚 文档导航

### ⭐ V2 推荐卡片文档（最新）
- [V2 完成总结](docs/V2_COMPLETION_SUMMARY.md) - 实施总结和核心价值
- [V2 测试指南](docs/TESTING_GUIDE_V2.md) - 详细测试步骤和场景
- [V2 快速参考](docs/RECOMMENDATION_V2_QUICK_REFERENCE.md) - API格式和前端集成
- [V2 实施文档](docs/RECOMMENDATION_CARDS_V2_IMPLEMENTATION.md) - 完整技术细节

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

