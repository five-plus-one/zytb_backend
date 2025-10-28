-- 检查招生计划数据
SELECT 
  source_province,
  subject_type,
  year,
  COUNT(*) as count
FROM enrollment_plans
GROUP BY source_province, subject_type, year
ORDER BY year DESC, source_province, subject_type;
