# Core Layer 数据完整性检查报告

生成时间：2025-11-07

## 📊 当前状态

### Core Layer 表数据统计

| 表名 | 记录数 | 状态 | 说明 |
|------|--------|------|------|
| core_colleges | 3,216 | ✅ 正常 | 院校数据完整 |
| core_majors | 2,141 | ✅ 正常 | 专业数据完整 |
| core_admission_scores | 18,093 | ⚠️ 需修复 | 缺失18,093条专业名称 |
| core_campus_life | 0 | ⚠️ 空表 | 需要迁移数据 |
| core_enrollment_plans | 0 | ⚠️ 空表 | 需迁移21,364条数据 |
| core_college_major_relations | 0 | ⚠️ 空表 | 需生成关联关系 |

### 数据质量问题

1. **录取分数表冗余字段缺失**
   - 18,093条记录缺失`major_name`字段
   - 需要从`core_majors`表补充

2. **招生计划数据未迁移**
   - `enrollment_plans`表有21,364条数据
   - `core_enrollment_plans`表为空
   - 需要完整迁移

3. **院校-专业关联关系缺失**
   - `core_college_major_relations`表为空
   - 可从`core_admission_scores`推导生成
   - 预计生成数千条关联记录

4. **校园生活数据未迁移**
   - `core_campus_life`表为空
   - `cleaned_campus_life`表也为空
   - 原始数据可能在`raw_csv_campus_life`

## 🔧 修复方案

### 方案1：补充录取分数表专业名称（高优先级）

```sql
UPDATE core_admission_scores s
INNER JOIN core_majors m ON s.major_id = m.id
SET s.major_name = m.name
WHERE s.major_name IS NULL OR s.major_name = '';
```

**影响**：18,093条记录
**执行时间**：预计30秒

### 方案2：迁移招生计划数据（高优先级）

从`enrollment_plans`迁移到`core_enrollment_plans`，注意字段映射：
- `source_province` → `province`
- `subject_type` → `subject_requirement`
- 补充`college_name`从colleges表

**影响**：21,364条记录
**执行时间**：预计2-3分钟

### 方案3：生成院校-专业关联表（中优先级）

从`core_admission_scores`聚合生成关联关系：

```sql
INSERT INTO core_college_major_relations (...)
SELECT
  UUID() as id,
  college_id,
  college_name,
  major_id,
  major_name,
  MIN(year) as first_offered_year,
  COUNT(DISTINCT province) as enrollment_province_count,
  AVG(min_score) as avg_admission_score,
  ...
FROM core_admission_scores
WHERE college_id IS NOT NULL AND major_id IS NOT NULL
GROUP BY college_id, major_id;
```

**影响**：预计生成数千条关联
**执行时间**：预计1分钟

### 方案4：迁移校园生活数据（低优先级）

检查`raw_csv_campus_life`数据，通过Cleaned层清洗后迁移到Core层

**影响**：待确定
**执行时间**：待确定

## 📋 API业务逻辑分析

### 关键API端点依赖关系

1. **院校查询API** (`/colleges`)
   - 依赖：`core_colleges`
   - 状态：✅ 正常
   - 冗余字段：校园生活数据缺失（不影响基础功能）

2. **专业查询API** (`/majors`)
   - 依赖：`core_majors`
   - 状态：✅ 正常

3. **录取分数查询API** (`/admission-scores`)
   - 依赖：`core_admission_scores`
   - 状态：⚠️ 专业名称缺失影响展示

4. **招生计划查询API** (`/enrollment-plans`)
   - 依赖：`core_enrollment_plans`
   - 状态：❌ 表为空，API无法使用

5. **院校专业关联API**
   - 依赖：`core_college_major_relations`
   - 状态：❌ 表为空，影响关联查询

### 直接关联能力评估

**当前问题**：
- ❌ 招生计划查询无法直接通过UUID关联院校和专业
- ❌ 院校-专业关联关系缺失，需要JOIN查询
- ⚠️ 录取分数展示缺少专业名称，影响用户体验

**需要的改进**：
1. 迁移招生计划数据，确保UUID关联
2. 生成院校-专业关联表，提供一步查询能力
3. 补充冗余字段（专业名称），避免JOIN

## 🎯 执行优先级

### 阶段1：紧急修复（今天完成）

1. ✅ 补充`core_admission_scores.major_name`
2. ✅ 迁移`enrollment_plans` → `core_enrollment_plans`
3. ✅ 生成`core_college_major_relations`

### 阶段2：数据完善（本周完成）

4. 检查并迁移校园生活数据
5. 更新`core_colleges`中的校园生活冗余字段
6. 补充其他可能缺失的冗余字段

### 阶段3：API适配（本周完成）

7. 更新所有Controller使用Core Layer
8. 废弃旧表的查询逻辑
9. 性能测试和验证

## 📝 后续建议

1. **建立ETL自动化流程**
   - 定时同步Cleaned→Core
   - 自动维护冗余字段
   - 数据质量监控

2. **API代码迁移**
   - 逐步替换旧表查询
   - 使用UUID精确查询
   - 避免字符串模糊匹配

3. **监控和告警**
   - Core Layer数据完整性监控
   - 冗余字段一致性检查
   - 同步延迟告警

## 🔍 技术细节

### enrollment_plans表字段映射

| 旧表字段 | Core表字段 | 说明 |
|---------|-----------|------|
| source_province | province | 生源省份 |
| subject_type | subject_requirement | 科目要求 |
| college_code | college_code | 院校代码 |
| college_name | college_name | 院校名称 |
| major_code | major_code | 专业代码 |
| major_name | major_name | 专业名称 |
| plan_count | plan_count | 招生计划数 |
| tuition_fee | tuition_fee | 学费 |

### 关联关系设计

```
core_colleges (院校)
    ↓ UUID
core_college_major_relations (关联)
    ↓ UUID
core_majors (专业)

优势：
- 一步查询，无需JOIN
- UUID精确匹配，性能高
- 预聚合统计数据
```

---

**报告结论**：Core Layer 基础数据完整，但缺少招生计划、关联关系和部分冗余字段。需要执行3个高优先级修复任务，确保API业务逻辑正常运行。
