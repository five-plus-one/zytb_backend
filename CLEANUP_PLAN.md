# 文档整理计划

## 📋 当前文档统计
- 根目录: 32 个 .md 文件
- docs 目录: 27 个 .md 文件
- scripts 目录: 4 个 .md 文件
- **总计: 63+ 个文档** (太多了！)

## 🎯 整理策略

### 1. 保留的核心文档

#### 根目录（仅保留3个）
- ✅ **README.md** - 项目主文档
- ✅ **CHANGELOG.md** - 更新日志（新建）
- ✅ **QUICK_START.md** - 快速开始

#### docs/ 目录（分类整理）
```
docs/
├── api/                      # API 文档
│   ├── README.md            # API 总览
│   ├── structured-api.md    # 结构化推荐 API
│   ├── ai-agent-api.md      # AI Agent API
│   └── testing.md           # API 测试指南
│
├── development/              # 开发文档
│   ├── smart-recommendation.md   # 智能推荐系统
│   ├── data-import.md           # 数据导入指南
│   └── troubleshooting.md       # 故障排查
│
├── frontend/                 # 前端集成
│   ├── components.md        # 组件设计
│   └── integration.md       # 集成指南
│
└── archive/                  # 归档（历史文档）
    └── ...
```

### 2. 删除的冗余文档

#### 根目录删除（29个）
```
❌ AGENT_API_DOCUMENTATION.md       → 合并到 docs/api/ai-agent-api.md
❌ AGENT_SUMMARY.md                 → 合并到 docs/api/ai-agent-api.md
❌ AI_DATA_STRUCTURING_FLOW.md      → 归档
❌ API_COMPREHENSIVE.md             → 过时，删除
❌ API_DOCUMENTATION.md             → 过时，删除
❌ API_TEST.md                      → 合并到 docs/api/testing.md
❌ AUTO_FIX_GUIDE.md                → 归档
❌ BUGFIX_SUMMARY.md                → 归档
❌ CHANGELOG_REGISTRATION.md        → 归档
❌ CONVERSATION_CONTEXT_IMPROVEMENTS.md → 归档
❌ DATABASE_DIAGNOSIS.md            → 归档
❌ ENHANCED_RECOMMENDATION_SYSTEM.md → 过时，删除
❌ FINAL_FIXES.md                   → 归档
❌ FINAL_FIX_SUMMARY.md             → 归档
❌ FIXES_SUMMARY.md                 → 归档
❌ HISTORICAL_SCORES_FIX.md         → 归档
❌ INTEGRATION_COMPLETE.md          → 归档
❌ MAJOR_API_DOCUMENTATION.md       → 过时，删除
❌ MAJOR_FILTERING_FIX.md           → 归档
❌ MAJOR_SYSTEM_SUMMARY.md          → 归档
❌ PROBLEM_ANALYSIS.md              → 归档
❌ QUICKFIX_CACHE.md                → 删除
❌ README_SMART_RECOMMENDATION.md   → 合并到新文档
❌ SESSION_SUMMARY.md               → 归档
❌ SMART_RECOMMENDATION_DEBUG.md    → 归档
❌ SMART_RECOMMENDATION_IMPLEMENTATION.md → 归档
❌ TECHNICAL_REPORT.md              → 归档
❌ TESTING_GUIDE.md                 → 合并到 docs/api/testing.md
❌ TEST_NOW.md                      → 删除
❌ WEIGHTED_SCORING_FIX.md          → 归档
```

#### docs/ 目录整理（合并和删除）
```
✅ 保留并重命名:
- API_TESTING.md → api/testing.md
- STRUCTURED_API.md → api/structured-api.md
- FRONTEND_COMPONENTS.md → frontend/components.md
- PROJECT_SUMMARY.md → 移到根目录作为 CHANGELOG.md

❌ 归档:
- AI_AGENT_PROMPT_REFACTOR.md
- AI_AGENT_SETUP.md
- DATA_FORMAT_CLEANUP.md
- DATA_STANDARDIZATION.md
- DETAIL_AND_COMPARISON_SUMMARY.md
- 各种 IMPORT_GUIDE.md
- 各种 SUMMARY.md
```

## 📁 最终文档结构

```
zy_backend/
├── README.md                     # 项目总览
├── CHANGELOG.md                  # 更新日志（包含所有 SUMMARY）
├── QUICK_START.md               # 快速开始
│
├── docs/
│   ├── README.md                # 文档导航
│   │
│   ├── api/                     # API 文档
│   │   ├── README.md           # API 总览
│   │   ├── structured-recommendations.md
│   │   ├── ai-agent.md
│   │   └── testing.md
│   │
│   ├── development/             # 开发指南
│   │   ├── smart-recommendation-system.md
│   │   ├── data-import.md
│   │   ├── database-setup.md
│   │   └── troubleshooting.md
│   │
│   ├── frontend/                # 前端集成
│   │   ├── components.md
│   │   └── integration-guide.md
│   │
│   └── archive/                 # 历史文档归档
│       └── 2025-01/
│           └── ...
│
└── scripts/
    └── README.md                # 脚本使用指南
```

## 🔄 迁移计划

### Step 1: 创建新目录结构
```bash
mkdir -p docs/api
mkdir -p docs/development
mkdir -p docs/frontend
mkdir -p docs/archive/2025-01
```

### Step 2: 移动和重命名关键文档
```bash
# API 文档
mv docs/STRUCTURED_API.md docs/api/structured-recommendations.md
mv docs/API_TESTING.md docs/api/testing.md

# 前端文档
mv docs/FRONTEND_COMPONENTS.md docs/frontend/components.md

# 开发文档
# (新建综合文档)
```

### Step 3: 归档历史文档
```bash
# 移动所有历史修复和调试文档到 archive
mv BUGFIX_SUMMARY.md docs/archive/2025-01/
mv FINAL_FIXES.md docs/archive/2025-01/
# ... 等等
```

### Step 4: 删除过时文档
```bash
rm API_COMPREHENSIVE.md
rm API_DOCUMENTATION.md
rm ENHANCED_RECOMMENDATION_SYSTEM.md
# ... 等等
```

### Step 5: 创建新的索引文档
- README.md (更新)
- CHANGELOG.md (新建，合并所有 SUMMARY)
- docs/README.md (新建，文档导航)
- docs/api/README.md (新建，API 总览)

## ⏰ 执行时间
预计耗时: 10-15分钟

## ✅ 完成标准
1. 根目录只有 3-5 个核心文档
2. docs/ 目录结构清晰，分类明确
3. 所有过时文档已归档或删除
4. 新文档信息最新、完整
5. 有清晰的导航系统
