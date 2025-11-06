-- ============================================
-- 快速会话相关表迁移脚本
-- ============================================

USE volunteer_system;

-- 1. 快速会话表
CREATE TABLE IF NOT EXISTS quick_sessions (
  id VARCHAR(36) PRIMARY KEY COMMENT '快速会话ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  main_session_id VARCHAR(36) DEFAULT NULL COMMENT '关联的主会话ID',
  session_type ENUM('group_inquiry', 'group_compare', 'major_inquiry', 'general') NOT NULL COMMENT '会话类型',
  context JSON DEFAULT NULL COMMENT '上下文信息(groupIds, majorCodes, metadata)',
  total_messages INT DEFAULT 0 COMMENT '消息总数',
  is_merged BOOLEAN DEFAULT FALSE COMMENT '是否已合并到主会话',
  can_merge_to_main BOOLEAN DEFAULT TRUE COMMENT '是否可以合并到主会话',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_merged (is_merged),
  INDEX idx_main_session (main_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快速会话表';

-- 2. 会话快照表
CREATE TABLE IF NOT EXISTS session_snapshots (
  id VARCHAR(36) PRIMARY KEY COMMENT '快照ID',
  session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  snapshot_name VARCHAR(255) NOT NULL COMMENT '快照名称',
  messages_count INT DEFAULT 0 COMMENT '消息数量',
  snapshot_data JSON NOT NULL COMMENT '完整会话数据',
  metadata JSON DEFAULT NULL COMMENT '元数据(tags, note等)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_session (session_id),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话快照表';

-- 3. 智能建议缓存表
CREATE TABLE IF NOT EXISTS session_suggestions (
  id VARCHAR(36) PRIMARY KEY COMMENT '建议ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  session_id VARCHAR(36) DEFAULT NULL COMMENT '会话ID(可选)',
  context_hash VARCHAR(64) NOT NULL COMMENT 'groupIds的hash，用于缓存',
  suggestions JSON NOT NULL COMMENT '建议列表',
  context_summary TEXT DEFAULT NULL COMMENT '上下文摘要',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_context_hash (context_hash),
  INDEX idx_expires (expires_at),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能建议缓存表';

-- 4. 修改 agent_sessions 表，添加 mode 字段（先检查是否存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'volunteer_system'
AND TABLE_NAME = 'agent_sessions'
AND COLUMN_NAME = 'mode';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE agent_sessions ADD COLUMN mode ENUM(''quick'', ''deep'') DEFAULT ''deep'' COMMENT ''会话模式'' AFTER stage',
  'SELECT ''Column mode already exists'' as message');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证创建
SELECT 'quick_sessions' as table_name, COUNT(*) as row_count FROM quick_sessions
UNION ALL
SELECT 'session_snapshots', COUNT(*) FROM session_snapshots
UNION ALL
SELECT 'session_suggestions', COUNT(*) FROM session_suggestions;

SELECT 'Migration completed successfully!' as status;
