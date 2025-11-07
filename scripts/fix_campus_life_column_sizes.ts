/**
 * 修复校园生活数据表字段长度问题
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

async function fixColumnSizes() {
  // 加载环境变量
  require('dotenv').config({ path: '.env.development' });

  console.log('开始修复数据库字段长度...\n');

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
    const sqlPath = path.join(__dirname, 'migrations', 'fix_campus_life_column_sizes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('执行SQL脚本...');
    await connection.query(sql);

    console.log('✓ 字段长度修复成功！');

  } catch (error) {
    console.error('✗ 修复失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  fixColumnSizes().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
