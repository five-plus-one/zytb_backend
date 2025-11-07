#!/usr/bin/env ts-node
/**
 * 检查Core Layer所有表的数据状态
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

async function checkCoreLayerStatus() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔍 检查Core Layer数据表状态\n');
  console.log('=' + '='.repeat(80) + '\n');

  // Core Layer所有表
  const coreTables = [
    'core_colleges',
    'core_majors',
    'core_admission_scores',
    'core_campus_life',
    'core_enrollment_plans',
    'core_college_major_relations',
    'core_major_career_info',
    'core_province_admission_stats'
  ];

  const tableStatus: any[] = [];

  for (const table of coreTables) {
    try {
      // 获取表的行数
      const [countResult]: any = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = countResult[0].count;

      // 获取表结构
      const [columns]: any = await conn.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [table]);

      tableStatus.push({
        table,
        count,
        columns: columns.length,
        status: count > 0 ? '✅ 有数据' : '⚠️  空表'
      });

      console.log(`📊 ${table}`);
      console.log(`   记录数: ${count.toLocaleString()}`);
      console.log(`   字段数: ${columns.length}`);
      console.log(`   状态: ${count > 0 ? '✅ 有数据' : '⚠️  空表'}`);

      if (count === 0) {
        console.log(`   ⚠️  警告: 该表为空，需要迁移数据`);
      }

      console.log('');
    } catch (error: any) {
      console.log(`❌ ${table}`);
      console.log(`   错误: ${error.message}\n`);
      tableStatus.push({
        table,
        count: 0,
        columns: 0,
        status: '❌ 错误'
      });
    }
  }

  console.log('=' + '='.repeat(80) + '\n');
  console.log('📈 汇总统计:\n');

  const totalTables = tableStatus.length;
  const tablesWithData = tableStatus.filter(t => t.count > 0).length;
  const emptyTables = tableStatus.filter(t => t.count === 0 && t.status !== '❌ 错误').length;
  const errorTables = tableStatus.filter(t => t.status === '❌ 错误').length;
  const totalRecords = tableStatus.reduce((sum, t) => sum + t.count, 0);

  console.log(`  总表数: ${totalTables}`);
  console.log(`  有数据的表: ${tablesWithData} ✅`);
  console.log(`  空表: ${emptyTables} ⚠️`);
  console.log(`  错误的表: ${errorTables} ❌`);
  console.log(`  总记录数: ${totalRecords.toLocaleString()}\n`);

  if (emptyTables > 0) {
    console.log('⚠️  需要迁移数据的空表:\n');
    tableStatus
      .filter(t => t.count === 0 && t.status !== '❌ 错误')
      .forEach(t => console.log(`  - ${t.table}`));
    console.log('');
  }

  await conn.end();
}

checkCoreLayerStatus().catch(console.error);
