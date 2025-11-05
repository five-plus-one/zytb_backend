-- 志愿表系统重构迁移脚本
-- 添加 volunteer_tables 表并修改 volunteer_batches 表

-- 1. 创建志愿表 (volunteer_tables)
CREATE TABLE IF NOT EXISTS `volunteer_tables` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT '志愿表名称',
  `description` TEXT NULL COMMENT '志愿表描述',
  `is_current` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否为当前使用的志愿表',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `IDX_volunteer_tables_user_id` (`user_id`),
  INDEX `IDX_volunteer_tables_is_current` (`is_current`),
  INDEX `IDX_volunteer_tables_user_current` (`user_id`, `is_current`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='志愿表';

-- 2. 为现有用户创建默认志愿表
-- 为每个已有志愿批次的用户创建一个默认志愿表
INSERT INTO `volunteer_tables` (`id`, `user_id`, `name`, `is_current`, `created_at`, `updated_at`)
SELECT
  UUID() as id,
  vb.user_id,
  '我的志愿表' as name,
  TRUE as is_current,
  NOW() as created_at,
  NOW() as updated_at
FROM `volunteer_batches` vb
GROUP BY vb.user_id;

-- 3. 添加 table_id 列到 volunteer_batches
ALTER TABLE `volunteer_batches`
ADD COLUMN `table_id` VARCHAR(36) NULL COMMENT '志愿表ID' AFTER `user_id`;

-- 4. 为现有批次关联到默认志愿表
UPDATE `volunteer_batches` vb
INNER JOIN `volunteer_tables` vt ON vb.user_id = vt.user_id AND vt.is_current = TRUE
SET vb.table_id = vt.id;

-- 5. 将 table_id 设为 NOT NULL 并添加外键
ALTER TABLE `volunteer_batches`
MODIFY COLUMN `table_id` VARCHAR(36) NOT NULL,
ADD INDEX `IDX_volunteer_batches_table_id` (`table_id`),
ADD CONSTRAINT `FK_volunteer_batches_table_id`
  FOREIGN KEY (`table_id`) REFERENCES `volunteer_tables`(`id`) ON DELETE CASCADE;

-- 6. 确保每个用户只有一个当前志愿表的约束（通过唯一索引）
-- 注意：这个约束通过应用层逻辑控制更好，因为MySQL的条件唯一索引支持有限

SELECT '✅ 志愿表迁移完成！' as status;
