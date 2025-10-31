/**
 * 执行数据库迁移脚本
 * 为 admission_scores 表添加新字段
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

// 加载环境变量
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'volunteer_system',
  multipleStatements: true
};

async function runMigration() {
  let connection;

  try {
    console.log('🔗 连接数据库...');
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`   Database: ${DB_CONFIG.database}`);

    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功\n');

    // ===== 第一步：添加字段 =====
    console.log('📝 第一步：添加新字段...');

    const fieldsToAdd = [
      { name: 'avg_score', definition: 'INT NULL' },
      { name: 'max_score', definition: 'INT NULL' },
      { name: 'max_rank', definition: 'INT NULL' },
      { name: 'plan_count', definition: 'INT NULL' },
      { name: 'score_volatility', definition: 'DECIMAL(5, 2) NULL' },
      { name: 'popularity_index', definition: 'INT NULL' },
      { name: 'college_code', definition: 'VARCHAR(20) NULL' },
      { name: 'group_code', definition: 'VARCHAR(50) NULL' },
      { name: 'group_name', definition: 'VARCHAR(100) NULL' }
    ];

    for (const field of fieldsToAdd) {
      try {
        // 先检查字段是否存在
        const [columns]: any = await connection.execute(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = ?
            AND table_name = 'admission_scores'
            AND column_name = ?
        `, [DB_CONFIG.database, field.name]);

        if (columns.length === 0) {
          // 字段不存在，添加它
          await connection.execute(`ALTER TABLE admission_scores ADD COLUMN ${field.name} ${field.definition}`);
          console.log(`   ✓ 添加字段: ${field.name}`);
        } else {
          console.log(`   ○ 字段已存在: ${field.name}`);
        }
      } catch (error: any) {
        console.error(`   ✗ 添加字段失败 ${field.name}: ${error.message}`);
        throw error;
      }
    }

    // ===== 第二步：添加索引 =====
    console.log('\n📊 第二步：添加索引...');

    const indexQueries = [
      {
        name: 'idx_admission_scores_group_query',
        query: 'CREATE INDEX idx_admission_scores_group_query ON admission_scores (college_code, group_code, source_province, subject_type, year)'
      },
      {
        name: 'idx_admission_scores_college_code',
        query: 'CREATE INDEX idx_admission_scores_college_code ON admission_scores (college_code)'
      },
      {
        name: 'idx_admission_scores_group_code',
        query: 'CREATE INDEX idx_admission_scores_group_code ON admission_scores (group_code)'
      },
      {
        name: 'idx_admission_scores_score_range',
        query: 'CREATE INDEX idx_admission_scores_score_range ON admission_scores (year, source_province, subject_type, min_score)'
      }
    ];

    for (const { name, query } of indexQueries) {
      try {
        await connection.execute(query);
        console.log(`   ✓ 创建索引: ${name}`);
      } catch (error: any) {
        // 如果索引已存在，忽略错误
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`   ○ 索引已存在: ${name}`);
        } else {
          console.warn(`   ⚠ 创建索引失败 ${name}: ${error.message}`);
        }
      }
    }

    // ===== 第三步：数据校验 =====
    console.log('\n🔍 第三步：数据校验...');

    const [columns]: any = await connection.execute(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'admission_scores'
        AND column_name IN (
          'avg_score', 'max_score', 'max_rank', 'plan_count',
          'score_volatility', 'popularity_index',
          'college_code', 'group_code', 'group_name'
        )
    `, [DB_CONFIG.database]);

    console.log(`   ✓ 新增字段数量: ${columns.length}/9`);
    columns.forEach((col: any) => {
      console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // ===== 第四步：补全现有数据 =====
    console.log('\n🔄 第四步：补全现有数据...');

    const [updateResult]: any = await connection.execute(`
      UPDATE admission_scores AS a
      INNER JOIN enrollment_plans AS ep
        ON a.college_name = ep.college_name
        AND a.source_province = ep.source_province
        AND a.subject_type = ep.subject_type
        AND a.year = ep.year
      SET
        a.college_code = ep.college_code,
        a.group_code = ep.major_group_code,
        a.group_name = ep.major_group_name
      WHERE a.college_code IS NULL OR a.group_code IS NULL
    `);

    console.log(`   ✓ 更新了 ${updateResult.affectedRows} 条记录`);

    // ===== 第五步：统计数据完整性 =====
    console.log('\n📈 第五步：统计数据完整性...');

    const [stats]: any = await connection.execute(`
      SELECT
        COUNT(*) AS total_records,
        COUNT(college_code) AS has_college_code,
        COUNT(group_code) AS has_group_code,
        COUNT(avg_score) AS has_avg_score,
        COUNT(max_score) AS has_max_score,
        COUNT(plan_count) AS has_plan_count
      FROM admission_scores
    `);

    const stat = stats[0];
    console.log(`   总记录数: ${stat.total_records}`);
    console.log(`   已填充 college_code: ${stat.has_college_code} (${Math.round(stat.has_college_code / stat.total_records * 100)}%)`);
    console.log(`   已填充 group_code: ${stat.has_group_code} (${Math.round(stat.has_group_code / stat.total_records * 100)}%)`);
    console.log(`   已填充 avg_score: ${stat.has_avg_score} (${Math.round(stat.has_avg_score / stat.total_records * 100)}%)`);
    console.log(`   已填充 max_score: ${stat.has_max_score} (${Math.round(stat.has_max_score / stat.total_records * 100)}%)`);
    console.log(`   已填充 plan_count: ${stat.has_plan_count} (${Math.round(stat.has_plan_count / stat.total_records * 100)}%)`);

    // ===== 第六步：查看示例数据 =====
    console.log('\n📋 第六步：查看示例数据...');

    const [samples]: any = await connection.execute(`
      SELECT
        college_code,
        college_name,
        group_code,
        group_name,
        year,
        min_score,
        avg_score,
        max_score,
        min_rank,
        max_rank,
        plan_count
      FROM admission_scores
      WHERE year = 2024
        AND source_province = '江苏'
        AND subject_type = '物理类'
      LIMIT 5
    `);

    console.log(`   查询到 ${samples.length} 条示例数据:`);
    samples.forEach((sample: any, index: number) => {
      console.log(`   ${index + 1}. ${sample.college_name} - ${sample.group_name || '(无专业组)'}`);
      console.log(`      年份: ${sample.year}, 分数: ${sample.min_score}${sample.avg_score ? '-' + sample.avg_score : ''}${sample.max_score ? '-' + sample.max_score : ''}`);
    });

    console.log('\n✅ 迁移完成！');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行迁移
runMigration();
