-- =============================================
-- 志愿填报系统 - 数据库初始化脚本
-- MySQL 8.0+
-- =============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `volunteer_system`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `volunteer_system`;

-- =============================================
-- 1. 用户表
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '用户ID (UUID)',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码 (加密)',
  `nickname` VARCHAR(50) NOT NULL COMMENT '昵称',
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `exam_year` INT DEFAULT NULL COMMENT '高考年份',
  `exam_score` INT DEFAULT NULL COMMENT '高考分数',
  `exam_rank` INT DEFAULT NULL COMMENT '考试位次',
  `subject_type` VARCHAR(20) DEFAULT NULL COMMENT '科目类型: 物理/历史',
  `selected_subjects` TEXT DEFAULT NULL COMMENT '选考科目 (JSON数组)',
  `preferences` VARCHAR(500) DEFAULT NULL COMMENT '用户偏好设置 (JSON)',
  `role` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '用户角色: user/admin',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_exam_rank` (`exam_rank`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =============================================
-- 2. 院校表
-- =============================================
CREATE TABLE IF NOT EXISTS `colleges` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '院校ID',
  `code` VARCHAR(20) NOT NULL UNIQUE COMMENT '院校代码',
  `name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `province` VARCHAR(20) DEFAULT NULL COMMENT '所在省份',
  `city` VARCHAR(50) DEFAULT NULL COMMENT '所在城市',
  `level` VARCHAR(20) DEFAULT NULL COMMENT '院校层次: 985/211/双一流/本科/专科',
  `type` VARCHAR(50) DEFAULT NULL COMMENT '院校类型: 综合/理工/师范等',
  `is_985` TINYINT DEFAULT 0 COMMENT '是否985',
  `is_211` TINYINT DEFAULT 0 COMMENT '是否211',
  `is_double_first_class` TINYINT DEFAULT 0 COMMENT '是否双一流',
  `website` VARCHAR(255) DEFAULT NULL COMMENT '官网',
  `description` TEXT DEFAULT NULL COMMENT '院校简介',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_name` (`name`),
  INDEX `idx_province` (`province`),
  INDEX `idx_level` (`level`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='院校表';

-- =============================================
-- 3. 专业表
-- =============================================
CREATE TABLE IF NOT EXISTS `majors` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '专业ID',
  `code` VARCHAR(20) NOT NULL UNIQUE COMMENT '专业代码',
  `name` VARCHAR(100) NOT NULL COMMENT '专业名称',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '专业大类',
  `degree_type` VARCHAR(20) DEFAULT NULL COMMENT '学位类型: 工学/理学/文学等',
  `duration` INT DEFAULT 4 COMMENT '学制(年)',
  `description` TEXT DEFAULT NULL COMMENT '专业介绍',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_name` (`name`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专业表';

-- =============================================
-- 4. 招生计划专业组表
-- =============================================
CREATE TABLE IF NOT EXISTS `enrollment_plan_groups` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '专业组ID',
  `group_code` VARCHAR(50) NOT NULL COMMENT '专业组代码',
  `college_code` VARCHAR(20) NOT NULL COMMENT '院校代码',
  `college_name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `year` INT NOT NULL COMMENT '招生年份',
  `province` VARCHAR(20) NOT NULL COMMENT '招生省份',
  `batch` VARCHAR(50) DEFAULT NULL COMMENT '批次: 本科批/专科批',
  `subject_requirement` VARCHAR(100) DEFAULT NULL COMMENT '选科要求',
  `tuition` DECIMAL(10,2) DEFAULT NULL COMMENT '学费',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_unique_group` (`group_code`, `college_code`, `year`, `province`),
  INDEX `idx_college_code` (`college_code`),
  INDEX `idx_year` (`year`),
  INDEX `idx_province` (`province`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招生计划专业组表';

-- =============================================
-- 5. 招生计划表
-- =============================================
CREATE TABLE IF NOT EXISTS `enrollment_plans` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '招生计划ID',
  `year` INT NOT NULL COMMENT '招生年份',
  `province` VARCHAR(20) NOT NULL COMMENT '招生省份',
  `college_code` VARCHAR(20) NOT NULL COMMENT '院校代码',
  `college_name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `major_code` VARCHAR(20) NOT NULL COMMENT '专业代码',
  `major_name` VARCHAR(100) NOT NULL COMMENT '专业名称',
  `group_code` VARCHAR(50) DEFAULT NULL COMMENT '专业组代码',
  `group_id` VARCHAR(36) DEFAULT NULL COMMENT '专业组ID (外键)',
  `enrollment_count` INT DEFAULT NULL COMMENT '招生人数',
  `tuition` DECIMAL(10,2) DEFAULT NULL COMMENT '学费',
  `duration` INT DEFAULT 4 COMMENT '学制',
  `batch` VARCHAR(50) DEFAULT NULL COMMENT '批次',
  `subject_requirement` VARCHAR(100) DEFAULT NULL COMMENT '选科要求',
  `remarks` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_year_province` (`year`, `province`),
  INDEX `idx_college_code` (`college_code`),
  INDEX `idx_major_code` (`major_code`),
  INDEX `idx_group_id` (`group_id`),
  INDEX `idx_group_code` (`group_code`),
  FOREIGN KEY (`group_id`) REFERENCES `enrollment_plan_groups`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招生计划表';

-- =============================================
-- 6. 历年录取分数表
-- =============================================
CREATE TABLE IF NOT EXISTS `admission_scores` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '录取分数ID',
  `year` INT NOT NULL COMMENT '年份',
  `province` VARCHAR(20) NOT NULL COMMENT '省份',
  `college_code` VARCHAR(20) NOT NULL COMMENT '院校代码',
  `college_name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `major_code` VARCHAR(20) DEFAULT NULL COMMENT '专业代码',
  `major_name` VARCHAR(100) DEFAULT NULL COMMENT '专业名称',
  `group_code` VARCHAR(50) DEFAULT NULL COMMENT '专业组代码',
  `group_id` VARCHAR(36) DEFAULT NULL COMMENT '专业组ID (外键)',
  `batch` VARCHAR(50) DEFAULT NULL COMMENT '批次',
  `subject_type` VARCHAR(20) DEFAULT NULL COMMENT '科目类型: 物理/历史',
  `min_score` INT DEFAULT NULL COMMENT '最低分',
  `avg_score` INT DEFAULT NULL COMMENT '平均分',
  `max_score` INT DEFAULT NULL COMMENT '最高分',
  `min_rank` INT DEFAULT NULL COMMENT '最低位次',
  `avg_rank` INT DEFAULT NULL COMMENT '平均位次',
  `enrollment_count` INT DEFAULT NULL COMMENT '录取人数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_year_province` (`year`, `province`),
  INDEX `idx_college_code` (`college_code`),
  INDEX `idx_major_code` (`major_code`),
  INDEX `idx_group_id` (`group_id`),
  INDEX `idx_group_code` (`group_code`),
  INDEX `idx_min_score` (`min_score`),
  INDEX `idx_min_rank` (`min_rank`),
  FOREIGN KEY (`group_id`) REFERENCES `enrollment_plan_groups`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='历年录取分数表';

-- =============================================
-- 7. 分数位次对照表
-- =============================================
CREATE TABLE IF NOT EXISTS `score_rankings` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT 'ID',
  `year` INT NOT NULL COMMENT '年份',
  `province` VARCHAR(20) NOT NULL COMMENT '省份',
  `subject_type` VARCHAR(20) NOT NULL COMMENT '科目类型: 物理/历史',
  `score` INT NOT NULL COMMENT '分数',
  `rank` INT NOT NULL COMMENT '位次',
  `total_students` INT DEFAULT NULL COMMENT '总人数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_unique_score_rank` (`year`, `province`, `subject_type`, `score`),
  INDEX `idx_year_province_subject` (`year`, `province`, `subject_type`),
  INDEX `idx_score` (`score`),
  INDEX `idx_rank` (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分数位次对照表';

-- =============================================
-- 8. 志愿表批次表
-- =============================================
CREATE TABLE IF NOT EXISTS `volunteer_batches` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '志愿表批次ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '志愿表名称',
  `year` INT NOT NULL COMMENT '填报年份',
  `province` VARCHAR(20) NOT NULL COMMENT '省份',
  `batch_type` VARCHAR(50) NOT NULL COMMENT '批次类型: 本科批/专科批',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-草稿, 1-已提交',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_year` (`year`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='志愿表批次表';

-- =============================================
-- 9. 志愿院校组表
-- =============================================
CREATE TABLE IF NOT EXISTS `volunteer_groups` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '志愿组ID',
  `batch_id` VARCHAR(36) NOT NULL COMMENT '批次ID',
  `order_num` INT NOT NULL COMMENT '志愿顺序',
  `college_code` VARCHAR(20) NOT NULL COMMENT '院校代码',
  `college_name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `group_code` VARCHAR(50) DEFAULT NULL COMMENT '专业组代码',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_batch_id` (`batch_id`),
  INDEX `idx_order_num` (`order_num`),
  FOREIGN KEY (`batch_id`) REFERENCES `volunteer_batches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='志愿院校组表';

-- =============================================
-- 10. 志愿专业表
-- =============================================
CREATE TABLE IF NOT EXISTS `volunteer_majors` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '志愿专业ID',
  `group_id` VARCHAR(36) NOT NULL COMMENT '志愿组ID',
  `order_num` INT NOT NULL COMMENT '专业顺序',
  `major_code` VARCHAR(20) NOT NULL COMMENT '专业代码',
  `major_name` VARCHAR(100) NOT NULL COMMENT '专业名称',
  `is_obey_adjustment` TINYINT DEFAULT 1 COMMENT '是否服从调剂',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_group_id` (`group_id`),
  INDEX `idx_order_num` (`order_num`),
  FOREIGN KEY (`group_id`) REFERENCES `volunteer_groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='志愿专业表';

-- =============================================
-- 11. AI对话会话表
-- =============================================
CREATE TABLE IF NOT EXISTS `agent_sessions` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '会话ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `title` VARCHAR(200) DEFAULT '新对话' COMMENT '会话标题',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/archived',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话会话表';

-- =============================================
-- 12. AI对话消息表
-- =============================================
CREATE TABLE IF NOT EXISTS `agent_messages` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '消息ID',
  `session_id` VARCHAR(36) NOT NULL COMMENT '会话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色: user/assistant/system',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `message_type` VARCHAR(50) DEFAULT 'chat' COMMENT '消息类型: chat/recommendation',
  `extracted_data` JSON DEFAULT NULL COMMENT '提取的结构化数据(推荐卡片等)',
  `metadata` JSON DEFAULT NULL COMMENT '元数据(工具调用等)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`session_id`) REFERENCES `agent_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话消息表';

-- =============================================
-- 13. AI用户偏好表
-- =============================================
CREATE TABLE IF NOT EXISTS `agent_preferences` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT 'ID',
  `user_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '用户ID',
  `preferred_provinces` JSON DEFAULT NULL COMMENT '偏好省份',
  `preferred_cities` JSON DEFAULT NULL COMMENT '偏好城市',
  `preferred_majors` JSON DEFAULT NULL COMMENT '偏好专业',
  `preferred_college_types` JSON DEFAULT NULL COMMENT '偏好院校类型',
  `avoid_majors` JSON DEFAULT NULL COMMENT '排除专业',
  `other_preferences` JSON DEFAULT NULL COMMENT '其他偏好',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI用户偏好表';

-- =============================================
-- 14. AI推荐记录表
-- =============================================
CREATE TABLE IF NOT EXISTS `agent_recommendations` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '推荐ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `session_id` VARCHAR(36) DEFAULT NULL COMMENT '会话ID',
  `message_id` VARCHAR(36) DEFAULT NULL COMMENT '消息ID',
  `college_code` VARCHAR(20) NOT NULL COMMENT '院校代码',
  `college_name` VARCHAR(100) NOT NULL COMMENT '院校名称',
  `major_code` VARCHAR(20) DEFAULT NULL COMMENT '专业代码',
  `major_name` VARCHAR(100) DEFAULT NULL COMMENT '专业名称',
  `group_code` VARCHAR(50) DEFAULT NULL COMMENT '专业组代码',
  `recommendation_type` VARCHAR(20) NOT NULL COMMENT '推荐类型: 冲刺/稳妥/保底',
  `match_score` DECIMAL(5,2) DEFAULT NULL COMMENT '匹配分数',
  `reason` TEXT DEFAULT NULL COMMENT '推荐理由',
  `is_favorited` TINYINT DEFAULT 0 COMMENT '是否收藏',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_recommendation_type` (`recommendation_type`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`session_id`) REFERENCES `agent_sessions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI推荐记录表';

-- =============================================
-- 15. 系统配置表
-- =============================================
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  `value` TEXT NOT NULL COMMENT '配置值',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- =============================================
-- 初始化系统配置数据
-- =============================================
INSERT INTO `system_config` (`id`, `key`, `value`, `description`) VALUES
(UUID(), 'smtp_host', 'smtp.qq.com', 'SMTP服务器地址'),
(UUID(), 'smtp_port', '587', 'SMTP端口'),
(UUID(), 'smtp_user', '', 'SMTP用户名'),
(UUID(), 'smtp_password', '', 'SMTP密码'),
(UUID(), 'smtp_from', '', '发件人地址')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- =============================================
-- 完成
-- =============================================
SELECT 'Database initialization completed successfully!' AS message;
