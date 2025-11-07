import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';

/**
 * 执行SQL修复：将 agent_messages.content 从 TEXT 改为 LONGTEXT
 */
async function fixContentFieldLength() {
  console.log('🔧 开始修复 agent_messages.content 字段长度...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const queryRunner = AppDataSource.createQueryRunner();

    // 修改字段类型
    console.log('📝 执行 SQL: ALTER TABLE agent_messages MODIFY COLUMN content LONGTEXT...');
    await queryRunner.query(`
      ALTER TABLE agent_messages
      MODIFY COLUMN content LONGTEXT COMMENT '消息内容（纯文本，用于兼容和搜索）'
    `);
    console.log('✅ 字段类型修改成功\n');

    // 验证修改结果
    console.log('🔍 验证字段类型...');
    const result = await queryRunner.query(`
      SHOW FULL COLUMNS FROM agent_messages WHERE Field = 'content'
    `);

    if (result.length > 0) {
      console.log('📊 字段信息:');
      console.log(`   类型: ${result[0].Type}`);
      console.log(`   备注: ${result[0].Comment}`);

      if (result[0].Type === 'longtext') {
        console.log('\n✅ 验证成功：字段类型已更新为 LONGTEXT');
      } else {
        console.log('\n⚠️  警告：字段类型不是 LONGTEXT');
      }
    }

    await queryRunner.release();

  } catch (error: any) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ 数据库连接已关闭');
  }
}

// 执行修复
fixContentFieldLength()
  .then(() => {
    console.log('\n✅ 修复完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 修复失败:', error);
    process.exit(1);
  });
