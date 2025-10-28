-- 快速修复：关联college_id
-- 根据college_name关联colleges表

UPDATE enrollment_plans ep
SET college_id = (
  SELECT id
  FROM colleges
  WHERE name = ep.college_name
  LIMIT 1
)
WHERE college_id IS NULL
  AND college_name IS NOT NULL;

-- 检查修复结果
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN college_id IS NULL THEN 1 ELSE 0 END) as null_count,
  SUM(CASE WHEN college_id IS NOT NULL THEN 1 ELSE 0 END) as linked_count
FROM enrollment_plans;
