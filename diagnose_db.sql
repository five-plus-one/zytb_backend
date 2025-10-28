-- 诊断1: 检查表是否有数据
SELECT '=== 诊断1: enrollment_plans总记录数 ===' as info;
SELECT COUNT(*) as total_records FROM enrollment_plans;

-- 诊断2: 检查实际的字段值格式
SELECT '=== 诊断2: 实际的字段值（前20条） ===' as info;
SELECT DISTINCT source_province, subject_type, year 
FROM enrollment_plans 
ORDER BY year DESC, source_province, subject_type 
LIMIT 20;

-- 诊断3: 检查江苏相关数据
SELECT '=== 诊断3: 江苏省相关数据统计 ===' as info;
SELECT source_province, year, subject_type, COUNT(*) as count
FROM enrollment_plans
WHERE source_province LIKE '%江苏%'
GROUP BY source_province, year, subject_type
ORDER BY year DESC;

-- 诊断4: 检查college_id关联情况
SELECT '=== 诊断4: college_id为NULL的记录数 ===' as info;
SELECT COUNT(*) as null_college_id_count
FROM enrollment_plans
WHERE college_id IS NULL;

-- 诊断5: 检查年份分布
SELECT '=== 诊断5: 年份分布 ===' as info;
SELECT year, COUNT(*) as count
FROM enrollment_plans
GROUP BY year
ORDER BY year DESC;

-- 诊断6: 检查colleges表是否有数据
SELECT '=== 诊断6: colleges表记录数 ===' as info;
SELECT COUNT(*) as total_colleges FROM colleges;
