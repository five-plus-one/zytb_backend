#!/usr/bin/env ts-node
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function checkFields() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n检查enrollment_plans表字段:\n');
  const [cols1]: any = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'enrollment_plans'
    ORDER BY ORDINAL_POSITION
  `);

  cols1.forEach((c: any) => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

  console.log('\n检查core_enrollment_plans表字段:\n');
  const [cols2]: any = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'core_enrollment_plans'
    ORDER BY ORDINAL_POSITION
  `);

  cols2.forEach((c: any) => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

  await conn.end();
}

checkFields().catch(console.error);
