#!/usr/bin/env ts-node
/**
 * 三层数据库架构迁移脚本
 * 执行顺序: 创建表结构 -> 迁移数据 -> 验证
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// 加载环境变量
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'volunteer_system',
  multipleStatements: true
};

// 迁移文件列表
const migrationFiles = [
  '01_create_raw_data_layer.sql',
  '02_create_cleaned_staging_layer.sql',
  '03_create_core_runtime_layer.sql',
  '04_migrate_existing_data.sql'
];

const migrationDir = path.join(__dirname, '../migrations/three_tier_architecture');

/**
 * 执行SQL文件
 */
async function executeSqlFile(connection: mysql.Connection, filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  log(`\n📄 执行迁移文件: ${fileName}`, colors.cyan);

  const sqlContent = fs.readFileSync(filePath, 'utf8');

  try {
    const startTime = Date.now();
    await connection.query(sqlContent);
    const duration = Date.now() - startTime;

    log(`✅ ${fileName} 执行成功 (耗时: ${duration}ms)`, colors.green);
  } catch (error: any) {
    log(`❌ ${fileName} 执行失败:`, colors.red);
    console.error(error.message);
    throw error;
  }
}

/**
 * 数据库备份
 */
async function backupDatabase(): Promise<string> {
  log('\n🔄 开始备份现有数据库...', colors.yellow);

  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

  const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > "${backupFile}"`;

  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ 数据库备份成功: ${backupFile}`, colors.green);
    return backupFile;
  } catch (error: any) {
    log(`❌ 数据库备份失败: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * 验证迁移结果
 */
async function validateMigration(connection: mysql.Connection): Promise<void> {
  log('\n🔍 验证迁移结果...', colors.cyan);

  const checks = [
    {
      name: '原始数据层表',
      query: `
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = '${dbConfig.database}'
        AND table_name LIKE 'raw_%'
      `,
      expected: 7
    },
    {
      name: '清洗层表',
      query: `
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = '${dbConfig.database}'
        AND table_name LIKE 'cleaned_%' OR table_name LIKE 'entity_%'
      `,
      expected: 7
    },
    {
      name: '核心运算层表',
      query: `
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = '${dbConfig.database}'
        AND table_name LIKE 'core_%'
      `,
      expected: 6
    }
  ];

  for (const check of checks) {
    const [rows]: any = await connection.query(check.query);
    const actualCount = rows[0].count;

    if (actualCount >= check.expected) {
      log(`✅ ${check.name}: ${actualCount} 张表`, colors.green);
    } else {
      log(`⚠️  ${check.name}: 期望至少 ${check.expected} 张表, 实际 ${actualCount} 张表`, colors.yellow);
    }
  }

  // 检查数据迁移
  const dataChecks = [
    'SELECT COUNT(*) as count FROM cleaned_colleges',
    'SELECT COUNT(*) as count FROM cleaned_majors',
    'SELECT COUNT(*) as count FROM entity_college_name_mappings',
    'SELECT COUNT(*) as count FROM entity_major_name_mappings'
  ];

  log('\n📊 数据统计:', colors.cyan);
  for (const query of dataChecks) {
    const tableName = query.match(/FROM (\w+)/)?.[1] || '';
    const [rows]: any = await connection.query(query);
    const count = rows[0].count;
    log(`  ${tableName}: ${count} 条记录`, colors.blue);
  }
}

/**
 * 主函数
 */
async function main() {
  log('='.repeat(60), colors.cyan);
  log('     三层数据库架构迁移工具', colors.cyan);
  log('='.repeat(60), colors.cyan);

  log('\n数据库配置:', colors.blue);
  log(`  Host: ${dbConfig.host}`);
  log(`  Port: ${dbConfig.port}`);
  log(`  Database: ${dbConfig.database}`);
  log(`  User: ${dbConfig.user}`);

  // 确认提示
  log('\n⚠️  警告: 此操作将创建新的数据库表并迁移现有数据', colors.yellow);
  log('请确保已经备份重要数据!', colors.yellow);

  // 如果不是自动模式,等待确认
  if (!process.argv.includes('--auto')) {
    log('\n按 Ctrl+C 取消, 或等待 5 秒后自动继续...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  let connection: mysql.Connection | null = null;

  try {
    // 1. 备份数据库
    if (!process.argv.includes('--skip-backup')) {
      await backupDatabase();
    } else {
      log('\n⏭️  跳过数据库备份', colors.yellow);
    }

    // 2. 连接数据库
    log('\n🔗 连接数据库...', colors.cyan);
    connection = await mysql.createConnection(dbConfig);
    log('✅ 数据库连接成功', colors.green);

    // 3. 执行迁移文件
    log('\n🚀 开始执行迁移文件...', colors.cyan);

    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);

      if (!fs.existsSync(filePath)) {
        log(`⚠️  文件不存在,跳过: ${file}`, colors.yellow);
        continue;
      }

      await executeSqlFile(connection, filePath);
    }

    // 4. 验证迁移结果
    await validateMigration(connection);

    log('\n' + '='.repeat(60), colors.green);
    log('     ✅ 迁移完成!', colors.green);
    log('='.repeat(60), colors.green);

    log('\n下一步:', colors.cyan);
    log('  1. 检查数据迁移结果');
    log('  2. 运行数据验证脚本');
    log('  3. 开发 ETL 管道');
    log('  4. 适配应用层代码');

  } catch (error: any) {
    log('\n❌ 迁移失败!', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('\n🔌 数据库连接已关闭', colors.blue);
    }
  }
}

// 执行主函数
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
