/**
 * 清除校园生活数据表
 */

import * as mysql from 'mysql2/promise';

async function clearData() {
  require('dotenv').config({ path: '.env.development' });

  console.log('清除校园生活数据...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'volunteer_system'
  });

  try {
    await connection.query('DELETE FROM college_campus_life');
    console.log('✓ college_campus_life 清除完成');

    await connection.query('DELETE FROM college_life_raw_answers');
    console.log('✓ college_life_raw_answers 清除完成');

  } catch (error) {
    console.error('✗ 清除失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  clearData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
