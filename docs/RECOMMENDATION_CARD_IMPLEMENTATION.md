# 推荐卡片功能开发文档

## 概述

本文档说明了后端如何支持前端的推荐卡片功能。当用户通过AI聊天请求志愿推荐时，后端会自动将推荐数据格式化为前端可直接渲染的 `recommendation-card` 格式。

## 实现架构

### 1. 数据流

```
用户提问
  ↓
AI Agent Service (接收消息)
  ↓
SmartRecommendationTool (查询推荐数据)
  ↓
SmartRecommendationService (计算概率、分类)
  ↓
SmartRecommendationTool (格式化为 StructuredGroupRecommendation)
  ↓
AI Agent Service (自动检测并转换为推荐卡片格式)
  ↓
LLM (接收格式化后的推荐卡片)
  ↓
前端 (渲染交互式卡片)
```

### 2. 核心组件

#### 2.1 RecommendationCardFormatter
**位置**: `src/ai/utils/recommendationCardFormatter.ts`

**功能**:
- 将 `StructuredGroupRecommendation` 数据转换为前端需要的 markdown 卡片格式
- 支持单个卡片格式化和批量格式化
- 自动生成用户友好的说明文字

**核心方法**:

```typescript
// 格式化单个推荐卡片
static formatSingleCard(recommendation: StructuredGroupRecommendation): string

// 格式化多个推荐（带分类说明）
static formatMultipleCards(
  recommendations: StructuredGroupRecommendation[],
  category: '冲' | '稳' | '保',
  intro?: string
): string

// 格式化完整的冲稳保推荐结果
static formatFullRecommendation(data: {
  rush: StructuredGroupRecommendation[];
  stable: StructuredGroupRecommendation[];
  safe: StructuredGroupRecommendation[];
  summary?: any;
}): string
```

#### 2.2 SmartRecommendationTool 更新
**位置**: `src/ai/tools/smartRecommendation.tool.ts`

**更新内容**:
- 修改 `formatGroup()` 方法，返回完整的 `StructuredGroupRecommendation` 格式
- 添加以下辅助方法：
  - `calculateVolatility()` - 计算分数波动性
  - `analyzeScoreTrend()` - 分析分数趋势（上升/下降/稳定）
  - `generateWarnings()` - 生成风险警告
  - `generateHighlights()` - 生成亮点标签
  - `calculateRankScore()` - 计算排序分数

**返回的数据格式**:
```typescript
{
  success: true,
  data: {
    rush: StructuredGroupRecommendation[],  // 完整数据
    stable: StructuredGroupRecommendation[],
    safe: StructuredGroupRecommendation[],
    summary: { ... },
    userProfile: { ... },
    appliedPreferences: { ... }
  },
  metadata: {
    outputFormat: 'StructuredGroupRecommendation - 可直接转换为前端推荐卡片'
  }
}
```

#### 2.3 AI Agent Service 更新
**位置**: `src/ai/agent.service.ts`

**更新内容**:
1. 导入 `RecommendationCardFormatter`
2. 添加 `formatRecommendationCards()` 私有方法
3. 在工具执行后自动检测 `smart_recommendation` 工具结果
4. 将推荐数据转换为推荐卡片格式
5. 更新 system prompt 指导 AI 如何输出推荐卡片

**关键代码**:
```typescript
// 在普通模式中（chat方法）
if (toolName === 'smart_recommendation' && result.success && result.data) {
  const formattedResult = this.formatRecommendationCards(result.data);
  contentToAdd = JSON.stringify({
    ...result,
    formattedCards: formattedResult,
    hint: '请将 formattedCards 的内容直接输出给用户'
  });
}

// 在流式模式中（chatStream方法）也有相同逻辑
```

## StructuredGroupRecommendation 数据格式

### 完整字段定义

```typescript
interface StructuredGroupRecommendation {
  // ===== 基本信息 =====
  groupId: string              // 专业组唯一标识，格式: "collegeCode_groupCode"
  collegeName: string          // 院校名称
  collegeCode: string          // 院校代码
  collegeProvince: string      // 院校所在省份
  groupName: string            // 专业组名称
  groupCode: string            // 专业组代码

  // ===== 院校标签 =====
  is985: boolean               // 是否985
  is211: boolean               // 是否211
  isDoubleFirstClass: boolean  // 是否双一流
  collegeType: undefined       // 院校类型（EnrollmentPlan中暂无此字段）
  collegeLevel: undefined      // 办学层次（EnrollmentPlan中暂无此字段）

  // ===== 冲稳保分类 =====
  riskLevel: '冲' | '稳' | '保'     // 风险级别
  probability: number              // 录取概率 (0-100)
  confidence: number               // 置信度 (0-100)
  adjustmentRisk: '高' | '中' | '低' // 调剂风险

  // ===== 分数分析 =====
  scoreGap: number                 // 分数差距（用户分数 - 历史平均）
  rankGap: number | null           // 位次差距
  userScore: number                // 用户分数
  userRank: number                 // 用户位次
  avgMinScore: number              // 近3年平均最低分
  avgMinRank: number               // 近3年平均最低位次

  // ===== 历年数据 =====
  historicalData: YearlyAdmissionData[]  // 历年录取数据（按年份降序）
  scoreVolatility: number          // 分数波动性（标准差）
  scoreTrend: 'up' | 'down' | 'stable'  // 分数趋势

  // ===== 专业信息 =====
  majors: MajorInfo[]              // 包含的专业列表
  totalMajors: number              // 专业总数
  totalPlanCount: number           // 总招生计划数

  // ===== 推荐理由 =====
  recommendReasons: string[]       // 推荐理由列表
  warnings: string[]               // 风险提示
  highlights: string[]             // 亮点标签

  // ===== 排序权重 =====
  rankScore: number                // 综合排序分数
}
```

### 历年数据格式

```typescript
interface YearlyAdmissionData {
  year: number           // 年份
  minScore: number       // 最低分
  avgScore?: number      // 平均分
  maxScore?: number      // 最高分
  minRank: number        // 最低位次
  maxRank?: number       // 最高位次
  planCount: number      // 招生计划数
  actualAdmitted?: number // 实际录取人数
}
```

### 专业信息格式

```typescript
interface MajorInfo {
  majorId: string        // 专业ID
  majorName: string      // 专业名称
  majorCode: string      // 专业代码
  planCount: number      // 招生计划数
  tuition?: number       // 学费
  duration?: string      // 学制（如 "4年"）
  degree?: string        // 学位（如 "工学学士"）
  studyLocation?: string // 办学地点
  remarks?: string       // 备注
}
```

## 推荐卡片输出格式

### Markdown 代码块格式

```markdown
\`\`\`recommendation-card
{
  "groupId": "10284-01",
  "collegeName": "南京大学",
  "collegeCode": "10284",
  ...所有字段的JSON数据
}
\`\`\`
```

### 完整推荐结果格式

AI会输出类似以下格式的内容：

```markdown
# 🎯 智能推荐结果

## 📊 推荐摘要

- 共推荐 **40** 个专业组
- 冲一冲：**12** 个
- 稳一稳：**20** 个
- 保一保：**8** 个

## 🚀 冲一冲（录取概率 < 35%）

这些院校有一定冲击机会，如果被录取会很高兴。建议挑选其中最心仪的院校填报。

### 1. 南京大学 - 物理类专业组01

\`\`\`recommendation-card
{
  "groupId": "10284-01",
  "collegeName": "南京大学",
  ...完整JSON数据
}
\`\`\`

### 2. 东南大学 - 物理类专业组02

\`\`\`recommendation-card
{
  "groupId": "10286-02",
  "collegeName": "东南大学",
  ...完整JSON数据
}
\`\`\`

...（更多卡片）

## 🎯 稳一稳（录取概率 35-90%）

...

## 🛡️ 保一保（录取概率 90-99%）

...

---

💡 **友情提示**
- 点击任意卡片可查看更多详情
- 您可以一键将喜欢的专业组加入志愿表
- 如有疑问，可以继续询问我关于这些院校的问题
```

## 前端渲染效果

前端会：
1. 检测消息中的 `\`\`\`recommendation-card` 代码块
2. 解析 JSON 数据
3. 渲染为交互式卡片组件
4. 提供以下交互功能：
   - 查看详细信息
   - 一键加入志愿表
   - 继续询问（预定义问题模板）

## API 使用示例

### 通过聊天接口请求推荐

**请求**:
```bash
POST /api/ai/chat
Content-Type: application/json

{
  "message": "我想学计算机专业",
  "sessionId": "xxx",
  "userId": "user123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "message": "# 🎯 智能推荐结果\n\n## 📊 推荐摘要\n...\n\n```recommendation-card\n{...}\n```",
    "sessionId": "xxx",
    "success": true,
    "metadata": {
      "totalTokens": 5000,
      "executionTime": 3000,
      "iterationsCount": 2
    }
  }
}
```

### 流式接口

**请求**:
```bash
POST /api/ai/chat-stream
Content-Type: application/json

{
  "message": "我想学计算机专业",
  "sessionId": "xxx",
  "userId": "user123"
}
```

**响应（SSE流）**:
```
data: {"type":"session","sessionId":"xxx"}

data: {"type":"content","content":"# 🎯 智能推荐结果\n\n"}

data: {"type":"content","content":"## 📊 推荐摘要\n\n"}

...

data: {"type":"content","content":"```recommendation-card\n"}

data: {"type":"content","content":"{\"groupId\":\"10284-01\",...}\n"}

data: {"type":"content","content":"```\n"}

...

data: {"type":"done","success":true,"message":"...完整内容","conversationHistory":[...]}
```

## 测试

### 测试场景

1. **基本推荐测试**
   - 用户提问："我想学计算机专业"
   - 预期：返回冲稳保推荐，每个推荐包含完整的卡片数据

2. **带偏好的推荐测试**
   - 用户提问："江苏省内的985大学，计算机专业"
   - 预期：返回符合条件的推荐，每个卡片标注985标签

3. **卡片数据完整性测试**
   - 检查每个卡片是否包含所有必填字段
   - 检查 JSON 格式是否正确
   - 检查数值精度（保留2位小数）

4. **前端解析测试**
   - 前端是否能正确检测 `recommendation-card` 代码块
   - 前端是否能正确解析 JSON
   - 前端是否能正确渲染卡片

### 测试命令

```bash
# 编译检查
npx tsc --noEmit

# 启动服务器
npm run dev

# 测试API（需要先登录获取token，然后提供分数/位次）
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我是江苏考生，物理类，高考分数650分，位次1200名，我想学计算机专业",
    "userId": "test-user"
  }'
```

## 注意事项

### 1. 数据质量
- 确保所有必填字段都有值
- `probability` 和 `confidence` 应在 0-100 范围内
- `scoreGap` 正负符号要正确（正数=有优势，负数=有风险）
- `historicalData` 应按年份倒序排列

### 2. JSON 格式
- 所有字符串使用双引号
- 数字不加引号
- 布尔值使用 `true`/`false`，不要用字符串
- 数组和对象结构完整

### 3. AI Prompt 指导
- AI 必须直接输出 `formattedCards` 的内容
- AI 不应该修改或简化卡片数据
- AI 不应该用其他格式（表格、列表）替代卡片

### 4. 性能优化
- 冲稳保推荐分别限制数量（冲12、稳20、保8）
- 折叠显示较多推荐（使用 `<details>` 标签）
- 历史数据限制在近3-5年

## 故障排查

### 问题：前端无法检测到推荐卡片
**原因**：AI没有输出 `formattedCards` 内容，或者格式不正确
**解决**：
1. 检查 `smartRecommendation.tool.ts` 是否返回完整数据
2. 检查 `agent.service.ts` 是否正确检测并格式化
3. 检查 AI 返回的消息内容是否包含 ` ```recommendation-card` 代码块

### 问题：推荐卡片 JSON 解析失败
**原因**：JSON 格式错误
**解决**：
1. 检查是否使用双引号
2. 检查数字和布尔值是否正确（不要加引号）
3. 使用 JSON validator 验证格式
4. 检查 `RecommendationCardFormatter.formatSingleCard()` 的输出

### 问题：推荐理由或警告信息缺失
**原因**：`SmartRecommendationTool.formatGroup()` 没有生成
**解决**：
1. 检查 `generateWarnings()` 方法
2. 检查 `generateHighlights()` 方法
3. 确保 `group.recommendReasons` 不为空

### 问题：历史数据不完整
**原因**：`SmartRecommendationService` 查询历史数据失败
**解决**：
1. 检查 `admission_scores` 表是否有数据
2. 检查查询条件是否正确
3. 查看服务器日志确认错误原因

## 相关文件

- `src/ai/utils/recommendationCardFormatter.ts` - 推荐卡片格式化工具
- `src/ai/tools/smartRecommendation.tool.ts` - 智能推荐工具
- `src/ai/agent.service.ts` - AI Agent 服务
- `src/types/structuredRecommendation.ts` - 类型定义
- `src/services/smartRecommendation.service.ts` - 推荐业务逻辑
- `src/services/admissionProbability.service.ts` - 概率计算服务

## 版本历史

### v2.2.0 - 2025-01-31
- ✨ 新增推荐卡片自动格式化功能
- ✨ 完善 StructuredGroupRecommendation 数据格式
- ✨ AI Agent 自动检测并转换推荐数据为卡片格式
- 📝 更新 system prompt 指导 AI 输出推荐卡片
- 🐛 修复 SmartRecommendationTool 返回数据不完整的问题

## 联系方式

如有疑问或需要调整，请联系后端开发团队。
