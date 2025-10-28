import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载环境变量
dotenv.config();

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('🔄 正在连接到 MySQL 服务器...');

    // 读取初始化脚本
    const sqlFile = path.join(__dirname, '../database/init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('🔄 正在执行初始化脚本...');
    await connection.query(sql);

    console.log('✅ 数据库创建成功!');
    console.log('✅ 表结构创建成功!');
    console.log('✅ 示例数据插入成功!');
  } catch (error) {
    console.error('❌ 创建数据库失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createDatabase();
