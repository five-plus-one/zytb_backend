# Smart Recommendation 空结果问题诊断报告

## 🔍 问题现象

用户输入: "我想去学习计算机方向的专业"
- 用户分数: 638
- 用户位次: 8837
- 省份: 江苏
- 科类: 物理类
- 年份: 2025

AI 调用 `smart_recommendation` 4次，每次都返回空结果。

## 🎯 根本原因分析

### 问题1: 用户偏好未被提取和传递 ❌

**现象**:
```typescript
AI 调用: smart_recommendation({ preferences: {} })
// preferences 为空对象，没有 majors 或 majorCategories
```

**根本原因**:
`ConversationContextManager` 有 `extractPreferencesFromInput()` 方法可以从"计算机"关键词提取偏好，但这个方法**从未被调用**！

**代码位置**: [src/ai/utils/conversationContext.manager.ts:397-450](src/ai/utils/conversationContext.manager.ts#L397-L450)

```typescript
extractPreferencesFromInput(sessionId: string, input: string): void {
  const majorKeywords = [
    { pattern: /计算机|软件|编程|代码|程序/i, categories: ['计算机类'], majors: ['计算机科学与技术', '软件工程'] },
    // ...
  ];
  // 这个方法从未被调用！
}
```

**影响**:
- SmartRecommendationService 收到空的 preferences
- 查询时没有专业筛选条件
- 查询结果包含所有专业

### 问题2: 历史数据查询失败导致专业组被跳过 ❌

**现象**:
```
[SmartRecommendation] 查询到 1500 条招生计划
[SmartRecommendation] 聚合后共 500 个专业组
[SmartRecommendation] 跳过无历史数据的专业组: XXX大学 XXX专业组
... (重复500次)
最终返回 0 个推荐
```

**根本原因**:
在 [src/services/smartRecommendation.service.ts:244-258](src/services/smartRecommendation.service.ts#L244-L258) 中:

```typescript
const historicalData = await this.admissionScoreRepo
  .createQueryBuilder('as')
  .where('as.collegeCode = :collegeCode', { collegeCode: group.collegeCode })
  .andWhere('as.groupCode = :groupCode', { groupCode: group.groupCode })
  .andWhere('as.sourceProvince = :province', { province: userProfile.province })
  .andWhere('as.subjectType = :category', { category: userProfile.category })
  .andWhere('as.year < :year', { year: userProfile.year })
  .orderBy('as.year', 'DESC')
  .limit(3)
  .getMany();

if (historicalData.length === 0) {
  // 跳过没有历史数据的专业组
  continue;  // ← 这里导致所有专业组被跳过！
}
```

**为什么历史数据为空**:

1. **数据匹配问题**: enrollment_plans 中的 `major_group_code` 可能与 admission_scores 中的 `group_code` 格式不一致
   - enrollment_plans: `major_group_code = "04"`
   - admission_scores: `group_code = "（04）"` 或 `"清华大学04专业组"`

2. **年份过滤问题**: 查询条件 `as.year < :year` 使用 2025
   - 但 admission_scores 中最新数据是 2024年
   - 应该查询 `<= 2024` 的数据

### 问题3: AI Prompt 未明确要求传递偏好参数

**现象**:
AI 调用工具时使用:
```typescript
smart_recommendation({
  preferences: {}  // 空对象
})
```

而不是:
```typescript
smart_recommendation({
  preferences: {
    majorCategories: ['计算机类'],
    majors: ['计算机科学与技术', '软件工程']
  }
})
```

## ✅ 解决方案

### 方案一: 在 SmartRecommendationTool 中自动提取偏好（推荐）

**修改位置**: [src/ai/tools/smartRecommendation.tool.ts:140-145](src/ai/tools/smartRecommendation.tool.ts#L140-L145)

```typescript
async execute(params: Record<string, any>, context?: ToolExecutionContext) {
  const sessionId = context?.sessionId || 'default';

  // ===== 新增：自动从上下文提取偏好 =====
  // 如果 AI 没有明确传递偏好，尝试从用户档案中获取
  const userProfile = this.contextManager.getUserProfile(sessionId);

  const preferences: UserPreferences = {
    ...userProfile?.preferences,  // 从档案中获取已保存的偏好
    ...params.preferences           // AI 显式传递的偏好优先
  };

  // 继续执行...
}
```

**优势**:
- 不依赖 AI 是否传递参数
- 自动使用之前提取的偏好
- 向后兼容

### 方案二: 在 AgentService 中自动提取偏好

**修改位置**: [src/ai/agent.service.ts](src/ai/agent.service.ts)

在调用工具前，从用户消息中提取偏好：

```typescript
// 在工具调用前
if (toolName === 'smart_recommendation') {
  ConversationContextManager.getInstance()
    .extractPreferencesFromInput(sessionId, userMessage);
}
```

### 方案三: 修复历史数据查询逻辑（必须）

**修改位置**: [src/services/smartRecommendation.service.ts:244-259](src/services/smartRecommendation.service.ts#L244-L259)

```typescript
// 问题1: groupCode 可能格式不一致，需要模糊匹配
const historicalData = await this.admissionScoreRepo
  .createQueryBuilder('as')
  .where('as.collegeCode = :collegeCode', { collegeCode: group.collegeCode })
  .andWhere('(as.groupCode = :groupCode OR as.groupName LIKE :groupName)', {
    groupCode: group.groupCode,
    groupName: `%${group.groupName}%`
  })
  .andWhere('as.sourceProvince = :province', { province: userProfile.province })
  .andWhere('as.subjectType = :category', { category: userProfile.category })
  .andWhere('as.year <= :year', { year: 2024 })  // ← 修改为 <=
  .orderBy('as.year', 'DESC')
  .limit(3)
  .getMany();

// 问题2: 如果还是没有数据，尝试按 collegeName + majorName 匹配
if (historicalData.length === 0) {
  historicalData = await this.admissionScoreRepo
    .createQueryBuilder('as')
    .where('as.collegeName = :collegeName', { collegeName: group.collegeName })
    .andWhere('as.sourceProvince = :province', { province: userProfile.province })
    .andWhere('as.subjectType = :category', { category: userProfile.category })
    .andWhere('as.year <= :year', { year: 2024 })
    .orderBy('as.year', 'DESC')
    .limit(3)
    .getMany();

  if (historicalData.length === 0) {
    console.log(`[SmartRecommendation] 跳过无历史数据的专业组: ${group.collegeName} ${group.groupName}`);
    continue;
  }
}
```

### 方案四: 更新 System Prompt 明确要求

**修改位置**: [src/ai/agent.service.ts:201-241](src/ai/agent.service.ts#L201-L241)

```markdown
## 智能推荐工具使用规范

### 传递用户偏好参数（重要！）

当用户明确提到专业方向时，必须在 preferences 中传递：

✅ 正确示例:
用户: "我想学计算机专业"
AI: smart_recommendation({
  preferences: {
    majorCategories: ['计算机类'],
    majors: ['计算机科学与技术', '软件工程']
  }
})

❌ 错误示例:
用户: "我想学计算机专业"
AI: smart_recommendation({
  preferences: {}  // 空对象！
})

### 专业关键词映射
- 计算机/软件/编程 → majorCategories: ['计算机类']
- 电子/通信 → majorCategories: ['电子信息类']
- 机械/自动化 → majorCategories: ['机械类', '自动化类']
```

## 📊 数据库状态检查

### admission_scores 表统计:
- 总记录数: 18,363
- 已有 college_code: 18,036 (98%)
- 已有 group_code: 18,363 (100%)
- 计算机相关专业: 10+ 条（包括清华、北大、复旦等）

### 示例数据:
```
清华大学 - 计算机类 (2024年: 708分) group_code: 04
北京大学 - 计算机类 (2024年: 693分) group_code: 05
复旦大学 - 计算机科学与技术 (2024年: 684分) group_code: （05）
```

**问题**: group_code 格式不一致！
- enrollment_plans: `"04"`
- admission_scores: `"04"` 或 `"（04）"` 或 `"清华大学04专业组"`

## 🎯 推荐实施顺序

1. **立即修复**: 方案三 - 修复历史数据查询逻辑（最关键）
2. **强烈推荐**: 方案一 - SmartRecommendationTool 自动提取偏好
3. **可选优化**: 方案四 - 更新 System Prompt
4. **长期优化**: 统一 group_code 格式

## 🧪 验证步骤

修复后测试:
1. 用户输入: "我想学计算机专业"
2. 期望: 返回 40 个计算机相关专业组推荐
3. 验证: 检查日志输出查询到的专业组数量
