# 更新日志 (CHANGELOG)

本文档记录志愿填报智能推荐系统后端的所有重要更新。

---

## [v2.1.0] - 2025-01-31

### 🎉 新增功能

#### 专业组详情查询
- **文件**: `src/services/groupDetail.service.ts`
- **API**: `GET /api/recommendations/group/:groupId`
- **功能**:
  - 查询单个专业组的完整详细信息
  - 包含院校信息、历年录取数据、专业列表
  - 支持可选的用户分数/位次参数
  - 自动计算录取概率、冲稳保分类、置信度
  - 生成推荐理由、警告信息、亮点标签
- **特性**:
  - 三层查询策略确保数据完整性
  - 智能分数趋势分析
  - 分数波动性计算
  - 调剂风险评估

#### 专业组智能对比
- **文件**: `src/services/groupComparison.service.ts`
- **API**: `POST /api/recommendations/compare`
- **功能**:
  - 支持2-5个专业组的多维度对比
  - 20+个对比字段（基本信息、录取概率、分数分析、历年数据、专业信息）
  - 智能对比建议生成
  - 综合最优和最适合用户的专业组推荐
- **对比维度**:
  - 院校层级（985/211/双一流）
  - 录取概率与置信度
  - 分数差与位次差
  - 历年分数稳定性
  - 专业数量与招生规模
  - 历年最低分展开对比

#### 文档整理
- **删除**: 8个过时文档
- **归档**: 18+个历史文档到 `docs/archive/2025-01/`
- **重组**: 创建清晰的文档目录结构
  - `docs/api/` - API 文档
  - `docs/frontend/` - 前端集成文档
  - `docs/archive/` - 历史文档归档
- **新建**:
  - `CHANGELOG.md` - 本文件（版本更新日志）
  - `docs/README.md` - 文档导航中心

### 🔧 修复

- 修复导入路径错误（`entities/` → `models/`）
- 修复 College 模型字段名不匹配（`collegeCode` → `code`）
- 修复双一流字段不匹配（`isDoubleFirstClass` → `isWorldClass`）
- 处理 EnrollmentPlan 缺失字段（degree、campusLocation 等）
- 修复历史数据类型兼容性问题

### 📚 文档更新

- 完全重写 `README.md`，突出 AI 智能推荐核心功能
- 创建 `docs/api/testing.md` 完整测试文档
- 创建 `docs/archive/2025-01/DETAIL_AND_COMPARISON_SUMMARY.md` 功能总结
- 更新所有文档确保信息最新

---

## [v2.0.0] - 2025-01-30

### 🎉 重大更新

#### 冲稳保算法修正
- **问题**: 之前错误地将冲稳保分类存储在数据库中
- **修复**: 实现实时计算，每个用户根据自己的分数/位次计算
- **算法**:
  - 冲: 录取概率 < 35%
  - 稳: 录取概率 35% - 90%
  - 保: 录取概率 90% - 99%
  - 过保: 录取概率 ≥ 99%（不推荐）

#### 结构化数据接口
- **文件**:
  - `src/types/structuredRecommendation.ts` - 类型定义
  - `src/services/structuredDataTransformer.service.ts` - 数据转换
  - `src/controllers/structuredRecommendation.controller.ts` - API 控制器
  - `src/routes/structuredRecommendation.routes.ts` - 路由定义
- **API 端点**:
  - `POST /api/recommendations` - 获取结构化推荐
  - `POST /api/recommendations/chart-data` - 获取图表数据
  - `POST /api/recommendations/export` - 导出 Excel
- **数据结构**:
  - 完整的 TypeScript 类型系统
  - 前端友好的 JSON 格式
  - 包含用户画像、推荐结果、统计摘要、元数据

#### 智能推荐引擎优化
- **文件**: `src/services/admissionProbability.service.ts`
- **7因子算法**:
  1. 分数差（30%权重）
  2. 位次差（30%权重）
  3. 历年数据完整性（10%权重）
  4. 分数波动性（10%权重）
  5. 热度指数（10%权重）
  6. 趋势分析（5%权重）
  7. 专业组规模（5%权重）
- **特性**:
  - 置信度计算
  - 调剂风险评估
  - 推荐理由生成
  - 警告信息生成

### 📚 文档

- 创建 `docs/api/structured-recommendations.md` - 结构化推荐 API 文档
- 创建 `docs/frontend/components.md` - 前端组件设计方案
- 创建 `docs/archive/2025-01/PROJECT_SUMMARY.md` - 项目完成总结

---

## [v1.5.0] - 2025-01-28

### 🎉 新增功能

#### AI Agent 系统
- **文件**: `src/ai/agent.ts`, `src/ai/tools/`
- **功能**:
  - 智能对话接口
  - 多工具集成（院校查询、专业筛选、志愿分析等）
  - 上下文管理
  - 流式响应
- **API**: `POST /api/ai/chat`

#### 专业筛选 API
- **文件**: `src/routes/majorFilter.routes.ts`
- **功能**:
  - 按选考科目筛选专业
  - 按院校层级筛选（985/211/双一流）
  - 按专业类别筛选
  - 分页支持

#### 等位分查询 API
- **文件**: `src/routes/equivalentScore.routes.ts`
- **功能**: 根据位次查询等效分数

### 📚 文档

- 创建 `docs/AI_AGENT_API.md`
- 创建 `docs/AI_TOOLS_FRONTEND_INTEGRATION.md`
- 创建 `docs/FRONTEND_AI_INTEGRATION_GUIDE.md`

---

## [v1.0.0] - 2025-01-20

### 🎉 初始版本

#### 核心功能
- 用户管理系统
- 院校数据管理
- 专业数据管理
- 志愿方案管理
- 招生计划数据导入
- 历年录取分数导入
- 一分一段表导入

#### 数据库
- TypeORM + MySQL
- 完整的数据模型设计
- 迁移脚本

#### API
- RESTful API 设计
- 统一的响应格式
- 错误处理机制

---

## 已知问题

### v2.1.0
- [ ] College 模型缺少 `collegeLevel` 字段
- [ ] EnrollmentPlan 模型缺少 `degree` 和 `campusLocation` 字段
- [ ] 部分专业组可能因历史数据不足导致置信度较低

### v2.0.0
- [x] ~~冲稳保分类错误存储在数据库中~~ ✅ 已修复
- [x] ~~缺少前端友好的结构化数据接口~~ ✅ 已实现

---

## 开发者注意事项

### 数据库字段映射
```typescript
// College 模型
college.code          // 不是 collegeCode
college.isWorldClass  // 不是 isDoubleFirstClass
college.type          // 院校类型

// EnrollmentPlan 模型
plan.majorRemarks     // 专业备注
plan.studyYears       // 学制
// 缺失: degree, campusLocation
```

### TypeScript 编译
确保所有更改通过 TypeScript 编译：
```bash
npx tsc --noEmit
```

### 测试
参考 `docs/api/testing.md` 进行完整测试。

---

**最后更新**: 2025-01-31
**当前版本**: v2.1.0
