/**
 * 修复旧消息的contentBlocks字段
 *
 * 问题：旧的AI回复中包含推荐卡片数据，但存储在metadata.extractedData中，
 * contentBlocks字段为空，导致前端无法显示这些消息
 *
 * 修复：遍历所有消息，将metadata.extractedData转换为contentBlocks格式
 */

import { AppDataSource } from '../src/config/database';
import { AgentMessage } from '../src/models/AgentMessage';

async function fixOldMessagesContentBlocks() {
  try {
    console.log('🔧 开始修复旧消息的contentBlocks字段...\n');

    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 数据库连接成功\n');
    }

    const messageRepo = AppDataSource.getRepository(AgentMessage);

    // 查询所有assistant消息，且metadata不为空但contentBlocks为空
    const messages = await messageRepo
      .createQueryBuilder('message')
      .where('message.role = :role', { role: 'assistant' })
      .andWhere('message.metadata IS NOT NULL')
      .andWhere('message.content_blocks IS NULL')
      .getMany();

    console.log(`📊 找到 ${messages.length} 条需要修复的消息\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const message of messages) {
      try {
        // 检查metadata中是否有extractedData
        const metadata = message.metadata as any;

        if (metadata && metadata.extractedData) {
          // 转换为contentBlocks格式
          const contentBlocks = [{
            type: 'recommendation_cards',
            data: metadata.extractedData
          }];

          // 更新消息（使用原始SQL避免类型问题）
          await messageRepo.query(
            `UPDATE agent_messages SET content_blocks = ? WHERE id = ?`,
            [JSON.stringify(contentBlocks), message.id]
          );

          fixedCount++;
          console.log(`✅ [${fixedCount}] 修复消息: ${message.id.substring(0, 8)}... (${message.createdAt.toISOString()})`);
        } else {
          skippedCount++;
        }
      } catch (error: any) {
        console.error(`❌ 修复消息失败 ${message.id}:`, error.message);
      }
    }

    console.log(`\n📈 修复完成:`);
    console.log(`   ✅ 成功修复: ${fixedCount} 条`);
    console.log(`   ⏭️  跳过: ${skippedCount} 条`);
    console.log(`   📊 总计: ${messages.length} 条\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixOldMessagesContentBlocks();
