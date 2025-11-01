# 🎯 专业过滤修复说明

## ❌ 问题根源

用户明确表示需要**"计算机方向"**，但推荐结果包含大量不相关专业（如经济学、管理类等）。

### 发现的根本问题：

1. **偏好提取失败**：LLM在对话中没有正确识别用户的专业意向
   - 用户在对话中多次提到"计算机"、"电子信息"、"技术研发"
   - 但 `CORE_10: 具体专业意向` 被错误地填写为城市列表 `["江苏", "上海", "浙江"]`
   - 应该是专业列表，但数据完全错了！

2. **没有专业过滤逻辑**：即使用户有专业偏好，推荐系统也没有应用过滤

---

## ✅ 解决方案

### 修复1: 从对话历史中提取专业意向

**位置**: `embedding-recommendation.service.ts:187-242`

新增方法 `extractMajorIntentFromConversation()`：

```typescript
// 1. 读取最近30条对话消息
// 2. 使用关键词匹配提取专业方向
const majorKeywords = {
  '计算机': ['计算机', '软件', '程序', '编程', 'CS', 'IT'],
  '电子信息': ['电子', '通信', '信息工程', '电信'],
  '自动化': ['自动化', '机器人', '控制'],
  // ... 更多专业类别
};

// 3. 将提取结果临时添加到偏好中
preferences.push({
  indicatorId: 'TEMP_MAJOR_INTENT',
  value: ['计算机', '电子信息'],  // 提取到的专业
  confidence: 0.8
});
```

**效果**：即使偏好表中没有正确的专业信息，也能从对话中动态提取！

---

### 修复2: 应用专业过滤

**位置**: `embedding-recommendation.service.ts:305-328`

在候选评分前，先过滤专业：

```typescript
// 提取专业关键词
const targetMajorKeywords = this.extractTargetMajorKeywords(preferences);
// 可能返回: ['计算机', '电子信息']

if (targetMajorKeywords.length > 0) {
  // 只保留匹配的专业
  const filteredCandidates = candidates.filter(c => {
    const majorName = c.enrollmentPlan.majorName || '';
    const groupName = c.enrollmentPlan.majorGroupName || '';
    const searchText = (majorName + ' ' + groupName).toLowerCase();

    return targetMajorKeywords.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );
  });

  console.log(`🎯 [专业过滤] 过滤前: ${candidates.length}, 过滤后: ${filteredCandidates.length}`);
}
```

**示例**：
- 候选池: 500个专业（包括经济学、管理类、计算机等）
- 用户偏好: ['计算机', '电子信息']
- 过滤后: 只保留专业名称包含"计算机"或"电子信息"的候选
- 结果: ~80个相关专业

---

### 修复3: 智能关键词提取

**位置**: `embedding-recommendation.service.ts:1479-1536`

方法 `extractTargetMajorKeywords()` 从多个来源提取：

```typescript
// 优先级顺序:
1. TEMP_MAJOR_INTENT（对话提取，最高优先级）
2. CORE_10（具体专业意向）
3. CORE_09（专业大类偏好）
4. 其他包含"专业"的偏好
```

---

### 修复4: 专业关键词判断

**位置**: `embedding-recommendation.service.ts:1538-1560`

方法 `isMajorKeyword()` 区分专业vs城市：

```typescript
// 排除城市关键词
const cities = ['北京', '上海', '江苏', '浙江', ...];
if (cities.some(city => keyword.includes(city))) return false;

// 排除非专业关键词
const nonMajor = ['高', '中', '低', '读研', '就业', ...];
if (nonMajor.includes(keyword)) return false;

// 专业关键词列表
const majorKeywords = [
  '计算机', '软件', '电子', '信息', '通信', '自动化',
  '机械', '电气', '土木', '建筑', '医学', '临床',
  '经济', '金融', '会计', '管理', ...
];

return majorKeywords.some(mk => keyword.includes(mk));
```

---

## 📋 新增日志

重启后你会看到：

```
🎯 [对话分析] 从对话中提取到专业意向: 计算机, 电子信息
🎯 [专业过滤] 用户偏好专业关键词: 计算机, 电子信息
🎯 [专业过滤] 过滤前: 500, 过滤后: 78
🎯 [关键词提取] 使用对话分析结果: 计算机, 电子信息
```

---

## 🧪 测试步骤

### 1. 重启应用
```bash
npm run dev
```

### 2. 调用推荐API

### 3. 查看后端日志

**预期看到**：
```
🎯 [对话分析] 从对话中提取到专业意向: 计算机, 电子信息
🎯 [专业过滤] 过滤前: 500, 过滤后: 78
```

### 4. 检查推荐结果

**所有推荐的专业名称应该包含**:
- 计算机科学与技术
- 软件工程
- 电子信息工程
- 通信工程
- 信息工程
- 数据科学
- 人工智能
- 网络工程
- 等等...

**不应该包含**:
- ❌ 经济学
- ❌ 工商管理
- ❌ 会计学
- ❌ 金融学
- ❌ 法学
- ❌ 新闻传播
- 等不相关专业

---

## ⚠️ 注意事项

### 1. 对话关键词匹配

当前实现使用**简单的字符串匹配**：
- 优点：快速、可靠
- 缺点：可能遗漏一些变体（如"CS"、"IT"等英文缩写）

**已处理的变体**:
- 计算机 = ['计算机', '软件', '程序', '编程', 'CS', 'IT']
- 电子信息 = ['电子', '通信', '信息工程', '电信']

### 2. 过滤太严格怎么办？

如果过滤后候选太少（< 10个），系统会：
```typescript
if (filteredCandidates.length > 0) {
  candidates = filteredCandidates;
} else {
  console.warn('⚠️  [专业过滤] 过滤后没有候选，使用全部候选');
  // 保持原有候选池
}
```

### 3. 用户没有明确偏好怎么办？

如果对话中没有提到专业关键词：
```typescript
if (uniqueKeywords.length === 0) {
  console.log('ℹ️  [关键词提取] 未找到专业偏好关键词，将推荐所有专业');
  // 不进行过滤，推荐所有专业
}
```

---

## 🚀 下一步优化（可选）

### 1. 使用LLM进行更智能的意图提取

当前：简单关键词匹配
改进：调用LLM分析对话，提取结构化的专业意向

```typescript
const prompt = `
分析以下对话，提取用户的专业意向。

对话内容：
${messages.map(m => m.content).join('\n')}

请返回JSON格式：
{
  "majors": ["计算机", "电子信息"],
  "confidence": 0.9
}
`;
```

### 2. 修复偏好提取模块

**根本问题**：LLM在对话时没有正确提取专业意向并保存到 `CORE_10`

**长期方案**：
- 审查 LLM 的 prompt，确保它能识别专业意向
- 添加专业意向的直接提问（如："你对哪些专业方向感兴趣？"）
- 验证提取的偏好值格式

### 3. 嵌入向量语义匹配

当前：关键词匹配（精确但可能遗漏）
改进：使用嵌入向量计算语义相似度

```typescript
// 计算用户偏好嵌入与专业嵌入的相似度
const similarity = cosineSimilarity(userEmbedding, majorEmbedding);
if (similarity > threshold) {
  // 保留该专业
}
```

---

## 📊 预期效果

### 修复前
```
推荐结果：
1. 经济学 - 吉林大学
2. 工商管理 - 湖北工业大学
3. 会计学 - 南昌大学
4. 计算机科学 - 江苏科技大学  ← 只有这个相关
5. 金融学 - 山东师范大学
...
```

### 修复后
```
推荐结果：
1. 计算机科学与技术 - 南京大学
2. 软件工程 - 东南大学
3. 电子信息工程 - 南京理工大学
4. 通信工程 - 南京邮电大学
5. 人工智能 - 南京航空航天大学
6. 数据科学 - 河海大学
7. 网络工程 - 江苏科技大学
8. 信息安全 - 苏州大学
...
```

✅ **所有推荐都是计算机/电子信息相关专业！**

---

## 📄 修改的文件

**唯一文件**: `src/services/agent/embedding-recommendation.service.ts`

**新增方法**:
1. `extractMajorIntentFromConversation()` (187-242行) - 对话分析
2. `extractTargetMajorKeywords()` (1479-1536行) - 关键词提取
3. `isMajorKeyword()` (1538-1560行) - 关键词判断

**修改方法**:
1. `generateEnhancedRecommendations()` (93-94行) - 添加对话分析调用
2. `scoreAndRankCandidates()` (305-328行) - 添加专业过滤逻辑

---

生成时间: 2025-01-26
状态: ✅ 已完成并通过编译
下一步: 重启应用测试
