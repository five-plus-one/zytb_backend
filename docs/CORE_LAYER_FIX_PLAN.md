# Core Layer 数据修复执行计划

生成时间：2025-11-07

## 🔍 诊断结果

### 关键问题发现

1. **core_admission_scores 表major_id全部为NULL**
   - 所有18,093条记录的`major_id`和`major_name`都是NULL
   - 根本原因：初始ETL同步时未正确关联专业
   - 影响：无法通过UUID直接关联专业，影响查询性能

2. **cleaned_admission_scores表字段名不匹配**
   - 使用的不是`province`而是其他字段名（需要进一步确认）
   - 导致直接的INSERT SELECT无法执行

3. **招生计划未迁移**
   - 21,364条`enrollment_plans`数据需要迁移到`core_enrollment_plans`
   - 字段映射：`source_province` → `province`, `subject_type` → `subject_requirement`

4. **院校-专业关联表为空**
   - `core_college_major_relations`表需要从录取分数数据聚合生成
   - 但由于major_id为NULL，无法生成有效的关联

## 🎯 修复方案（分步执行）

### 方案A：先修复数据关联，再执行迁移

#### Step 1: 检查cleaned_admission_scores表结构
```bash
npx ts-node scripts/check_cleaned_tables_structure.ts
```

#### Step 2: 重新运行完整的ETL Pipeline
```bash
# 从Cleaned层重新同步到Core层
npx ts-node src/etl/pipelines/CleanedToCorePipeline.ts
```

#### Step 3: 迁移招生计划（使用正确的字段映射）
```sql
INSERT INTO core_enrollment_plans (...)
SELECT ...
FROM enrollment_plans
WHERE ...
```

#### Step 4: 生成院校-专业关联
```sql
INSERT INTO core_college_major_relations (...)
SELECT ...
FROM core_admission_scores
WHERE major_id IS NOT NULL
GROUP BY college_id, major_id
```

### 方案B：直接从旧表迁移（绕过Cleaned层）

如果Cleaned层数据也有问题，可以直接从原始`admission_scores`表迁移：

```sql
-- 1. 清空并重建core_admission_scores
TRUNCATE TABLE core_admission_scores;

INSERT INTO core_admission_scores (...)
SELECT
  s.id,
  s.college_id,
  c.name as college_name,
  s.major_id,
  m.name as major_name,
  ...
FROM admission_scores s
LEFT JOIN colleges c ON s.college_id = c.id
LEFT JOIN majors m ON s.major_id = m.id;

-- 2. 迁移招生计划
INSERT INTO core_enrollment_plans (...)
SELECT ...
FROM enrollment_plans;

-- 3. 生成关联关系
INSERT INTO core_college_major_relations (...)
SELECT ...
FROM core_admission_scores
WHERE major_id IS NOT NULL;
```

## 📝 建议的执行顺序

### 优先级1：数据完整性（紧急）

1. ✅ **重新运行ETL Pipeline** - 修复major_id为NULL的问题
2. ✅ **迁移招生计划** - 使招生计划API可用
3. ✅ **生成院校-专业关联** - 提供一步查询能力

### 优先级2：性能优化（本周）

4. 更新统计字段（major_count, enrollment_province_count）
5. 补充冗余字段（确保所有name字段都已填充）
6. 创建必要的索引

### 优先级3：API适配（下周）

7. 更新所有Controller使用Core Layer查询
8. 废弃旧表查询逻辑
9. 性能测试和监控

## 🛠️ 准备好的脚本

1. **src/etl/pipelines/CleanedToCorePipeline.ts** - 完整的ETL Pipeline
2. **scripts/fix/comprehensive_core_fix.ts** - 综合修复脚本（需要调整字段名）
3. **scripts/check_core_layer_status.ts** - 状态检查脚本

## ⚠️ 注意事项

1. **执行前备份**：在执行TRUNCATE或大量UPDATE前，务必备份数据
2. **分批执行**：对于大量数据操作，建议分批执行以避免锁表
3. **监控日志**：执行过程中密切关注错误日志
4. **验证结果**：每一步完成后都要验证数据完整性

## 📊 预期结果

执行完成后，Core Layer应该达到以下状态：

- ✅ core_colleges: 3,216条（完整）
- ✅ core_majors: 2,141条（完整）
- ✅ core_admission_scores: 18,093条（**major_id和major_name完整**）
- ✅ core_enrollment_plans: 21,364条（**从enrollment_plans迁移**）
- ✅ core_college_major_relations: 数千条（**从录取分数聚合生成**）
- ⚠️ core_campus_life: 待定（取决于原始数据）

## 🔗 相关文档

- [Core Layer Status Report](./CORE_LAYER_STATUS_REPORT.md)
- [Three Tier Architecture Design](../scripts/migrations/three_tier_architecture/)
- [ETL Pipeline Documentation](../src/etl/README.md)

---

**下一步行动**：建议先运行`CleanedToCorePipeline.ts`来修复major_id问题，然后再执行其他迁移任务。
