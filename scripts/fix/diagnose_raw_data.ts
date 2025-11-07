#!/usr/bin/env ts-node
/**
 * 诊断原始数据中的专业信息
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function diagnoseRawData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔍 诊断原始数据中的专业信息\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // 检查raw_csv_scores_data表
    console.log('1️⃣  检查raw_csv_scores_data表:\n');

    const [rawCols]: any = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'raw_csv_scores_data'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('   字段列表:');
    const colNames = rawCols.map((c: any) => c.COLUMN_NAME);
    colNames.forEach((name: string) => {
      if (name.toLowerCase().includes('major') || name.toLowerCase().includes('专业')) {
        console.log(`   ✓ ${name} <-- 包含专业信息`);
      } else {
        console.log(`     ${name}`);
      }
    });

    const [rawSample]: any = await conn.query(`
      SELECT * FROM raw_csv_scores_data LIMIT 3
    `);

    console.log('\n   样例数据:');
    rawSample.forEach((row: any, idx: number) => {
      console.log(`   记录 ${idx + 1}:`);
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().includes('major') || key.toLowerCase().includes('专业') || key === 'college_name') {
          console.log(`     ${key}: ${row[key]}`);
        }
      });
    });

    // 检查admission_scores表（旧表）
    console.log('\n\n2️⃣  检查admission_scores表（旧表）:\n');

    const [oldCols]: any = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'admission_scores'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('   字段列表:');
    const oldColNames = oldCols.map((c: any) => c.COLUMN_NAME);
    oldColNames.forEach((name: string) => {
      if (name.toLowerCase().includes('major') || name.toLowerCase().includes('专业')) {
        console.log(`   ✓ ${name} <-- 包含专业信息`);
      } else {
        console.log(`     ${name}`);
      }
    });

    const [oldCount]: any = await conn.query('SELECT COUNT(*) as count FROM admission_scores');
    console.log(`\n   总记录数: ${oldCount[0].count.toLocaleString()}`);

    const [oldSample]: any = await conn.query(`
      SELECT * FROM admission_scores LIMIT 3
    `);

    console.log('\n   样例数据:');
    oldSample.forEach((row: any, idx: number) => {
      console.log(`   记录 ${idx + 1}:`);
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().includes('major') || key.toLowerCase().includes('专业') || key === 'college_name') {
          console.log(`     ${key}: ${row[key]}`);
        }
      });
    });

    // 检查cleaned_admission_scores表
    console.log('\n\n3️⃣  检查cleaned_admission_scores表:\n');

    const [cleanedCols]: any = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cleaned_admission_scores'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('   字段列表:');
    const cleanedColNames = cleanedCols.map((c: any) => c.COLUMN_NAME);
    cleanedColNames.forEach((name: string) => {
      if (name.toLowerCase().includes('major') || name.toLowerCase().includes('专业')) {
        console.log(`   ✓ ${name} <-- 包含专业信息`);
      } else {
        console.log(`     ${name}`);
      }
    });

    const [cleanedSample]: any = await conn.query(`
      SELECT * FROM cleaned_admission_scores LIMIT 3
    `);

    console.log('\n   样例数据:');
    cleanedSample.forEach((row: any, idx: number) => {
      console.log(`   记录 ${idx + 1}:`);
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().includes('major') || key.toLowerCase().includes('专业')) {
          console.log(`     ${key}: ${row[key]}`);
        }
      });
    });

    console.log('\n' + '=' + '='.repeat(80) + '\n');
    console.log('✅ 诊断完成\n');

  } catch (error) {
    console.error('\n❌ 诊断失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

diagnoseRawData().catch(console.error);
