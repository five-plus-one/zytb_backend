#!/usr/bin/env ts-node
/**
 * 检查cleaned_admission_scores表结构
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function checkStructure() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔍 检查cleaned_admission_scores表结构\n');

  const [columns]: any = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cleaned_admission_scores'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('字段列表:');
  columns.forEach((col: any) => {
    console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });

  const [count]: any = await conn.query('SELECT COUNT(*) as count FROM cleaned_admission_scores');
  console.log(`\n记录数: ${count[0].count}`);

  await conn.end();
}

checkStructure().catch(console.error);
