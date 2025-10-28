require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== 检查 enrollment_plans 专业名称 ===');
  const [plans] = await conn.query(`
    SELECT id, college_name, major_name, major_group_name, major_code, major_group_code
    FROM enrollment_plans
    WHERE source_province = '江苏' AND year = 2025
    LIMIT 10
  `);
  console.table(plans);

  console.log('\n=== 检查这些专业名称是否为空 ===');
  const [nullCheck] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN major_name IS NULL OR major_name = '' THEN 1 ELSE 0 END) as null_major_name,
      SUM(CASE WHEN major_group_name IS NULL OR major_group_name = '' THEN 1 ELSE 0 END) as null_group_name
    FROM enrollment_plans
    WHERE source_province = '江苏' AND year = 2025
  `);
  console.table(nullCheck);

  await conn.end();
}

check().catch(console.error);
