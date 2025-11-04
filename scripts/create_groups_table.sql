-- 创建专业组表
CREATE TABLE IF NOT EXISTS `enrollment_plan_groups` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `college_code` VARCHAR(20) NOT NULL COMMENT '院校代码',
  `college_name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `group_code` VARCHAR(50) NOT NULL COMMENT '专业组代码（标准化后，无括号）',
  `group_code_raw` VARCHAR(50) NULL COMMENT '专业组代码（原始格式）',
  `group_name` VARCHAR(100) NULL COMMENT '专业组名称',
  `source_province` VARCHAR(50) NOT NULL COMMENT '生源省份',
  `subject_type` VARCHAR(50) NOT NULL COMMENT '科类',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `IDX_GROUP_UNIQUE` (`college_code`, `group_code`, `source_province`, `subject_type`),
  KEY `IDX_GROUP_COLLEGE` (`college_code`),
  KEY `IDX_GROUP_PROVINCE_TYPE` (`source_province`, `subject_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业组关联表';

-- 在 enrollment_plans 表中添加 group_id
ALTER TABLE `enrollment_plans`
ADD COLUMN `group_id` VARCHAR(36) NULL COMMENT '专业组ID' AFTER `major_group_name`,
ADD KEY `IDX_ENROLLMENT_GROUP` (`group_id`);

-- 在 admission_scores 表中添加 group_id
ALTER TABLE `admission_scores`
ADD COLUMN `group_id` VARCHAR(36) NULL COMMENT '专业组ID' AFTER `group_name`,
ADD KEY `IDX_ADMISSION_GROUP` (`group_id`),
ADD KEY `IDX_ADMISSION_GROUP_YEAR` (`group_id`, `year`);
