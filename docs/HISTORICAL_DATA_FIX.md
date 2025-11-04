# 历史数据关联问题 - 完整修复方案

## 📋 问题总结

### 核心问题
1. **历史分数全部显示0分** - 数据关联失败导致
2. **录取概率全是50%** - 因为没有有效的历史数据
3. **没有数据库层面的物理关联** - 每次查询都要做模糊匹配

### 根本原因
- `EnrollmentPlan` 和 `AdmissionScore` 两张表之间**没有建立真正的关联关系**
- 只能通过字符串匹配（`collegeCode + groupCode`），但格式不一致：
  - 招生计划：`groupCode = "05"`
  - 历史分数：`groupCode = "（02）"` 或 `majorGroup = "（07）"`
- 每次查询都要重新匹配，效率低且容易失败

## 🎯 解决方案

### 方案架构
创建中间关联表 `enrollment_plan_groups`，作为专业组的主表：
- 一个专业组 → 多个招生计划记录（2025年的多个专业）
- 一个专业组 → 多条历史分数记录（2021-2024年的数据）

```
enrollment_plan_groups (专业组主表)
    ├── OneToMany → enrollment_plans (2025招生计划)
    └── OneToMany → admission_scores (历年录取分数)
```

## 🔧 实施步骤

### 步骤1：创建数据库表结构

**执行SQL**：
```bash
mysql -u root -p zy_backend < scripts/create_groups_table.sql
```

**SQL内容**：
```sql
-- 创建专业组表
CREATE TABLE `enrollment_plan_groups` (
  `id` VARCHAR(36) PRIMARY KEY,
  `college_code` VARCHAR(20) NOT NULL,
  `college_name` VARCHAR(100) NOT NULL,
  `group_code` VARCHAR(50) NOT NULL COMMENT '标准化后（无括号）',
  `group_code_raw` VARCHAR(50) NULL COMMENT '原始格式',
  `group_name` VARCHAR(100) NULL,
  `source_province` VARCHAR(50) NOT NULL,
  `subject_type` VARCHAR(50) NOT NULL,
  UNIQUE KEY (`college_code`, `group_code`, `source_province`, `subject_type`)
);

-- 添加关联字段
ALTER TABLE `enrollment_plans` ADD COLUMN `group_id` VARCHAR(36);
ALTER TABLE `admission_scores` ADD COLUMN `group_id` VARCHAR(36);
```

### 步骤2：运行数据关联脚本

**执行命令**：
```bash
npx ts-node scripts/buildGroupRelationships.ts
```

**脚本功能**：
1. 从 `enrollment_plans` 提取所有专业组
2. 标准化专业组代码（移除括号）
3. 创建 `enrollment_plan_groups` 记录
4. 更新 `enrollment_plans.group_id`
5. 智能匹配并更新 `admission_scores.group_id`

**预期输出**：
```
📋 第一步：提取专业组信息...
  找到 3280 个专业组

🏗️  第二步：创建专业组记录...
  ✅ 完成：创建 3280 个

🔄 第三步：更新招生计划的 group_id...
  ✅ 完成：更新 16103 个招生计划

🔍 第四步：匹配历史分数数据...
  ✅ 完成：更新 13500+ 个历史分数记录

📊 最终统计报告：
  专业组总数: 3280
  招生计划关联率: 100%
  历史分数关联率: 98%+
```

### 步骤3：修改查询服务使用JOIN

修改 `src/services/recommendationCard.service.ts`，使用关联查询：

**旧代码**（模糊匹配）：
```typescript
// 查询历史分数，然后手动匹配
const historicalScores = await this.admissionScoreRepo.find({...});
// 循环匹配 groupId...
```

**新代码**（JOIN查询）：
```typescript
// 直接通过 group_id JOIN
const groupsWithHistory = await this.groupRepo
  .createQueryBuilder('g')
  .leftJoinAndSelect('g.admissionScores', 'as', 'as.year < :year', { year: 2025 })
  .leftJoinAndSelect('g.enrollmentPlans', 'ep', 'ep.year = :year', { year: 2025 })
  .where('g.id IN (:...groupIds)', { groupIds })
  .getMany();
```

### 步骤4：验证数据关联

**执行验证**：
```bash
npx ts-node scripts/deepDiagnosis.ts
```

**检查点**：
- ✅ 每个专业组都有 `group_id`
- ✅ 历史分数记录98%+有 `group_id`
- ✅ 通过JOIN能查到历史数据
- ✅ 分数不再是0，概率不再是50%

## 📁 创建的文件清单

### 数据库相关
1. `src/models/EnrollmentPlanGroup.ts` - 专业组实体模型
2. `src/migrations/1706000000000-CreateEnrollmentPlanGroups.ts` - 迁移脚本
3. `scripts/create_groups_table.sql` - SQL创建脚本
4. `scripts/buildGroupRelationships.ts` - 数据关联脚本

### 诊断工具
5. `scripts/linkHistoricalData.ts` - 简单诊断脚本
6. `scripts/deepDiagnosis.ts` - 深度诊断脚本

### 修改的文件
7. `src/models/EnrollmentPlan.ts` - 添加 `group` 关联
8. `src/models/AdmissionScore.ts` - 添加 `group` 关联
9. `src/services/recommendationCard.service.ts` - 将使用JOIN查询（待修改）

## 🎯 预期效果

### 性能提升
| 指标 | 修复前 | 修复后 | 提升 |
|-----|--------|--------|------|
| 查询方式 | 模糊匹配 | JOIN查询 | - |
| 数据库查询 | 40+ | 1-2次 | ⬇️ 95% |
| 匹配准确率 | ~60% | ~98% | ⬆️ 63% |
| 查询速度 | 3-5秒 | <1秒 | ⬆️ 70% |

### 数据准确性
- ✅ 历史分数：从 **0分** → **真实分数**
- ✅ 录取概率：从 **50%** → **基于真实数据计算**
- ✅ 数据覆盖率：从 **~60%** → **~98%**

## ⚠️ 注意事项

### 1. 数据备份
```bash
mysqldump -u root -p zy_backend > backup_before_groups.sql
```

### 2. 未匹配的数据
- 约2%的历史分数记录可能无法匹配到专业组
- 原因：院校改名、专业组调整、数据缺失
- 处理：这些记录的 `group_id` 为 `NULL`，查询时会被忽略

### 3. 后续维护
- 新导入的招生计划需要运行关联脚本
- 新导入的历史分数需要运行关联脚本
- 建议：在数据导入脚本中集成自动关联逻辑

## 🧪 测试验证

### 测试1：检查专业组创建
```sql
SELECT COUNT(*) FROM enrollment_plan_groups;
-- 预期：3280 左右

SELECT * FROM enrollment_plan_groups LIMIT 5;
-- 预期：有数据，格式正确
```

### 测试2：检查关联率
```sql
-- 招生计划关联率
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN group_id IS NOT NULL THEN 1 ELSE 0 END) as linked,
  SUM(CASE WHEN group_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as rate
FROM enrollment_plans
WHERE year = 2025;
-- 预期：rate = 100%

-- 历史分数关联率
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN group_id IS NOT NULL THEN 1 ELSE 0 END) as linked,
  SUM(CASE WHEN group_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as rate
FROM admission_scores;
-- 预期：rate >= 95%
```

### 测试3：JOIN查询测试
```sql
-- 通过专业组查询历史数据
SELECT
  g.college_name,
  g.group_name,
  COUNT(DISTINCT ep.id) as plan_count,
  COUNT(DISTINCT as2.id) as history_count
FROM enrollment_plan_groups g
LEFT JOIN enrollment_plans ep ON ep.group_id = g.id
LEFT JOIN admission_scores as2 ON as2.group_id = g.id
WHERE g.source_province = '江苏'
  AND g.subject_type = '物理类'
GROUP BY g.id
LIMIT 10;
-- 预期：history_count > 0
```

## 📞 问题排查

### 问题1：专业组数量太少
**原因**：SQL执行失败或数据为空
**解决**：检查数据库日志，重新执行SQL

### 问题2：关联率低于90%
**原因**：数据格式差异过大
**解决**：检查 `buildGroupRelationships.ts` 的匹配逻辑，添加更多匹配规则

### 问题3：仍然查询不到历史数据
**原因**：查询服务未更新为使用JOIN
**解决**：完成步骤3，修改 `RecommendationCardService`

## ✅ 完成标志

当以下条件全部满足时，修复完成：
- [ ] `enrollment_plan_groups` 表创建成功，有3000+条记录
- [ ] `enrollment_plans.group_id` 100%填充
- [ ] `admission_scores.group_id` 95%+填充
- [ ] 前端推荐卡片显示真实的历史分数（不再是0）
- [ ] 录取概率基于真实数据计算（不再是50%）
- [ ] 推荐详情页能正确展示历年录取数据

---

**文档版本**: v1.0
**创建时间**: 2025-01-31
**作者**: AI Assistant
**适用系统**: 志愿填报智能推荐系统
