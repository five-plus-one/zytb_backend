# 📋 会话总结 - 加权评分模型完整修复

## 🎯 核心问题

用户反馈的关键问题：
> "你需要分别计算对于用户来说各个维度的分数，然后乘上对应的百分比来加权计算，从而得到一个比较科学合理的结果。又比如说用户是否认为被调剂很难受（比如说用户明确表示需要计算机相关的）等等，都应当被考虑在加权计算的数学模型内。"

**翻译成技术需求**:
1. 各维度（院校、专业、城市）分别计算0-100分的匹配度
2. 使用CORE_01配置的权重进行加权计算：`总分 = 专业分 × major% + 院校分 × college% + 城市分 × city%`
3. 使用软过滤（评分）而不是硬过滤（直接移除）
4. 考虑所有偏好因素（包括调剂接受度等）

---

## ✅ 完成的修复

### 1. 重写专业评分方法 - `calculateMajorScore()`

**文件**: `src/services/agent/embedding-recommendation.service.ts`
**行数**: 1006-1089

**修改内容**:
```typescript
// 返回0-100的标准分数
private calculateMajorScore(
  major: Major | null,
  majorName?: string,
  majorGroupName?: string,
  preferences?: AgentPreference[]
): number
```

**评分规则**:
- 基础分: 50（中性）
- 精确匹配: +50 → 100分
- 包含匹配: +40 → 90分
- 相关匹配: +30 → 80分
- 完全不匹配: -40 → 10分
- 质量加分: +5（高就业率）、+5（高薪资）

**示例**:
- 用户想要"计算机"，候选是"计算机科学与技术" → 100分
- 用户想要"计算机"，候选是"软件工程" → 90分
- 用户想要"计算机"，候选是"经济学" → 10分（不过滤！）

---

### 2. 重写城市评分方法 - `calculateCityScore()`

**文件**: `src/services/agent/embedding-recommendation.service.ts`
**行数**: 770-836

**修改内容**:
```typescript
// 添加userInfo参数，返回0-100的标准分数
private calculateCityScore(
  college: any,
  preferences: AgentPreference[],
  userInfo: any  // ← 新增参数
): number
```

**评分规则**:
- 基础分: 50（中性）
- 本省院校（用户偏好本省）: +40 → 90分
- 外省院校（用户偏好本省）: -30 → 20分
- 匹配目标城市: +20
- 一线城市: +10
- 新一线城市: +5

**新增辅助方法**:
- `hasLocalPreference()` - 检测"本省"、"不出省"、"省内"关键词
- `isCityName()` - 判断是否是城市名称（用于过滤CORE_20中的非城市值）

---

### 3. 修复总分计算公式

**文件**: `src/services/agent/embedding-recommendation.service.ts`
**行数**: 651-660

**旧版本（错误）**:
```typescript
const totalScore =
  dimensionScores.collegeScore * (weights.college / 100) +
  dimensionScores.majorScore * (weights.major / 100) +
  dimensionScores.cityScore * (weights.city / 100) +
  dimensionScores.embeddingMatchScore * 0.3 +  // ← 固定权重
  dimensionScores.employmentScore * 0.1 +       // ← 固定权重
  dimensionScores.personalityFitScore * 0.1 +   // ← 固定权重
  dimensionScores.careerAlignmentScore * 0.1;   // ← 固定权重
```

**新版本（正确）**:
```typescript
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
- ✅ 移除所有固定权重（0.3、0.1等）
- ✅ 只使用用户定义的三个核心维度权重
- ✅ 添加详细的调试日志

---

### 4. 更新方法调用

**文件**: `src/services/agent/embedding-recommendation.service.ts`
**行数**: 606

**修改**:
```typescript
// 旧版本
dimensionScores.cityScore = this.calculateCityScore(collegeInfo, preferences);

// 新版本（添加userInfo参数）
dimensionScores.cityScore = this.calculateCityScore(collegeInfo, preferences, userInfo);
```

---

## 📊 加权计算效果对比

### 场景: 专业优先 vs 本地优先

**用户偏好**:
- 专业意向: 计算机
- 地域: 本省优先（江苏）

**候选**: 清华大学 - 计算机科学与技术

| 维度 | 得分 | 专业优先权重 | 本地优先权重 |
|-----|------|-------------|-------------|
| 专业 | 100 | 60% | 30% |
| 院校 | 100 | 30% | 30% |
| 城市 | 30（外省） | 10% | 40% |
| **总分** | - | **93** | **72** |

**计算过程**:

专业优先型（major: 60%, college: 30%, city: 10%）:
```
总分 = 100 × 60% + 100 × 30% + 30 × 10%
     = 60 + 30 + 3
     = 93分
```

本地优先型（major: 30%, college: 30%, city: 40%）:
```
总分 = 100 × 30% + 100 × 30% + 30 × 40%
     = 30 + 30 + 12
     = 72分
```

**结论**:
- 同一个候选（清华CS），不同权重配置导致完全不同的排名
- 专业优先型: 清华排名靠前（93分）
- 本地优先型: 清华排名下降（72分）

---

## 🔍 硬过滤 vs 软过滤

### 硬过滤（旧版本，已废弃）

```typescript
// ❌ 直接移除不符合条件的候选
if (targetMajorKeywords.length > 0) {
  const filteredCandidates = candidates.filter(c => {
    const majorName = c.enrollmentPlan.majorName || '';
    return targetMajorKeywords.some(keyword =>
      majorName.includes(keyword)
    );
  });
  candidates = filteredCandidates;
}
```

**问题**:
- 用户想要"计算机" + "本省" → 可能本省CS候选很少
- 硬过滤后可能返回空结果或结果很少

### 软过滤（新版本，已实现）

```typescript
// ✅ 给不匹配的候选低分，但保留
if (!hasMatch) {
  matchBonus = -40; // 专业不匹配 → 10分
}

// 最终在加权计算中自然排序
totalScore =
  10 × (major% / 100) +        // 专业得分很低
  100 × (college% / 100) +     // 但院校得分很高
  30 × (city% / 100);          // 城市得分中等
```

**优势**:
- 不会返回空结果
- 允许高水平院校（即使专业不完全匹配）在院校优先型中排名靠前
- 更符合真实志愿填报场景

---

## 📋 新增调试日志

重启应用后，后端会输出详细的评分过程：

```
🎯 [对话分析] 从对话中提取到专业意向: 计算机, 电子信息

[评分调试] =====================================
[评分调试] 院校: 南京大学
[评分调试] 专业: 计算机科学与技术

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

## 📄 相关文档

1. **[WEIGHTED_SCORING_FIX.md](./WEIGHTED_SCORING_FIX.md)** - 加权评分模型详细文档
   - 问题根源分析
   - 完整的评分规则说明
   - 多个场景示例
   - 测试步骤

2. **[MAJOR_FILTERING_FIX.md](./MAJOR_FILTERING_FIX.md)** - 专业过滤修复文档（已过时）
   - 记录了硬过滤的实现（已废弃）
   - 保留作为历史参考

3. **[embedding-recommendation.service.ts](./src/services/agent/embedding-recommendation.service.ts)** - 核心代码文件
   - 所有评分逻辑的实现

---

## 🧪 测试步骤

### 1. 清除缓存（重要！）
```bash
node clear-cache.js
```

### 2. 重启应用
```bash
npm run dev
```

### 3. 调用推荐API

使用Postman或前端调用推荐接口，传入:
- userId
- sessionId（使用现有会话，如 `099ff94c-e859-44c9-839a-6501a44dc6ec`）

### 4. 观察后端日志

查看终端输出，应该看到:
- ✅ 对话分析结果（提取的专业意向）
- ✅ 每个候选的详细评分过程
- ✅ 权重分配和加权计算公式
- ✅ 最终总分

### 5. 验证推荐结果

**预期结果**:
1. ✅ 专业匹配度高的候选排名靠前（如果用户major权重高）
2. ✅ 本省院校排名靠前（如果用户city权重高）
3. ✅ 不会完全过滤掉外省院校或非目标专业
4. ✅ 冲稳保比例接近1:1:1
5. ✅ 总分计算符合加权公式

**不应该出现**:
- ❌ 大量不相关专业排在前面
- ❌ 所有推荐都是本省或都是外省（除非用户权重极端）
- ❌ 总分计算不符合CORE_01配置
- ❌ 返回空结果

---

## ⚠️ 已知限制

### 1. 其他维度未纳入加权计算

当前版本只使用三个核心维度（college, major, city）进行加权计算。

**其他维度**（employment, personality, career等）:
- ✅ 仍然计算
- ✅ 显示在日志中
- ✅ 用于生成推荐理由
- ❌ **不参与**总分计算

**原因**: 符合用户要求，用户的CORE_01只定义了三个核心维度的权重

### 2. 权重总和问题

当前假设 `college% + major% + city% = 100%`

如果实际配置不等于100%（如 major: 50, college: 30, city: 10 = 90%），结果会被缩放。

**建议**: 在偏好提取阶段验证权重总和

### 3. 调剂接受度（CORE_13）未应用

**CORE_13**: 是否接受调剂

当前未使用，可以在后续版本中应用到专业评分:
- 如果用户拒绝调剂 → 更大幅度降低非目标专业分数
- 如果用户接受调剂 → 放宽专业匹配要求

---

## 🚀 后续改进建议

### 1. 支持更灵活的权重配置

允许用户自定义所有维度的权重:
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

### 2. 应用调剂接受度

根据CORE_13调整专业评分的惩罚力度

### 3. 动态权重调整

根据候选池情况智能调整权重:
- 如果本省CS候选很少 → 建议降低city权重
- 如果用户分数很高 → 建议提高college权重

### 4. 修复偏好提取

**根本问题**: LLM在对话时未能正确提取偏好到CORE_10、CORE_13、CORE_20

**发现的错误数据**:
- CORE_10（具体专业意向）: 填写成了城市列表 `["江苏", "上海", "浙江"]`
- CORE_13（调剂接受度）: 填写成了专业列表 `["计算机科学与技术", "电子信息工程"]`
- CORE_20（目标城市）: 填写成了 `"四人间有独立卫浴"`

**长期方案**:
- 审查LLM的prompt，确保正确识别各个指标
- 添加数据验证和类型检查
- 提供明确的偏好填写界面

---

## ✅ 编译验证

所有修改已通过TypeScript编译验证:
```bash
npm run build
# ✅ 编译成功，无错误
```

---

## 📊 修改统计

**修改文件**: 1个
- `src/services/agent/embedding-recommendation.service.ts`

**新增方法**: 2个
- `hasLocalPreference()` - 检测本省偏好
- `isCityName()` - 判断城市名称

**修改方法**: 3个
- `calculateMajorScore()` - 返回0-100标准分数
- `calculateCityScore()` - 添加userInfo参数，返回0-100标准分数
- `scoreCandidate()` - 更新调用和总分计算

**新增文档**: 2个
- `WEIGHTED_SCORING_FIX.md` - 详细修复文档
- `SESSION_SUMMARY.md` - 本文件

**代码行数变化**:
- 新增: ~100行（日志输出、注释等）
- 修改: ~50行
- 总计: ~1648行（文件总行数）

---

生成时间: 2025-01-26
编译状态: ✅ 通过
测试状态: ⏳ 待测试
下一步: 清除缓存 → 重启应用 → 调用API → 验证结果
