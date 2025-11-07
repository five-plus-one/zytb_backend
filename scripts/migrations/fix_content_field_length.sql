-- 修复 agent_messages.content 字段长度限制
-- 问题：TEXT类型最大只能存储65,535字节，当AI返回大量推荐卡片时会超限
-- 解决：改为LONGTEXT类型（最大4GB）

USE zy_gaokao;

-- 备份表结构（可选，建议执行）
-- CREATE TABLE agent_messages_backup_20250107 LIKE agent_messages;
-- INSERT INTO agent_messages_backup_20250107 SELECT * FROM agent_messages;

-- 修改字段类型
ALTER TABLE agent_messages
MODIFY COLUMN content LONGTEXT COMMENT '消息内容（纯文本，用于兼容和搜索）';

-- 验证修改
SHOW FULL COLUMNS FROM agent_messages WHERE Field = 'content';

-- 预期结果：Type 应该显示为 longtext
