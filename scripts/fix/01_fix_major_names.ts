#!/usr/bin/env ts-node
/**
 * 修复Task 1: 补充core_admission_scores中缺失的专业名称
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function fixMajorNames() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔧 Task 1: 补充core_admission_scores专业名称\n');
  console.log('=' + '='.repeat(60) + '\n');

  try {
    // 检查缺失数量
    const [before]: any = await conn.query(`
      SELECT COUNT(*) as count
      FROM core_admission_scores
      WHERE major_name IS NULL OR major_name = ''
    `);

    console.log(`缺失专业名称的记录: ${before[0].count.toLocaleString()} 条\n`);

    // 执行更新
    console.log('开始更新...');
    await conn.query(`
      UPDATE core_admission_scores s
      INNER JOIN core_majors m ON s.major_id = m.id
      SET s.major_name = m.name
      WHERE s.major_name IS NULL OR s.major_name = ''
    `);

    // 检查更新后的结果
    const [after]: any = await conn.query(`
      SELECT COUNT(*) as count
      FROM core_admission_scores
      WHERE major_name IS NULL OR major_name = ''
    `);

    const fixed = before[0].count - after[0].count;

    console.log(`\n✅ 更新完成!`);
    console.log(`   已修复: ${fixed.toLocaleString()} 条`);
    console.log(`   剩余缺失: ${after[0].count.toLocaleString()} 条\n`);

  } catch (error) {
    console.error('\n❌ 更新失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

fixMajorNames().catch(console.error);
