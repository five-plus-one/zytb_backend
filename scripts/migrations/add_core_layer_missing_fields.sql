-- 为 Core Layer 表添加缺失的字段
-- 执行时间: 2025-11-07

USE volunteer_system;

-- 1. 为 core_colleges 表添加缺失字段
ALTER TABLE core_colleges
  ADD COLUMN IF NOT EXISTS `rank` INT NULL COMMENT '院校排名',
  ADD COLUMN IF NOT EXISTS `level` VARCHAR(50) NULL COMMENT '院校等级',
  ADD COLUMN IF NOT EXISTS `min_score` INT NULL COMMENT '最低分数',
  ADD COLUMN IF NOT EXISTS `avg_score` INT NULL COMMENT '平均分数',
  ADD COLUMN IF NOT EXISTS `key_discipline_count` INT NULL COMMENT '重点学科数量',
  ADD COLUMN IF NOT EXISTS `features` JSON NULL COMMENT '院校特色',
  ADD COLUMN IF NOT EXISTS `evaluation_result` TEXT NULL COMMENT '评估结果';

-- 添加索引
ALTER TABLE core_colleges
  ADD INDEX IF NOT EXISTS `idx_rank` (`rank`);

-- 2. 为 core_majors 表添加缺失字段
ALTER TABLE core_majors
  ADD COLUMN IF NOT EXISTS `courses` JSON NULL COMMENT '课程列表',
  ADD COLUMN IF NOT EXISTS `career` JSON NULL COMMENT '职业前景',
  ADD COLUMN IF NOT EXISTS `skills` JSON NULL COMMENT '技能要求',
  ADD COLUMN IF NOT EXISTS `degree` VARCHAR(50) NULL COMMENT '学位类型',
  ADD COLUMN IF NOT EXISTS `years` INT NULL COMMENT '学制年数',
  ADD COLUMN IF NOT EXISTS `advantage_colleges` JSON NULL COMMENT '优势院校列表';

-- 3. 为 core_admission_scores 表添加缺失字段
ALTER TABLE core_admission_scores
  ADD COLUMN IF NOT EXISTS `major_group` VARCHAR(50) NULL COMMENT '专业组';

-- 4. 为 core_enrollment_plans 表添加缺失字段
ALTER TABLE core_enrollment_plans
  ADD COLUMN IF NOT EXISTS `college_city` VARCHAR(50) NULL COMMENT '院校城市',
  ADD COLUMN IF NOT EXISTS `college_is_world_class` BOOLEAN DEFAULT FALSE COMMENT '是否双一流';

-- 添加索引
ALTER TABLE core_enrollment_plans
  ADD INDEX IF NOT EXISTS `idx_college_city` (`college_city`);

SELECT '✅ 数据库迁移完成！已为 Core Layer 表添加所有缺失字段。' AS status;
