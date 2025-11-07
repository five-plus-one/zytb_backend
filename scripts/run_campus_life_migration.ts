/**
 * 执行MySQL迁移脚本
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

async function runMigration() {
  // 加载环境变量
  require('dotenv').config({ path: '.env.development' });

  console.log('开始执行数据库迁移...\n');

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'volunteer_system',
    multipleStatements: true
  });

  try {
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'migrations', 'create_campus_life_tables_mysql.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('执行SQL脚本...');
    await connection.query(sql);

    console.log('✓ 数据库表创建成功！');
    console.log('\n创建的表:');
    console.log('  - college_campus_life (校园生活主表)');
    console.log('  - college_life_raw_answers (原始答案表)');

  } catch (error) {
    console.error('✗ 迁移失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
