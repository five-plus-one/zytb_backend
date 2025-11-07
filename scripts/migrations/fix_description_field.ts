#!/usr/bin/env ts-node
import { AppDataSource } from '../../src/config/database';

async function checkAndFixDescription() {
  console.log('\n🔍 检查 core_colleges 表结构...\n');

  try {
    await AppDataSource.initialize();
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // 检查 description 字段是否存在
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'volunteer_system'
        AND TABLE_NAME = 'core_colleges'
        AND COLUMN_NAME = 'description'
    `);

    if (!columns || columns.length === 0) {
      console.log('❌ description 字段不存在，现在添加...');
      await queryRunner.query(`
        ALTER TABLE core_colleges
        ADD COLUMN \`description\` TEXT NULL COMMENT '院校描述'
      `);
      console.log('✅ description 字段已添加');
    } else {
      console.log('✅ description 字段已存在');
    }

    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('\n✅ 检查完成！\n');
  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  }
}

checkAndFixDescription();
