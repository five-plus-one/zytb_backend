-- ====================================
-- AI消息工具调用格式支持 - 数据库迁移
-- ====================================
-- 日期: 2025-11-05
-- 目的: 为agent_messages表添加content_blocks字段，支持Claude API的结构化内容
-- 影响: 只添加新列，不影响已有数据

USE volunteer_system;

-- 添加content_blocks字段
ALTER TABLE agent_messages
ADD COLUMN content_blocks JSON NULL
COMMENT 'Claude API原始内容块(支持text、tool_use、tool_result等类型)';

-- 创建索引（可选，用于查询包含工具调用的消息）
-- CREATE INDEX idx_content_blocks_type ON agent_messages((CAST(content_blocks->'$[0].type' AS CHAR(20))));

-- 验证迁移
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'volunteer_system'
  AND TABLE_NAME = 'agent_messages'
  AND COLUMN_NAME = 'content_blocks';

-- 显示表结构
DESCRIBE agent_messages;
