#!/usr/bin/env ts-node
/**
 * 诊断major_id匹配问题
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function diagnose() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔍 诊断major_id匹配问题\n');

  // 检查core_admission_scores的major_id样例
  const [scores]: any = await conn.query(`
    SELECT major_id, major_name, college_name
    FROM core_admission_scores
    LIMIT 5
  `);

  console.log('core_admission_scores样例:');
  scores.forEach((s: any) => {
    console.log(`  major_id: ${s.major_id}, major_name: ${s.major_name}, college: ${s.college_name}`);
  });

  // 检查core_majors的id样例
  const [majors]: any = await conn.query(`
    SELECT id, name
    FROM core_majors
    LIMIT 5
  `);

  console.log('\ncore_majors样例:');
  majors.forEach((m: any) => {
    console.log(`  id: ${m.id}, name: ${m.name}`);
  });

  // 检查是否有匹配
  const [matches]: any = await conn.query(`
    SELECT COUNT(*) as count
    FROM core_admission_scores s
    INNER JOIN core_majors m ON s.major_id = m.id
  `);

  console.log(`\n匹配数量: ${matches[0].count}`);

  // 检查major_id是否为NULL
  const [nullIds]: any = await conn.query(`
    SELECT COUNT(*) as count
    FROM core_admission_scores
    WHERE major_id IS NULL
  `);

  console.log(`major_id为NULL的数量: ${nullIds[0].count}`);

  await conn.end();
}

diagnose().catch(console.error);
