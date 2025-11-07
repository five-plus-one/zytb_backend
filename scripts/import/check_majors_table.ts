#!/usr/bin/env ts-node
/**
 * 检查现有的majors表结构
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function checkMajorsTable() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n📋 检查majors表结构:\n');

  // 检查majors表结构
  const [columns]: any = await conn.query('DESCRIBE majors');
  console.log('majors表字段:');
  columns.forEach((col: any) => {
    console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });

  // 检查cleaned_majors表结构
  console.log('\n\ncleaned_majors表字段:');
  const [cleanedColumns]: any = await conn.query('DESCRIBE cleaned_majors');
  cleanedColumns.forEach((col: any) => {
    console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });

  // 检查是否有专业详细信息相关的表
  console.log('\n\n包含major的表:');
  const [tables]: any = await conn.query('SHOW TABLES LIKE "%major%"');
  tables.forEach((t: any) => console.log('  -', Object.values(t)[0]));

  // 检查majors表的样本数据
  console.log('\n\nmajors表样本数据:');
  const [samples]: any = await conn.query('SELECT * FROM majors LIMIT 3');
  samples.forEach((row: any, i: number) => {
    console.log(`\n第${i + 1}条:`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });

  await conn.end();
  console.log('\n✅ 检查完成!\n');
}

checkMajorsTable().catch(console.error);
