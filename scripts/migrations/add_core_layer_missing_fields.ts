#!/usr/bin/env ts-node
/**
 * 数据库迁移脚本：为 Core Layer 表添加缺失字段
 */
import { AppDataSource } from '../../src/config/database';

async function runMigration() {
  console.log('\n🚀 开始数据库迁移：添加 Core Layer 缺失字段\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // 1. 为 core_colleges 表添加缺失字段
    console.log('📝 Step 1: 修改 core_colleges 表...');

    const collegeFields = [
      { name: 'rank', type: 'INT', comment: '院校排名' },
      { name: 'level', type: 'VARCHAR(50)', comment: '院校等级' },
      { name: 'min_score', type: 'INT', comment: '最低分数' },
      { name: 'avg_score', type: 'INT', comment: '平均分数' },
      { name: 'key_discipline_count', type: 'INT', comment: '重点学科数量' },
      { name: 'features', type: 'JSON', comment: '院校特色' },
      { name: 'evaluation_result', type: 'TEXT', comment: '评估结果' }
    ];

    for (const field of collegeFields) {
      try {
        await queryRunner.query(
          `ALTER TABLE core_colleges ADD COLUMN \`${field.name}\` ${field.type} NULL COMMENT '${field.comment}'`
        );
        console.log(`  ✅ 添加字段: ${field.name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⏭️  字段已存在: ${field.name}`);
        } else {
          throw error;
        }
      }
    }

    // 添加索引
    try {
      await queryRunner.query(`ALTER TABLE core_colleges ADD INDEX idx_rank (\`rank\`)`);
      console.log(`  ✅ 添加索引: idx_rank`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`  ⏭️  索引已存在: idx_rank`);
      } else {
        throw error;
      }
    }

    // 2. 为 core_majors 表添加缺失字段
    console.log('\n📝 Step 2: 修改 core_majors 表...');

    const majorFields = [
      { name: 'courses', type: 'JSON', comment: '课程列表' },
      { name: 'career', type: 'JSON', comment: '职业前景' },
      { name: 'skills', type: 'JSON', comment: '技能要求' },
      { name: 'degree', type: 'VARCHAR(50)', comment: '学位类型' },
      { name: 'years', type: 'INT', comment: '学制年数' },
      { name: 'advantage_colleges', type: 'JSON', comment: '优势院校列表' }
    ];

    for (const field of majorFields) {
      try {
        await queryRunner.query(
          `ALTER TABLE core_majors ADD COLUMN \`${field.name}\` ${field.type} NULL COMMENT '${field.comment}'`
        );
        console.log(`  ✅ 添加字段: ${field.name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⏭️  字段已存在: ${field.name}`);
        } else {
          throw error;
        }
      }
    }

    // 3. 为 core_admission_scores 表添加缺失字段
    console.log('\n📝 Step 3: 修改 core_admission_scores 表...');

    try {
      await queryRunner.query(
        `ALTER TABLE core_admission_scores ADD COLUMN \`major_group\` VARCHAR(50) NULL COMMENT '专业组'`
      );
      console.log(`  ✅ 添加字段: major_group`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ⏭️  字段已存在: major_group`);
      } else {
        throw error;
      }
    }

    // 4. 为 core_enrollment_plans 表添加缺失字段
    console.log('\n📝 Step 4: 修改 core_enrollment_plans 表...');

    const planFields = [
      { name: 'college_city', type: 'VARCHAR(50)', comment: '院校城市' },
      { name: 'college_is_world_class', type: 'BOOLEAN DEFAULT FALSE', comment: '是否双一流' }
    ];

    for (const field of planFields) {
      try {
        await queryRunner.query(
          `ALTER TABLE core_enrollment_plans ADD COLUMN \`${field.name}\` ${field.type} COMMENT '${field.comment}'`
        );
        console.log(`  ✅ 添加字段: ${field.name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⏭️  字段已存在: ${field.name}`);
        } else {
          throw error;
        }
      }
    }

    // 添加索引
    try {
      await queryRunner.query(`ALTER TABLE core_enrollment_plans ADD INDEX idx_college_city (college_city)`);
      console.log(`  ✅ 添加索引: idx_college_city`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`  ⏭️  索引已存在: idx_college_city`);
      } else {
        throw error;
      }
    }

    await queryRunner.release();

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 数据库迁移完成！所有 Core Layer 表已成功更新。\n');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runMigration();
