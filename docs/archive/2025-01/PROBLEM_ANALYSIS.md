# 对话问题核心分析报告

## 🔍 问题清单

### 1. ❌ 冲稳保分类算法严重不合理

#### 问题表现：
```
【冲一冲】录取概率 0%
- 北京大学 (分数差 -55.3分, 概率 0%)
- 清华大学 (分数差 -55.7分, 概率 0%)
- 东南大学 (分数差 -24.0分, 概率 0%)

【稳一稳】录取概率 40-45%
- 东北大学 (分数差 -2.7分, 概率 40%)
- 南京理工大学 (分数差 -1.0分, 概率 45%)

【保一保】录取概率 86-100%
- 东南大学05专业组 (分数差 +130.0分, 概率 100%) ← 明显错误！
- 河海大学 (分数差 +9.0分, 概率 86%)
```

#### 根本原因：

1. **冲一冲定义错误**
   - 当前：概率 < 35% 就算"冲"
   - 问题：包含了大量概率 0% 的学校（分数差 -50分以上）
   - 正确："冲"应该是有一定可能性但不稳的（概率 15-35%）

2. **保一保数据异常**
   - 东南大学05专业组：最低分 508 分（明显是中外合作或特殊专业）
   - 用户 638 分，差距 130 分 → 100% 概率
   - 这不是"保"，这是浪费志愿！

3. **缺少合理的分数区间筛选**
   - 应该预先过滤掉：
     - 分数差 > +15分（太稳了，浪费）
     - 分数差 < -20分（太冲了，无意义）

### 2. ❌ AI 重复调用 set_user_profile 和 smart_recommendation

#### 问题表现：
```
1. smart_recommendation → 报错"缺少位次"
2. set_user_profile → 保存信息
3. smart_recommendation → 仍然报错"缺少位次"
4. score_to_rank → 查询位次
5. smart_recommendation → 仍然报错"缺少位次"
6. set_user_profile → 再次保存
7. smart_recommendation → 终于成功
```

#### 根本原因：

1. **UserProfileManager 和 ConversationContextManager 数据不同步**
   - `set_user_profile` 更新 UserProfileManager (userId 作为 key)
   - `smart_recommendation` 读取 ConversationContextManager (sessionId 作为 key)
   - 我们之前修复了 `set_user_profile` 同时更新两个管理器，但可能还有同步问题

2. **AI 不理解错误信息**
   - 看到"缺少位次"就一直重复调用
   - 没有检查自己已经调用过 score_to_rank

### 3. ❌ 志愿表添加功能失败

#### 问题表现：
```
AI: "系统未找到相应的专业组，可能是数据存在误差"
AI: 重新查询后成功添加7个专业组到第3-9位
User: "现在志愿表长啥样"
AI: "很遗憾，目前没有查询到您的志愿批次相关信息"
```

#### 根本原因：

1. **add_groups_batch 工具查询专业组失败**
   - 可能是 college_code + group_code 不匹配
   - enrollment_plans 数据与 AI 返回的数据格式不一致

2. **志愿表查询使用 userId，批次创建可能有问题**
   - 添加时说"添加到第3-9位"
   - 查询时说"没有志愿批次"
   - 数据不一致！

### 4. ❌ Markdown 展示不友好

#### 问题：
- 大量数据挤在表格中
- 没有交互能力（一键添加、详细查看）
- 不能展示完整的历年数据趋势
- 缺少可视化（图表、分数线对比）

## ✅ 解决方案设计

### 方案一：修复冲稳保分类算法（最紧急）

#### 修改位置：[src/services/admissionProbability.service.ts](src/services/admissionProbability.service.ts)

**当前逻辑**：
```typescript
if (probability < 35) return '冲';
if (probability >= 35 && probability <= 70) return '稳';
return '保';
```

**新逻辑**：
```typescript
// 1. 先按分数差过滤不合理的推荐
if (scoreGap < -20) return null;  // 太冲，没意义
if (scoreGap > 15) return null;   // 太保，浪费

// 2. 综合概率和分数差判断
if (probability < 15) return '冲';       // 低概率冲刺
if (probability >= 15 && probability < 35) return '冲';  // 中低概率冲刺
if (probability >= 35 && probability <= 65) return '稳'; // 稳妥选择
if (probability > 65 && probability <= 85) return '保';  // 保底
if (probability > 85) return null;  // 太稳，浪费志愿

// 3. 特殊规则：分数差异常的情况
if (scoreGap < -15 && probability < 10) return null;  // 分数差太大且概率太低
if (scoreGap > 10 && probability > 90) return null;   // 分数高太多，浪费
```

### 方案二：修复数据同步问题

#### 2.1 统一使用 sessionId
修改 `set_user_profile` 工具，确保同时更新两个管理器并打印日志：

```typescript
// UserProfileManager 使用 userId
this.profileManager.updateProfile(userId, data);

// ConversationContextManager 使用 sessionId
this.contextManager.updateUserProfile(sessionId, {
  score: params.score,
  rank: params.rank,
  province: params.province,
  category: params.subjectType,
  year: params.year,
  preferences: {}
});

console.log(`✅ 数据已同步:`);
console.log(`   - UserProfileManager[userId=${userId}]`);
console.log(`   - ConversationContextManager[sessionId=${sessionId}]`);
```

#### 2.2 添加数据验证
在 `smart_recommendation` 执行前验证数据：

```typescript
const userProfile = this.contextManager.getUserProfile(sessionId);
console.log(`🔍 读取用户档案[sessionId=${sessionId}]:`, userProfile);

if (!userProfile?.rank) {
  // 尝试从 UserProfileManager 读取
  const fallbackProfile = UserProfileManager.getInstance().getProfile(userId);
  if (fallbackProfile?.rank) {
    // 同步数据
    this.contextManager.updateUserProfile(sessionId, fallbackProfile);
  }
}
```

### 方案三：修复志愿表功能

#### 3.1 统一批次管理
确保 `add_groups_batch` 自动创建默认批次：

```typescript
async execute(params, context) {
  const userId = this.getUserId(context);

  // 查询或创建默认批次
  let batch = await this.getBatchByUserId(userId);
  if (!batch) {
    batch = await this.createDefaultBatch(userId, {
      name: '本科批次',
      year: 2025,
      province: '江苏'
    });
  }

  // 添加专业组...
}
```

#### 3.2 修复专业组查询
添加更宽松的查询条件：

```typescript
// 尝试多种匹配策略
let group = await this.findByCollegeCodeAndGroupCode(collegeCode, groupCode);

if (!group) {
  // 尝试通过名称模糊匹配
  group = await this.findByCollegeNameAndGroupName(collegeName, groupName);
}

if (!group) {
  console.warn(`未找到专业组: ${collegeName} ${groupName}`);
  return null;
}
```

### 方案四：设计结构化数据返回格式

#### 4.1 新增数据结构
```typescript
export interface SmartRecommendationForFrontend {
  // 元数据
  meta: {
    userId: string;
    score: number;
    rank: number;
    province: string;
    category: string;
    generatedAt: string;
  };

  // 推荐结果（结构化）
  recommendations: {
    rush: RecommendationGroup[];    // 冲 (12个)
    stable: RecommendationGroup[];  // 稳 (20个)
    safe: RecommendationGroup[];    // 保 (8个)
  };

  // 统计信息
  stats: {
    totalCount: number;
    rushCount: number;
    stableCount: number;
    safeCount: number;
    avg985Count: number;
    avg211Count: number;
  };

  // 可视化数据
  charts: {
    scoreDistribution: ChartData;  // 分数分布图
    probabilityDistribution: ChartData;  // 概率分布图
    collegeTypeDistribution: ChartData;  // 院校类型分布
  };
}

export interface RecommendationGroup {
  // 基础信息
  id: string;  // 用于前端唯一标识
  collegeCode: string;
  collegeName: string;
  groupCode: string;
  groupName: string;

  // 院校标签
  tags: string[];  // ['985', '211', '双一流', '江苏', '计算机类']

  // 录取分析
  probability: number;
  riskLevel: '冲' | '稳' | '保';
  scoreGap: number;
  rankGap: number;

  // 历年数据（用于图表）
  historicalScores: HistoricalScore[];

  // 专业列表
  majors: {
    majorName: string;
    planCount: number;
    tuition: number;
  }[];

  // 推荐理由
  reasons: string[];

  // 操作按钮数据
  actions: {
    canAddToVolunteer: boolean;
    canViewDetail: boolean;
    detailUrl?: string;
  };
}
```

#### 4.2 新增 API 端点
```typescript
// 1. 获取结构化推荐
GET /api/recommendations/:userId/structured
Response: SmartRecommendationForFrontend

// 2. 添加推荐到志愿表（批量）
POST /api/volunteers/batch/add-recommendations
Body: {
  recommendationIds: string[];
  batchId?: string;
}

// 3. 获取单个推荐的详细信息
GET /api/recommendations/:id/detail
Response: DetailedRecommendation (包含完整专业列表、历年趋势等)
```

### 方案五：前端组件设计

#### 5.1 推荐卡片组件
```typescript
<RecommendationCard
  recommendation={group}
  onAddToVolunteer={(id) => handleAdd(id)}
  onViewDetail={(id) => handleViewDetail(id)}
  onAskMore={(id) => handleAskMore(id)}
/>
```

功能：
- 展示核心信息（院校、专业组、概率、分数差）
- 一键添加到志愿表
- 查看详细历年数据
- 继续询问（自动填充上下文）

#### 5.2 历年数据图表组件
```typescript
<HistoricalTrendChart
  data={group.historicalScores}
  userScore={638}
  userRank={8837}
/>
```

功能：
- 折线图展示历年分数趋势
- 标注用户分数位置
- 显示分数波动性

#### 5.3 推荐列表组件
```typescript
<RecommendationList
  recommendations={recommendations}
  groupBy="riskLevel"  // 按冲稳保分组
  sortBy="probability"  // 按概率排序
  filters={{
    collegeType: ['985', '211'],
    location: ['江苏'],
    scoreRange: [-10, 5]
  }}
/>
```

## 📋 实施计划

### 优先级 P0 (立即修复)
1. ✅ 修复冲稳保分类算法
2. ✅ 修复数据同步问题
3. ✅ 修复志愿表添加功能

### 优先级 P1 (本周完成)
4. 设计结构化数据返回格式
5. 实现新的 API 端点
6. 更新 AI Prompt 避免重复调用

### 优先级 P2 (下周完成)
7. 前端组件开发
8. 数据可视化图表
9. 完善用户体验

## 🎯 预期效果

修复后的对话：
```
用户: "给我推荐计算机专业相关学校"
AI:
  ✓ smart_recommendation 执行完成

  已为您推荐40个计算机专业组：

  【冲一冲 12个】概率 15-35%
  1. 厦门大学06专业组 (录取概率 28%, 分数差 -8分)
  2. 大连理工大学03专业组 (录取概率 25%, 分数差 -6分)
  ...

  【稳一稳 20个】概率 35-65%
  1. 南京理工大学02专业组 (录取概率 55%, 分数差 -1分)
  2. 北京交通大学05专业组 (录取概率 48%, 分数差 -3分)
  ...

  【保一保 8个】概率 65-85%
  1. 河海大学04专业组 (录取概率 78%, 分数差 +5分)
  2. 南京航空航天大学 (录取概率 82%, 分数差 +8分)
  ...

  [查看详细数据] [一键添加全部] [筛选条件]

用户: "添加江苏省内的到志愿表"
AI:
  ✓ add_filtered_to_volunteer 执行完成

  已添加 5个江苏省内专业组到志愿表第1-5位：
  1. 东南大学06专业组 (冲, 概率25%)
  2. 南京理工大学02专业组 (稳, 概率55%)
  3. 河海大学04专业组 (保, 概率78%)
  ...

  [查看志愿表] [继续调整]
```
