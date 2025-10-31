/**
 * 数据库迁移脚本：为 admission_scores 表添加新字段
 *
 * 执行方式：
 * 1. 直接在数据库执行SQL
 * 2. 或使用TypeORM迁移
 */

-- ========== 第一步：添加新字段 ==========

-- 平均分
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS avg_score INT NULL;

-- 最高分
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS max_score INT NULL;

-- 最高位次
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS max_rank INT NULL;

-- 招生计划数
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS plan_count INT NULL;

-- 分数波动性（标准差）
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS score_volatility DECIMAL(5, 2) NULL;

-- 专业热度指数 (0-100)
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS popularity_index INT NULL;

-- 院校代码
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS college_code VARCHAR(20) NULL;

-- 专业组代码
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS group_code VARCHAR(50) NULL;

-- 专业组名称
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) NULL;


-- ========== 第二步：添加索引（提升查询性能）==========

-- 专业组查询索引（核心查询）
CREATE INDEX IF NOT EXISTS idx_admission_scores_group_query
ON admission_scores (college_code, group_code, source_province, subject_type, year);

-- 院校代码索引
CREATE INDEX IF NOT EXISTS idx_admission_scores_college_code
ON admission_scores (college_code);

-- 专业组代码索引
CREATE INDEX IF NOT EXISTS idx_admission_scores_group_code
ON admission_scores (group_code);

-- 冲稳保相关查询索引
CREATE INDEX IF NOT EXISTS idx_admission_scores_score_range
ON admission_scores (year, source_province, subject_type, min_score);


-- ========== 第三步：数据校验 ==========

-- 检查新增字段
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admission_scores'
  AND column_name IN (
    'avg_score', 'max_score', 'max_rank', 'plan_count',
    'score_volatility', 'popularity_index',
    'college_code', 'group_code', 'group_name'
  );

-- 检查索引
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'admission_scores'
  AND indexname LIKE 'idx_admission_scores_%';


-- ========== 第四步：（可选）迁移现有数据 ==========

-- 从 enrollment_plans 补全 college_code 和 group_code
UPDATE admission_scores AS a
SET
  college_code = ep.college_code,
  group_code = ep.major_group_code,
  group_name = ep.major_group_name
FROM enrollment_plans AS ep
WHERE a.college_name = ep.college_name
  AND a.source_province = ep.source_province
  AND a.subject_type = ep.subject_type
  AND a.year = ep.year
  AND (a.college_code IS NULL OR a.group_code IS NULL);


-- ========== 第五步：验证数据 ==========

-- 统计数据完整性
SELECT
  COUNT(*) AS total_records,
  COUNT(college_code) AS has_college_code,
  COUNT(group_code) AS has_group_code,
  COUNT(avg_score) AS has_avg_score,
  COUNT(max_score) AS has_max_score,
  COUNT(plan_count) AS has_plan_count
FROM admission_scores;

-- 查看示例数据
SELECT
  college_code,
  college_name,
  group_code,
  group_name,
  year,
  min_score,
  avg_score,
  max_score,
  min_rank,
  max_rank,
  plan_count
FROM admission_scores
WHERE year = 2024
  AND source_province = '江苏'
  AND subject_type = '物理类'
LIMIT 10;
