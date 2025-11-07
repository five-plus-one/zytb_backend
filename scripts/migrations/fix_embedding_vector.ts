#!/usr/bin/env ts-node
/**
 * 紧急修复：添加缺失的 embedding_vector 字段
 */
import { AppDataSource } from '../../src/config/database';

async function fixEmbeddingVector() {
  console.log('\n🚨 紧急修复：添加 embedding_vector 字段\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // 检查 embedding_vector 字段是否存在
    console.log('🔍 检查 core_majors.embedding_vector 字段...');

    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'volunteer_system'
        AND TABLE_NAME = 'core_majors'
        AND COLUMN_NAME = 'embedding_vector'
    `);

    if (!columns || columns.length === 0) {
      console.log('❌ embedding_vector 字段不存在，现在添加...\n');

      await queryRunner.query(`
        ALTER TABLE core_majors
        ADD COLUMN \`embedding_vector\` JSON NULL COMMENT '向量嵌入'
      `);

      console.log('✅ embedding_vector 字段已成功添加！\n');
    } else {
      console.log('✅ embedding_vector 字段已存在\n');
    }

    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('🎉 修复完成！\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    process.exit(1);
  }
}

fixEmbeddingVector();
