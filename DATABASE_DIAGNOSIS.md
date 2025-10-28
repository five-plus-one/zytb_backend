# 🔍 数据库数据缺失诊断和修复指南

## 问题确认

系统日志清楚显示问题：

```
🔍 查询招生计划: 省份=江苏, 科类=物理类, 年份=2025
📦 找到 0 条招生计划  ← 数据库中没有数据！
```

**SQL查询**:
```sql
SELECT * FROM enrollment_plans
WHERE source_province = '江苏'
  AND subject_type = '物理类'
  AND year = 2025
```

**结果**: 0条记录

## 立即诊断步骤

### 步骤1: 检查表中是否有任何数据

```sql
SELECT COUNT(*) as total_count FROM enrollment_plans;
```

**可能结果**:
- `total_count = 0` → 表是空的，需要导入数据
- `total_count > 0` → 表有数据，但查询条件不匹配

### 步骤2: 检查实际的字段值

```sql
-- 检查省份值
SELECT DISTINCT source_province FROM enrollment_plans LIMIT 10;

-- 检查科类值
SELECT DISTINCT subject_type FROM enrollment_plans LIMIT 10;

-- 检查年份值
SELECT DISTINCT year FROM enrollment_plans ORDER BY year DESC LIMIT 10;
```

### 步骤3: 查看数据分布

```sql
SELECT
  source_province,
  subject_type,
  year,
  COUNT(*) as count
FROM enrollment_plans
GROUP BY source_province, subject_type, year
ORDER BY year DESC, count DESC
LIMIT 20;
```

## 常见问题和解决方案

### 问题1: 表是空的（没有数据）

**症状**:
```sql
SELECT COUNT(*) FROM enrollment_plans;
-- 结果: 0
```

**解决方案**: 导入招生计划数据

```bash
# 假设你有招生计划Excel文件
# 使用之前创建的导入脚本
npm run import:enrollment-plans -- --file /path/to/enrollment_plans.xlsx
```

**或者手动插入测试数据**:

```sql
-- 插入测试数据
INSERT INTO enrollment_plans (
  year, source_province, subject_type, batch,
  college_code, college_name, college_id,
  major_code, major_name, major_group_code, major_group_name,
  subject_requirements, plan_count, tuition
) VALUES
(2025, '江苏', '物理类', '本科批',
 '10001', '北京大学', 'college-uuid-here',
 '080901', '计算机科学与技术', '01', '计算机类',
 '物理', 10, 5000),
(2025, '江苏', '物理类', '本科批',
 '10003', '清华大学', 'college-uuid-here',
 '080901', '计算机科学与技术', '01', '计算机类',
 '物理', 15, 5000);
```

### 问题2: 科类值格式不匹配

**症状**:
```sql
SELECT DISTINCT subject_type FROM enrollment_plans;
-- 结果: '物理', '历史' (没有'类'字)
```

**解决方案A**: 修改数据库数据（如果数据少）

```sql
UPDATE enrollment_plans
SET subject_type = CONCAT(subject_type, '类')
WHERE subject_type IN ('物理', '历史');
```

**解决方案B**: 修改查询逻辑（推荐）

修改 `src/services/agent/embedding-recommendation.service.ts`:

```typescript
// 当前代码
.andWhere('ep.subjectType = :subjectType', { subjectType: userInfo.subjectType })

// 改为兼容两种格式
.andWhere(
  'ep.subjectType IN (:...subjectTypes)',
  {
    subjectTypes: [
      userInfo.subjectType,
      userInfo.subjectType.replace('类', ''),  // 移除'类'
      userInfo.subjectType + '类'  // 添加'类'
    ]
  }
)
```

### 问题3: 省份名称格式不匹配

**症状**:
```sql
SELECT DISTINCT source_province FROM enrollment_plans;
-- 可能结果:
-- '江苏省' (带'省'字)
-- 'Jiangsu' (拼音)
-- '32' (代码)
```

**解决方案**: 检查并统一格式

```sql
-- 如果数据库用的是'江苏省'
UPDATE enrollment_plans
SET source_province = REPLACE(source_province, '省', '')
WHERE source_province LIKE '%省';

-- 或者在查询时兼容
WHERE (ep.sourceProvince = :province OR ep.sourceProvince = CONCAT(:province, '省'))
```

### 问题4: 年份数据是2024而不是2025

**症状**:
```sql
SELECT DISTINCT year FROM enrollment_plans;
-- 结果: 2024, 2023, 2022 (没有2025)
```

**临时解决方案**: 使用2024年数据

修改查询逻辑使用最新年份：

```typescript
// 查询最新年份的数据
const latestYear = await AppDataSource.getRepository(EnrollmentPlan)
  .createQueryBuilder('ep')
  .select('MAX(ep.year)', 'maxYear')
  .where('ep.sourceProvince = :province', { province: userInfo.province })
  .andWhere('ep.subjectType = :subjectType', { subjectType: userInfo.subjectType })
  .getRawOne();

const yearToUse = latestYear?.maxYear || new Date().getFullYear();

// 使用这个年份查询
.andWhere('ep.year = :year', { year: yearToUse })
```

## 快速修复方案

### 方案1: 修改代码兼容实际数据格式

**文件**: `src/services/agent/embedding-recommendation.service.ts`

找到 `getCandidates` 方法，修改为：

```typescript
private async getCandidates(userInfo: {
  examScore: number;
  province: string;
  subjectType: string;
}): Promise<any[]> {
  console.log(`🔍 查询招生计划: 省份=${userInfo.province}, 科类=${userInfo.subjectType}, 年份=${new Date().getFullYear()}`);

  // 查询实际数据格式
  const sample = await AppDataSource.getRepository(EnrollmentPlan)
    .createQueryBuilder('ep')
    .select(['ep.sourceProvince', 'ep.subjectType', 'ep.year'])
    .limit(5)
    .getMany();

  console.log('📝 数据库中的实际格式示例:', sample);

  // 准备兼容的查询条件
  const subjectTypes = [
    userInfo.subjectType,
    userInfo.subjectType.replace('类', ''),
    userInfo.subjectType + (userInfo.subjectType.includes('类') ? '' : '类')
  ];

  const provinces = [
    userInfo.province,
    userInfo.province.replace('省', ''),
    userInfo.province + (userInfo.province.includes('省') ? '' : '省')
  ];

  // 查询最新年份
  const latestYearResult = await AppDataSource.getRepository(EnrollmentPlan)
    .createQueryBuilder('ep')
    .select('MAX(ep.year)', 'maxYear')
    .getRawOne();

  const targetYear = latestYearResult?.maxYear || new Date().getFullYear();
  console.log(`📅 使用年份: ${targetYear}`);

  // 兼容性查询
  const enrollmentPlans = await AppDataSource.getRepository(EnrollmentPlan)
    .createQueryBuilder('ep')
    .innerJoinAndSelect('ep.college', 'college')
    .where('ep.sourceProvince IN (:...provinces)', { provinces })
    .andWhere('ep.subjectType IN (:...subjectTypes)', { subjectTypes })
    .andWhere('ep.year = :year', { year: targetYear })
    .getMany();

  console.log(`📦 找到 ${enrollmentPlans.length} 条招生计划`);

  // ... 后续逻辑
}
```

### 方案2: 检查并修复AgentSession数据

可能用户session中存储的 `subjectType` 格式不对：

```sql
-- 检查用户session数据
SELECT
  id,
  province,
  subject_type,
  exam_score
FROM agent_sessions
WHERE id = '099ff94c-e859-44c9-839a-6501a44dc6ec';
```

如果 `subject_type` 不是 `'物理类'`，更新它：

```sql
UPDATE agent_sessions
SET subject_type = '物理类'
WHERE id = '099ff94c-e859-44c9-839a-6501a44dc6ec';
```

## 验证修复

### 1. 直接SQL验证

```sql
-- 测试查询能否返回数据
SELECT COUNT(*)
FROM enrollment_plans ep
INNER JOIN colleges c ON c.id = ep.college_id
WHERE ep.source_province IN ('江苏', '江苏省')
  AND ep.subject_type IN ('物理', '物理类')
  AND ep.year >= 2024;
```

如果返回 > 0，说明数据存在，只是查询条件需要调整。

### 2. 重启应用测试

```bash
npm run dev
```

```bash
POST /api/agent/generate
{
  "sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec",
  "count": 60
}
```

### 3. 观察新日志

应该看到：

```
🔍 查询招生计划: 省份=江苏, 科类=物理类, 年份=2024
📝 数据库中的实际格式示例: [...]
📅 使用年份: 2024
📦 找到 XXX 条招生计划  ← 应该 > 0
```

## 数据导入建议

如果需要导入新数据：

### 1. Excel格式要求

| 字段 | 示例 | 必填 |
|------|------|------|
| year | 2025 | 是 |
| source_province | 江苏 | 是 |
| subject_type | 物理类 | 是 |
| batch | 本科批 | 是 |
| college_code | 10001 | 是 |
| college_name | 北京大学 | 是 |
| major_code | 080901 | 是 |
| major_name | 计算机科学与技术 | 是 |
| major_group_code | 01 | 否 |
| major_group_name | 计算机类 | 否 |
| plan_count | 10 | 是 |
| tuition | 5000 | 否 |

### 2. 导入脚本

```bash
npm run import:enrollment-plans -- --file ./data/enrollment_2025.xlsx
```

### 3. 验证导入

```sql
SELECT
  year,
  source_province,
  subject_type,
  COUNT(*) as count
FROM enrollment_plans
WHERE year = 2025 AND source_province = '江苏'
GROUP BY year, source_province, subject_type;
```

## 应急方案：使用旧推荐引擎

如果暂时无法获取数据，可以临时回退到旧的推荐引擎：

**文件**: `src/services/agent/agent.service.ts`

```typescript
// 临时注释新引擎
// const recommendations = await embeddingRecommendationService.generateEnhancedRecommendations(...);

// 使用旧引擎
const weights = await this.preferenceService.getDecisionWeights(sessionId);
const recommendations = await this.recommendationEngine.generateRecommendations(
  {
    decisionWeights: weights,
    province: session.province,
    examScore: session.examScore,
    scoreRank: session.scoreRank,
    subjectType: session.subjectType,
    preferences
  },
  targetCount
);
```

## 总结

问题已定位：**数据库中没有符合查询条件的招生计划数据**

下一步操作（按优先级）：

1. **立即**: 执行SQL检查，确认数据库中有什么数据
2. **短期**: 修改代码兼容实际数据格式（科类、省份、年份）
3. **长期**: 导入完整的2025年招生计划数据

请先执行以下SQL，告诉我结果：

```sql
-- 1. 总数
SELECT COUNT(*) FROM enrollment_plans;

-- 2. 字段格式
SELECT DISTINCT source_province, subject_type, year
FROM enrollment_plans
ORDER BY year DESC, source_province, subject_type
LIMIT 20;

-- 3. 江苏相关数据
SELECT COUNT(*)
FROM enrollment_plans
WHERE source_province LIKE '%江苏%';
```

根据结果，我会给出具体的修复方案！
