#!/usr/bin/env ts-node
/**
 * 导入专业基本介绍数据到Raw层
 * 数据源: E:\5plus1\DEV\zytb\zy_backend\data\20251107_zyjbjs.xlsx
 *
 * 策略：
 * 1. 导入到raw_csv_major_info表（新建）
 * 2. 通过专业代码匹配，更新cleaned_majors表
 * 3. 同步到core_majors表
 */
import * as XLSX from 'xlsx';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

interface MajorInfoRow {
  学科门类: string;
  专业类: string;
  层次: string;
  专业名称: string;
  专业代码: string;
  修业年限: string;
  授予学位: string;
  层次_1?: string;
  '选考（学科）建议': string;
  第一印象: string;
  性别比例: string;
  就业率: string;
  专业是什么: string;
  专业学什么: string;
  专业干什么: string;
  就业去向: string;
  就业地区分布: string;
  就业行业分布: string;
  就业岗位分布: string;
}

async function createRawTable(conn: mysql.Connection) {
  console.log('创建raw_csv_major_info表...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS raw_csv_major_info (
      id VARCHAR(36) PRIMARY KEY,
      batch_id VARCHAR(36) NOT NULL COMMENT '导入批次ID',
      \`row_number\` INT NOT NULL COMMENT '行号',

      -- 基本信息
      discipline VARCHAR(50) COMMENT '学科门类',
      major_category VARCHAR(100) COMMENT '专业类',
      education_level VARCHAR(20) COMMENT '层次',
      major_name VARCHAR(100) COMMENT '专业名称',
      major_code VARCHAR(20) COMMENT '专业代码',
      study_years VARCHAR(20) COMMENT '修业年限',
      degree VARCHAR(50) COMMENT '授予学位',
      subject_requirements VARCHAR(200) COMMENT '选考（学科）建议',

      -- 印象与统计
      first_impression TEXT COMMENT '第一印象（关键词）',
      gender_ratio TEXT COMMENT '性别比例',
      employment_rate TEXT COMMENT '就业率（多年数据）',

      -- 专业介绍
      what_is TEXT COMMENT '专业是什么',
      what_to_learn TEXT COMMENT '专业学什么',
      what_to_do TEXT COMMENT '专业干什么',
      job_prospects TEXT COMMENT '就业去向',

      -- 就业分布
      job_region_distribution TEXT COMMENT '就业地区分布',
      job_industry_distribution TEXT COMMENT '就业行业分布',
      job_position_distribution TEXT COMMENT '就业岗位分布',

      -- 元数据
      source_file VARCHAR(200) COMMENT '源文件名',
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_batch (batch_id),
      INDEX idx_major_code (major_code),
      INDEX idx_major_name (major_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Raw层 - CSV专业基本介绍'
  `);

  console.log('✅ raw_csv_major_info表创建成功');
}

async function importToRaw(conn: mysql.Connection) {
  const filePath = path.resolve(__dirname, '../../data/20251107_zyjbjs.xlsx');
  const batchId = uuidv4();

  console.log('\n📖 读取Excel文件...');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: MajorInfoRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`总共${data.length}条专业数据\n`);

  // 创建导入批次记录
  await conn.query(`
    INSERT INTO raw_import_batches (
      id, source_type, source_name, file_path,
      record_count, status, created_at
    ) VALUES (?, 'csv', 'major_basic_info', ?, ?, 'processing', NOW())
  `, [batchId, filePath, data.length]);

  console.log('开始导入到Raw层...');
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      await conn.query(`
        INSERT INTO raw_csv_major_info (
          id, batch_id, \`row_number\`,
          discipline, major_category, education_level, major_name, major_code,
          study_years, degree, subject_requirements,
          first_impression, gender_ratio, employment_rate,
          what_is, what_to_learn, what_to_do, job_prospects,
          job_region_distribution, job_industry_distribution, job_position_distribution,
          source_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), batchId, i + 1,
        row.学科门类, row.专业类, row.层次, row.专业名称, row.专业代码,
        row.修业年限, row.授予学位, row['选考（学科）建议'],
        row.第一印象, row.性别比例, row.就业率,
        row.专业是什么, row.专业学什么, row.专业干什么, row.就业去向,
        row.就业地区分布, row.就业行业分布, row.就业岗位分布,
        '20251107_zyjbjs.xlsx'
      ]);

      imported++;

      if (imported % 100 === 0) {
        console.log(`  已导入: ${imported}/${data.length}`);
      }
    } catch (error: any) {
      console.error(`  ⚠️  第${i + 1}行导入失败: ${error.message}`);
      skipped++;
    }
  }

  // 更新批次状态
  await conn.query(`
    UPDATE raw_import_batches
    SET status = 'completed', completed_at = NOW(), processed_count = ?
    WHERE id = ?
  `, [imported, batchId]);

  console.log(`\n✅ Raw层导入完成: ${imported}/${data.length}，跳过: ${skipped}`);
  return { imported, skipped, batchId };
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🚀 开始导入专业基本介绍数据\n');
  console.log('=' + '='.repeat(60) + '\n');

  try {
    // 第1步：创建Raw层表
    await createRawTable(conn);

    // 第2步：导入到Raw层
    const stats = await importToRaw(conn);

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 导入统计:');
    console.log(`  导入成功: ${stats.imported}`);
    console.log(`  导入失败: ${stats.skipped}`);
    console.log(`  批次ID: ${stats.batchId}`);

    console.log('\n💡 下一步:');
    console.log('  1. 运行清洗脚本，将数据从Raw层同步到Cleaned层');
    console.log('  2. 通过专业代码匹配，更新cleaned_majors表的详细信息');

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }

  console.log('\n✅ 全部完成!\n');
}

main();
