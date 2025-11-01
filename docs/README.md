# 文档导航

欢迎查看志愿填报智能推荐系统的文档！

---

## 📚 文档分类

### 🚀 快速开始
- [项目 README](../README.md) - 项目总览和快速开始
- [快速开始指南](../QUICK_START.md) - 详细的入门教程

---

### 📡 API 文档

#### 核心 API
- **[结构化推荐 API](api/structured-recommendations.md)**
  - 获取智能推荐
  - 专业组详情查询
  - 专业组对比
  - Excel 导出
  - 图表数据

- **[API 测试指南](api/testing.md)**
  - 完整测试示例
  - 前端集成示例（React + Vue）
  - 测试脚本（bash + Postman）

#### AI Agent API
- [AI Agent API](AI_AGENT_API.md) - AI 对话接口
- [AI 工具集](AI_TOOLS_FRONTEND_INTEGRATION.md) - 前端集成

---

### 💻 开发指南

#### 智能推荐系统
- 推荐算法详解
- 冲稳保分类标准
- 概率计算公式

#### 数据管理
- [数据导入指南](ENROLLMENT_PLAN_SUMMARY.md)
  - 招生计划导入
  - 历年分数导入
  - 数据标准化

#### 数据库
- 数据库结构
- 迁移脚本
- 数据完整性

---

### 🎨 前端集成

#### 组件设计
- **[组件设计方案](frontend/components.md)**
  - UserProfileInput - 用户信息输入
  - RecommendationCard - 推荐卡片
  - RecommendationList - 推荐列表
  - RecommendationCharts - 数据可视化
  - GroupDetailCard - 专业组详情
  - GroupComparisonTable - 对比表格

#### 集成指南
- [前端集成指南](FRONTEND_AI_INTEGRATION_GUIDE.md)
  - API 调用方式
  - 数据处理
  - 错误处理
  - 性能优化

---

### 🗂️ 其他文档

#### 参考资料
- [关于志愿填报](Reference/关于志愿.md)

#### 历史文档归档
- [2025年1月归档](archive/2025-01/) - 历史开发记录

---

## 🔍 按功能查找

### 我想...

#### 开始使用这个项目
1. 阅读 [项目 README](../README.md)
2. 查看 [快速开始指南](../QUICK_START.md)
3. 运行服务并测试

#### 调用 API
1. 查看 [结构化推荐 API](api/structured-recommendations.md)
2. 参考 [API 测试指南](api/testing.md)
3. 使用 Postman 或 curl 测试

#### 前端集成
1. 阅读 [组件设计方案](frontend/components.md)
2. 查看 [前端集成指南](FRONTEND_AI_INTEGRATION_GUIDE.md)
3. 实现组件并集成 API

#### 导入数据
1. 查看 [数据导入指南](ENROLLMENT_PLAN_SUMMARY.md)
2. 准备数据文件
3. 运行导入脚本

#### 了解推荐算法
1. 阅读源码：`src/services/admissionProbability.service.ts`
2. 查看算法注释和文档
3. 参考测试用例

#### 排查问题
1. 查看 [更新日志](../CHANGELOG.md) 的"已知问题"部分
2. 检查控制台日志
3. 提交 Issue

---

## 📊 文档结构图

```
docs/
├── README.md                           # 本文件（文档导航）
│
├── api/                                # API 文档
│   ├── structured-recommendations.md  # 核心推荐 API
│   └── testing.md                     # API 测试指南
│
├── frontend/                           # 前端集成
│   └── components.md                  # 组件设计方案
│
├── AI_AGENT_API.md                    # AI Agent API
├── AI_TOOLS_FRONTEND_INTEGRATION.md   # AI 工具前端集成
├── ENROLLMENT_PLAN_SUMMARY.md         # 数据导入指南
├── FRONTEND_AI_INTEGRATION_GUIDE.md   # 前端集成指南
│
├── Reference/                          # 参考资料
│   └── 关于志愿.md
│
└── archive/                            # 历史文档归档
    └── 2025-01/
        ├── PROBLEM_ANALYSIS.md
        ├── BUGFIX_SUMMARY.md
        ├── DETAIL_AND_COMPARISON_SUMMARY.md
        └── ...
```

---

## 🆘 需要帮助？

### 常见问题

**Q: 如何开始使用？**
A: 查看 [快速开始指南](../QUICK_START.md)

**Q: API 怎么调用？**
A: 查看 [API 测试指南](api/testing.md)

**Q: 前端如何集成？**
A: 查看 [前端集成指南](FRONTEND_AI_INTEGRATION_GUIDE.md)

**Q: 数据如何导入？**
A: 查看 [数据导入指南](ENROLLMENT_PLAN_SUMMARY.md)

**Q: 推荐算法是怎样的？**
A: 查看源码 `src/services/admissionProbability.service.ts`

### 联系我们

- 提交 Issue
- 发送邮件
- 查看项目文档

---

## 📝 文档贡献

欢迎改进文档！

1. Fork 本仓库
2. 修改或新增文档
3. 提交 Pull Request
4. 等待审核

### 文档规范
- 使用 Markdown 格式
- 保持清晰的结构
- 添加代码示例
- 更新文档导航

---

**最后更新**: 2025-01-31
**版本**: v2.1.0
