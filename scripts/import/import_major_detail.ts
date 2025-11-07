#!/usr/bin/env ts-node
/**
 * 导入第二个专业详细信息文件
 * 文件: 20251107_2_zyjsjxzb.xlsx
 *
 * 策略：合并到 raw_csv_major_info 表（扩展字段）
 */
import * as XLSX from 'xlsx';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

interface MajorDetailRow {
  学科门类: string;
  学科门类代码: string;
  一级学科: string;
  一级学科代码: string;
  专业: string;
  国标代码: string;
  学历层次: string;
  年限: string;
  薪资: string;
  专业简介: string;
  培养目标: string;
  培养要求: string;
  学科要求: string;
  知识能力: string;
  考研方向: string;
  主要课程: string;
  社会名人: string;
  就业方向: string;
  男生比例: string;
  女生比例: string;
  学位: string;
  就业地区分布: string;
  行业分布: string;
  职业分布: string;
  开设学校: string;
}

async function extendRawTable(conn: mysql.Connection) {
  console.log('扩展raw_csv_major_info表字段...');

  // 定义新字段
  const newFields = [
    { name: 'discipline_code', type: 'VARCHAR(10)', comment: '学科门类代码' },
    { name: 'category_code', type: 'VARCHAR(10)', comment: '一级学科代码' },
    { name: 'salary_history', type: 'TEXT', comment: '薪资历史数据' },
    { name: 'training_objective', type: 'TEXT', comment: '培养目标' },
    { name: 'training_requirements', type: 'TEXT', comment: '培养要求' },
    { name: 'knowledge_ability', type: 'TEXT', comment: '知识能力' },
    { name: 'postgrad_directions', type: 'TEXT', comment: '考研方向' },
    { name: 'famous_people', type: 'TEXT', comment: '社会名人' },
    { name: 'male_ratio', type: 'VARCHAR(20)', comment: '男生比例' },
    { name: 'female_ratio', type: 'VARCHAR(20)', comment: '女生比例' },
    { name: 'colleges_list', type: 'TEXT', comment: '开设学校列表' }
  ];

  for (const field of newFields) {
    try {
      // 检查字段是否存在
      const [columns]: any = await conn.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'raw_csv_major_info'
          AND COLUMN_NAME = ?
      `, [field.name]);

      // 字段不存在，才添加
      if (columns.length === 0) {
        await conn.query(`
          ALTER TABLE raw_csv_major_info
          ADD COLUMN ${field.name} ${field.type} COMMENT "${field.comment}"
        `);
        console.log(`  ✅ 添加字段: ${field.name}`);
      } else {
        console.log(`  ⏭️  字段已存在: ${field.name}`);
      }
    } catch (error: any) {
      console.error(`  ⚠️  添加字段 ${field.name} 失败: ${error.message}`);
    }
  }

  console.log('✅ 字段扩展完成');
}

async function importToRaw(conn: mysql.Connection) {
  const filePath = path.resolve(__dirname, '../../data/20251107_2_zyjsjxzb.xlsx');
  const batchId = uuidv4();

  console.log('\n📖 读取Excel文件...');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: MajorDetailRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`总共${data.length}条专业数据\n`);

  // 创建导入批次记录
  await conn.query(`
    INSERT INTO raw_import_batches (
      id, source_type, source_name, file_path,
      record_count, status, created_at
    ) VALUES (?, 'csv', 'major_detail_info', ?, ?, 'processing', NOW())
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
          discipline, discipline_code, major_category, category_code,
          education_level, major_name, major_code,
          study_years, degree, subject_requirements,
          salary_history, what_is, training_objective, training_requirements,
          knowledge_ability, postgrad_directions, what_to_learn,
          famous_people, what_to_do,
          male_ratio, female_ratio,
          job_region_distribution, job_industry_distribution, job_position_distribution,
          colleges_list, source_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), batchId, i + 1,
        row.学科门类, row.学科门类代码, row.一级学科, row.一级学科代码,
        row.学历层次, row.专业, row.国标代码,
        row.年限, row.学位, row.学科要求,
        row.薪资, row.专业简介, row.培养目标, row.培养要求,
        row.知识能力, row.考研方向, row.主要课程,
        row.社会名人, row.就业方向,
        row.男生比例, row.女生比例,
        row.就业地区分布, row.行业分布, row.职业分布,
        row.开设学校, '20251107_2_zyjsjxzb.xlsx'
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

  console.log('\n🚀 开始导入第二个专业详细信息文件\n');
  console.log('=' + '='.repeat(60) + '\n');

  try {
    // 第1步：扩展Raw层表字段
    await extendRawTable(conn);

    // 第2步：导入到Raw层
    const stats = await importToRaw(conn);

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 导入统计:');
    console.log(`  导入成功: ${stats.imported}`);
    console.log(`  导入失败: ${stats.skipped}`);
    console.log(`  批次ID: ${stats.batchId}`);

    console.log('\n💡 下一步: 运行清洗脚本，更新cleaned_majors表');

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }

  console.log('\n✅ 全部完成!\n');
}

main();
