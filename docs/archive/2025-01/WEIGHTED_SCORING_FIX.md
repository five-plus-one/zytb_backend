# ✅ 加权评分模型修复

## 🎯 问题根源

用户反馈：
> "你需要分别计算对于用户来说各个维度的分数,然后乘上对应的百分比来加权计算,从而得到一个比较科学合理的结果"

### 发现的问题：

1. **使用了硬过滤而不是加权评分**
   - 之前的实现：如果用户想要"计算机"专业，就直接过滤掉所有非计算机专业
   - 问题：用户可能同时有其他偏好（如"本省优先"），硬过滤可能导致交集为空

2. **总分计算混合了用户定义权重和固定权重**
   ```typescript
   // ❌ 错误的实现
   const totalScore =
     dimensionScores.collegeScore * (weights.college / 100) +  // 用户定义
     dimensionScores.majorScore * (weights.major / 100) +      // 用户定义
     dimensionScores.cityScore * (weights.city / 100) +        // 用户定义
     dimensionScores.embeddingMatchScore * 0.3 +               // 固定权重
     dimensionScores.employmentScore * 0.1 +                   // 固定权重
     dimensionScores.personalityFitScore * 0.1 +               // 固定权重
     dimensionScores.careerAlignmentScore * 0.1;               // 固定权重
   ```
   - 问题：混合了用户定义的权重（CORE_01）和固定权重
   - 结果：用户的CORE_01权重配置（如 major: 50%, college: 30%, city: 20%）没有得到正确应用

3. **各维度评分没有统一到0-100标准**
   - 部分维度返回0-100分数
   - 部分维度使用其他评分逻辑
   - 导致加权计算不准确

---

## ✅ 解决方案

### 修复1: 统一所有维度得分为0-100标准分数

**修改的方法**:

#### 1.1 `calculateMajorScore()` - 专业匹配度评分

**位置**: `embedding-recommendation.service.ts:1006-1089`

**评分逻辑**:
```typescript
private calculateMajorScore(
  major: Major | null,
  majorName?: string,
  majorGroupName?: string,
  preferences?: AgentPreference[]
): number {
  let score = 50; // 基础分（中性）
  let matchBonus = 0; // 匹配加分

  // 提取用户的专业偏好关键词
  const targetMajorKeywords = this.extractTargetMajorKeywords(preferences || []);

  if (targetMajorKeywords.length > 0) {
    // 精确匹配: +50分 (最终100分)
    if (currentMajorName.toLowerCase() === keyword.toLowerCase()) {
      matchBonus = 50;
    }
    // 包含匹配: +40分 (最终90分)
    else if (searchText.includes(keyword.toLowerCase())) {
      matchBonus = Math.max(matchBonus, 40);
    }
    // 相关匹配: +30分 (最终80分)
    // 例如: "计算机" 匹配 "软件工程"、"数据科学"
    else if (isRelatedMajor(keyword, searchText)) {
      matchBonus = Math.max(matchBonus, 30);
    }
    // 完全不匹配: -40分 (最终10分)
    else {
      matchBonus = -40;
    }
  }

  // 专业质量加分
  if (major) {
    if (major.employmentRate >= 90) qualityBonus += 5;
    if (major.avgSalary >= 10000) qualityBonus += 5;
  }

  return Math.max(0, Math.min(100, score + matchBonus + qualityBonus));
}
```

**示例**:
- 用户偏好: ["计算机", "电子信息"]
- 候选1: "计算机科学与技术" → 100分（精确匹配 + 质量加分）
- 候选2: "软件工程" → 90分（包含匹配）
- 候选3: "数据科学" → 85分（相关匹配 + 质量加分）
- 候选4: "经济学" → 10分（完全不匹配）

**关键改进**:
- ✅ 不再硬过滤经济学等专业，而是给低分
- ✅ 允许在加权计算中保留这些候选（如果其他维度得分高）

---

#### 1.2 `calculateCityScore()` - 城市匹配度评分

**位置**: `embedding-recommendation.service.ts:770-836`

**评分逻辑**:
```typescript
private calculateCityScore(
  college: any,
  preferences: AgentPreference[],
  userInfo: any
): number {
  let score = 50; // 基础分
  let matchBonus = 0;

  // 1. 省份偏好（最高优先级）
  if (hasLocalPreference(preferences)) {
    if (college.province === userInfo.province) {
      matchBonus += 40; // 本省: +40分
    } else {
      matchBonus -= 30; // 外省: -30分
    }
  }

  // 2. 城市偏好匹配
  if (matchesTargetCity(college, preferences)) {
    matchBonus += 20; // 目标城市: +20分
  }

  // 3. 城市等级加分
  if (isTier1City(college.city)) {
    tierBonus = 10; // 一线城市: +10分
  } else if (isTier2City(college.city)) {
    tierBonus = 5;  // 新一线: +5分
  }

  return Math.max(0, Math.min(100, score + matchBonus + tierBonus));
}
```

**示例**:
- 用户: 江苏考生, 偏好"本省优先", 目标城市"南京"
- 候选1: 南京大学(江苏,南京) → 100分（本省 + 目标城市 + 新一线）
- 候选2: 苏州大学(江苏,苏州) → 95分（本省 + 新一线）
- 候选3: 复旦大学(上海) → 30分（外省 + 一线城市）
- 候选4: 清华大学(北京) → 30分（外省 + 一线城市）

**关键改进**:
- ✅ 不再硬过滤外省院校，而是给低分
- ✅ 允许在加权计算中保留高水平外省院校（如果用户的city权重低）

---

#### 1.3 `calculateCollegeScore()` - 院校实力评分

**位置**: `embedding-recommendation.service.ts:705-764`

**已经返回0-100标准分数**，包括:
- 院校层次评分（985/211/双一流）
- 院校排名评分
- 学科实力评分
- 院校类型匹配

无需修改。

---

### 修复2: 使用纯粹的用户定义权重计算总分

**位置**: `embedding-recommendation.service.ts:651-660`

**新的总分计算公式**:
```typescript
// 计算总分（加权）
// 使用用户定义的权重分配（CORE_01: college%, major%, city%）
// 所有维度得分都已经是0-100的标准分数
const totalScore =
  dimensionScores.collegeScore * (weights.college / 100) +
  dimensionScores.majorScore * (weights.major / 100) +
  dimensionScores.cityScore * (weights.city / 100);

console.log(`[评分调试] 权重分配: 院校${weights.college}%, 专业${weights.major}%, 城市${weights.city}%`);
console.log(`[评分调试] 加权计算: ${dimensionScores.collegeScore.toFixed(2)} × ${weights.college}% + ${dimensionScores.majorScore.toFixed(2)} × ${weights.major}% + ${dimensionScores.cityScore.toFixed(2)} × ${weights.city}% = ${totalScore.toFixed(2)}`);
```

**关键改进**:
- ✅ 移除了所有固定权重（embeddingMatchScore、employmentScore等）
- ✅ 只使用用户定义的三个核心维度权重
- ✅ 添加了详细的调试日志

---

### 修复3: 更新方法签名

**修改的调用**: `embedding-recommendation.service.ts:606`

```typescript
// ❌ 旧版本
dimensionScores.cityScore = this.calculateCityScore(collegeInfo, preferences);

// ✅ 新版本
dimensionScores.cityScore = this.calculateCityScore(collegeInfo, preferences, userInfo);
```

**原因**: 需要传入`userInfo`参数以访问用户省份信息（用于本省偏好判断）

---

## 📊 加权计算示例

### 场景1: 专业优先型考生

**用户偏好**:
- CORE_01: { major: 60%, college: 30%, city: 10% }
- 专业意向: 计算机
- 地域: 本省优先（江苏）

**候选对比**:

| 院校 | 专业得分 | 院校得分 | 城市得分 | 加权总分 | 说明 |
|------|---------|---------|---------|---------|------|
| 南京大学 - 计算机 | 100 | 95 | 100 | **98.5** | 本省顶尖CS |
| 清华大学 - 计算机 | 100 | 100 | 30 | **93** | 外省顶尖CS |
| 南京邮电 - 计算机 | 100 | 70 | 100 | **91** | 本省专业校 |
| 清华大学 - 经济学 | 10 | 100 | 30 | **39** | 外省非目标专业 |

**计算过程**（清华CS）:
```
totalScore = 100 × 60% + 100 × 30% + 30 × 10%
           = 60 + 30 + 3
           = 93分
```

**结论**: 专业权重高，所以即使清华在外省（城市得分低），依然排名第2

---

### 场景2: 本地优先型考生

**用户偏好**:
- CORE_01: { major: 30%, college: 30%, city: 40% }
- 专业意向: 计算机
- 地域: 本省优先（江苏）

**候选对比**:

| 院校 | 专业得分 | 院校得分 | 城市得分 | 加权总分 | 说明 |
|------|---------|---------|---------|---------|------|
| 南京大学 - 计算机 | 100 | 95 | 100 | **98.5** | 本省顶尖CS |
| 南京邮电 - 计算机 | 100 | 70 | 100 | **91** | 本省专业校 |
| 清华大学 - 计算机 | 100 | 100 | 30 | **72** | 外省顶尖CS |
| 苏州大学 - 计算机 | 95 | 75 | 95 | **88.5** | 本省综合校 |

**计算过程**（清华CS）:
```
totalScore = 100 × 30% + 100 × 30% + 30 × 40%
           = 30 + 30 + 12
           = 72分
```

**结论**: 城市权重高，清华虽然专业和院校都是100分，但因为在外省（城市得分30），总分下降到72，排名第3

---

### 场景3: 平衡型考生

**用户偏好**:
- CORE_01: { major: 50%, college: 30%, city: 20% }
- 专业意向: 计算机
- 地域: 本省优先（江苏）

**候选对比**:

| 院校 | 专业得分 | 院校得分 | 城市得分 | 加权总分 | 说明 |
|------|---------|---------|---------|---------|------|
| 南京大学 - 计算机 | 100 | 95 | 100 | **98.5** | 本省顶尖CS |
| 清华大学 - 计算机 | 100 | 100 | 30 | **86** | 外省顶尖CS |
| 南京邮电 - 计算机 | 100 | 70 | 100 | **91** | 本省专业校 |
| 复旦大学 - 计算机 | 95 | 95 | 30 | **82** | 外省顶尖CS |

**计算过程**（清华CS）:
```
totalScore = 100 × 50% + 100 × 30% + 30 × 20%
           = 50 + 30 + 6
           = 86分
```

**结论**: 权重平衡，清华排名第2，在南邮之后

---

## 🔍 关键特性

### 1. 软过滤 vs 硬过滤

**硬过滤（旧版本）**:
```typescript
// ❌ 直接移除不匹配的专业
if (targetMajorKeywords.length > 0) {
  candidates = candidates.filter(c =>
    targetMajorKeywords.some(keyword =>
      c.majorName.includes(keyword)
    )
  );
}
```

**软过滤（新版本）**:
```typescript
// ✅ 给不匹配的专业低分，但不移除
if (!hasMatch) {
  matchBonus = -40; // 降低分数，但保留候选
}
```

**优势**:
- 用户想要CS + 本省，但本省CS很少 → 旧版本可能返回空结果
- 新版本会推荐外省CS（如果用户的city权重不高）或本省其他相关专业

---

### 2. 用户定义权重的完全应用

**CORE_01 偏好示例**:
```json
{
  "indicatorId": "CORE_01",
  "indicatorName": "院校-专业-城市权重分配",
  "value": {
    "major": 50,
    "college": 30,
    "city": 20
  }
}
```

**权重提取**: `embedding-recommendation.service.ts:1496-1505`
```typescript
private extractDecisionWeights(preferences: AgentPreference[]): Record<string, number> {
  const defaultWeights = { college: 33, major: 34, city: 33 };

  const core01 = preferences.find(p => p.indicatorId === 'CORE_01');
  if (core01 && core01.value) {
    return { ...defaultWeights, ...core01.value };
  }

  return defaultWeights;
}
```

**应用到总分**:
```typescript
const totalScore =
  dimensionScores.collegeScore * (weights.college / 100) +  // 30%
  dimensionScores.majorScore * (weights.major / 100) +      // 50%
  dimensionScores.cityScore * (weights.city / 100);         // 20%
```

---

### 3. 从对话中提取专业意向

**方法**: `extractMajorIntentFromConversation()` (187-242行)

**作用**: 当CORE_10（具体专业意向）填写错误时，从对话历史中提取

**示例**:
```
用户对话: "我想学计算机或者电子信息方向"
提取结果: ["计算机", "电子信息"]
临时添加到preferences:
{
  indicatorId: "TEMP_MAJOR_INTENT",
  value: ["计算机", "电子信息"],
  confidence: 0.8
}
```

---

## 📋 新增日志输出

重启后你会看到:

```
🎯 [对话分析] 从对话中提取到专业意向: 计算机, 电子信息

[评分调试] =====================================
[评分调试] 院校: 南京大学
[评分调试] 专业: 计算机科学与技术
[评分调试] 找到Major对象: 是 (计算机科学与技术)
[评分调试] 院校信息:
  - 城市: 南京
  - 省份: 江苏省
  - 985: true
  - 211: true
  - 双一流: true
  - 排名: 8

  📌 [专业评分] 目标专业: 计算机, 电子信息, 当前专业: 计算机科学与技术
    ✅ 精确匹配: +50分
  📊 [专业评分] 最终得分: 100.0 (基础50 + 匹配50 + 质量0)

  📌 [城市评分] 院校: 南京(江苏省), 用户省份: 江苏省
    ✅ 本省院校: +40分
    ⭐ 新一线城市: +5分
  📊 [城市评分] 最终得分: 95.0 (基础50 + 匹配40 + 等级5)

[评分调试] 各维度得分:
  - 院校得分: 95.00
  - 专业得分: 100.00
  - 城市得分: 95.00
  - 就业得分: 85.00
  - 成本得分: 70.00
  - 性格匹配: 95.00
  - 职业匹配: 80.00
  - 嵌入匹配: 92.50

[评分调试] 权重分配: 院校30%, 专业50%, 城市20%
[评分调试] 加权计算: 95.00 × 30% + 100.00 × 50% + 95.00 × 20% = 97.50
```

---

## 🧪 测试步骤

### 1. 重启应用
```bash
npm run dev
```

### 2. 调用推荐API

请求相同的会话ID，观察后端日志

### 3. 验证结果

**预期看到**:
1. ✅ 推荐结果包含计算机相关专业（得分高）
2. ✅ 也可能包含少量非计算机专业（如果院校/城市得分很高）
3. ✅ 加权计算日志显示正确的权重分配
4. ✅ 总分排序合理（综合三个维度）

**不应该看到**:
- ❌ 大量不相关专业排在前面
- ❌ 完全没有外省院校（即使用户城市权重不高）
- ❌ 权重分配不符合CORE_01配置

---

## 📄 修改的文件

**唯一文件**: `src/services/agent/embedding-recommendation.service.ts`

**修改的方法**:
1. `calculateCityScore()` (770-836行) - 添加userInfo参数，实现0-100评分
2. `calculateMajorScore()` (1006-1089行) - 实现0-100评分，软过滤
3. `scoreCandidate()` (606行) - 更新calculateCityScore调用
4. `scoreCandidate()` (651-660行) - 修复总分计算公式

---

## ⚠️ 注意事项

### 1. 权重总和应该是100%

当前实现假设 `college% + major% + city% = 100%`

如果不是100%，结果会被缩放。例如:
- 实际配置: { major: 50, college: 30, city: 10 } (总和90%)
- 计算结果: 最高分只能是90分，不是100分

**建议**: 在偏好提取阶段验证权重总和

### 2. 其他维度（就业、成本等）的作用

当前版本这些维度只用于:
- 生成推荐理由
- 计算专业质量加分（就业率、薪资）

它们不再直接参与总分计算（符合用户要求）

### 3. 嵌入向量的作用

`embeddingMatchScore`现在不参与总分计算，但仍然:
- 用于专业匹配时的相似度判断
- 显示在调试日志中
- 可用于生成推荐理由

---

## 🚀 下一步改进（可选）

### 1. 支持更多权重配置

允许用户自定义其他维度的权重，例如:
```json
{
  "core": {
    "major": 40,
    "college": 30,
    "city": 20
  },
  "secondary": {
    "employment": 5,
    "personality": 3,
    "career": 2
  }
}
```

### 2. 调剂接受度的应用

**CORE_13**: 是否接受调剂

当前未使用，可以在以下场景应用:
- 如果用户拒绝调剂 → 大幅降低非目标专业的分数（matchBonus = -50）
- 如果用户接受调剂 → 放宽专业过滤（matchBonus最低-20）

### 3. 动态权重调整

根据候选池情况动态调整:
- 如果本省CS候选很少 → 自动降低city权重
- 如果用户分数很高 → 自动提高college权重

---

生成时间: 2025-01-26
状态: ✅ 已完成编译验证
下一步: 重启应用测试加权评分效果
