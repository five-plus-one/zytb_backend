-- 扩展用户表字段
-- 添加位次、选科、偏好、角色等字段

USE volunteer_system;

-- 添加位次字段
ALTER TABLE `users`
  ADD COLUMN `exam_rank` INT NULL COMMENT '考试位次' AFTER `exam_score`;

-- 添加选科字段（存储JSON）
ALTER TABLE `users`
  ADD COLUMN `selected_subjects` TEXT NULL COMMENT '选考科目（JSON数组）' AFTER `subject_type`;

-- 添加偏好设置字段
ALTER TABLE `users`
  ADD COLUMN `preferences` VARCHAR(500) NULL COMMENT '用户偏好设置（JSON）' AFTER `selected_subjects`;

-- 添加角色字段（用于权限管理）
ALTER TABLE `users`
  ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '用户角色: user, admin' AFTER `preferences`;

-- 添加索引
ALTER TABLE `users` ADD INDEX `idx_role` (`role`);
ALTER TABLE `users` ADD INDEX `idx_exam_rank` (`exam_rank`);

SELECT 'User table extended successfully!' as message;
