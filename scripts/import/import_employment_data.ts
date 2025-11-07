#!/usr/bin/env ts-node
/**
 * 导入专业就业信息分析数据
 * 数据源: 20251107_3_zyjyxxfx.xlsx
 * 目标表: raw_csv_major_info (扩展字段)
 */
import * as XLSX from 'xlsx';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

interface EmploymentData {
  层次: string;
  学科门类: string;
  专业类: string;
  专业名称: string;
  '就业概况-名次': string;
  '就业概况-名次-描述': string;
  就业最多地区: string;
  就业最多行业: string;
  就业行业分布: string;
  就业行业分布比例: string;
  就业地区分布: string;
  就业地区分布比例: string;
  工资情况: string;
  工资比例: string;
  经验情况: string;
  经验比例: string;
  学历要求: string;
  学历比例: string;
  就业方向?: string;
  从事岗位: string;
  平均工资: number;
  工作年限: string;
  工作年限工资: string;
}

async function extendRawTable(conn: mysql.Connection) {
  console.log('扩展raw_csv_major_info表字段...');

  // 定义就业相关新字段
  const newFields = [
    { name: 'education_level', type: 'VARCHAR(20)', comment: '学历层次（本科/专科）' },
    { name: 'employment_rank', type: 'VARCHAR(50)', comment: '就业排名' },
    { name: 'employment_rank_desc', type: 'TEXT', comment: '就业排名描述' },
    { name: 'top_employment_city', type: 'VARCHAR(50)', comment: '就业最多城市' },
    { name: 'top_employment_industry', type: 'VARCHAR(100)', comment: '就业最多行业' },
    { name: 'employment_industries', type: 'JSON', comment: '就业行业分布' },
    { name: 'employment_industry_ratios', type: 'JSON', comment: '就业行业分布比例' },
    { name: 'employment_cities', type: 'JSON', comment: '就业地区分布' },
    { name: 'employment_city_ratios', type: 'JSON', comment: '就业地区分布比例' },
    { name: 'salary_ranges', type: 'JSON', comment: '工资范围分布' },
    { name: 'salary_range_ratios', type: 'JSON', comment: '工资范围比例' },
    { name: 'experience_requirements', type: 'JSON', comment: '经验要求分布' },
    { name: 'experience_ratios', type: 'JSON', comment: '经验要求比例' },
    { name: 'education_requirements', type: 'JSON', comment: '学历要求分布' },
    { name: 'education_requirement_ratios', type: 'JSON', comment: '学历要求比例' },
    { name: 'career_direction', type: 'TEXT', comment: '就业方向' },
    { name: 'job_positions', type: 'JSON', comment: '从事岗位列表' },
    { name: 'average_salary', type: 'INT', comment: '平均工资' },
    { name: 'salary_by_experience', type: 'JSON', comment: '不同工作年限工资' }
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

function parseJsonArray(str: string): string | null {
  if (!str) return null;
  try {
    // 如果已经是JSON格式，直接返回
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed);
  } catch {
    return JSON.stringify([]);
  }
}

function parseSalaryByExperience(experienceLevels: string, salaries: string): string | null {
  if (!experienceLevels || !salaries) return null;
  try {
    const levels = JSON.parse(experienceLevels);
    const amounts = JSON.parse(salaries);
    const result: any = {};
    levels.forEach((level: string, idx: number) => {
      result[level] = amounts[idx] || 0;
    });
    return JSON.stringify(result);
  } catch {
    return null;
  }
}

async function importToRaw(conn: mysql.Connection) {
  const filePath = path.resolve(__dirname, '../../data/20251107_3_zyjyxxfx.xlsx');
  const batchId = uuidv4();

  console.log('\\n📖 读取Excel文件...');

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: EmploymentData[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`总共${data.length}条就业数据`);

  // 创建批次记录
  await conn.query(`
    INSERT INTO raw_import_batches (id, source_type, source_name, record_count, status, created_at)
    VALUES (?, 'csv', '20251107_3_zyjyxxfx.xlsx', ?, 'processing', NOW())
  `, [batchId, data.length]);

  console.log('\\n开始导入到Raw层...');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // 检查是否已存在相同专业的记录
      const [existing]: any = await conn.query(`
        SELECT id FROM raw_csv_major_info
        WHERE major_name = ? AND education_level = ?
        LIMIT 1
      `, [row.专业名称, row.层次]);

      if (existing.length > 0) {
        // 更新现有记录
        await conn.query(`
          UPDATE raw_csv_major_info SET
            education_level = ?,
            employment_rank = ?,
            employment_rank_desc = ?,
            top_employment_city = ?,
            top_employment_industry = ?,
            employment_industries = ?,
            employment_industry_ratios = ?,
            employment_cities = ?,
            employment_city_ratios = ?,
            salary_ranges = ?,
            salary_range_ratios = ?,
            experience_requirements = ?,
            experience_ratios = ?,
            education_requirements = ?,
            education_requirement_ratios = ?,
            career_direction = ?,
            job_positions = ?,
            average_salary = ?,
            salary_by_experience = ?
          WHERE id = ?
        `, [
          row.层次,
          row['就业概况-名次'],
          row['就业概况-名次-描述'],
          row.就业最多地区,
          row.就业最多行业,
          parseJsonArray(row.就业行业分布),
          parseJsonArray(row.就业行业分布比例),
          parseJsonArray(row.就业地区分布),
          parseJsonArray(row.就业地区分布比例),
          parseJsonArray(row.工资情况),
          parseJsonArray(row.工资比例),
          parseJsonArray(row.经验情况),
          parseJsonArray(row.经验比例),
          parseJsonArray(row.学历要求),
          parseJsonArray(row.学历比例),
          row.就业方向 || null,
          parseJsonArray(row.从事岗位),
          row.平均工资 || null,
          parseSalaryByExperience(row.工作年限, row.工作年限工资),
          existing[0].id
        ]);
      } else {
        // 插入新记录
        const newId = uuidv4();
        await conn.query(`
          INSERT INTO raw_csv_major_info (
            id, batch_id, \`row_number\`, major_name, discipline, major_category,
            education_level, employment_rank, employment_rank_desc,
            top_employment_city, top_employment_industry,
            employment_industries, employment_industry_ratios,
            employment_cities, employment_city_ratios,
            salary_ranges, salary_range_ratios,
            experience_requirements, experience_ratios,
            education_requirements, education_requirement_ratios,
            career_direction, job_positions, average_salary, salary_by_experience
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newId, batchId, i + 1, row.专业名称, row.学科门类, row.专业类,
          row.层次,
          row['就业概况-名次'],
          row['就业概况-名次-描述'],
          row.就业最多地区,
          row.就业最多行业,
          parseJsonArray(row.就业行业分布),
          parseJsonArray(row.就业行业分布比例),
          parseJsonArray(row.就业地区分布),
          parseJsonArray(row.就业地区分布比例),
          parseJsonArray(row.工资情况),
          parseJsonArray(row.工资比例),
          parseJsonArray(row.经验情况),
          parseJsonArray(row.经验比例),
          parseJsonArray(row.学历要求),
          parseJsonArray(row.学历比例),
          row.就业方向 || null,
          parseJsonArray(row.从事岗位),
          row.平均工资 || null,
          parseSalaryByExperience(row.工作年限, row.工作年限工资)
        ]);
      }

      success++;

      if ((i + 1) % 100 === 0) {
        console.log(`  已导入: ${i + 1}/${data.length}`);
      }
    } catch (error: any) {
      failed++;
      console.error(`  ⚠️  第${i + 1}行导入失败: ${error.message}`);
    }
  }

  // 更新批次状态
  await conn.query(`
    UPDATE raw_import_batches
    SET record_count = ?, status = 'completed'
    WHERE id = ?
  `, [success, batchId]);

  console.log(`\\n✅ Raw层导入完成: ${success}/${data.length}，跳过: ${failed}`);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('🚀 开始导入专业就业信息分析数据\\n');
  console.log('=' + '='.repeat(60) + '\\n');

  try {
    // 第1步：扩展表字段
    await extendRawTable(conn);

    // 第2步：导入到Raw层
    await importToRaw(conn);

    console.log('\\n' + '='.repeat(60));
    console.log('\\n📊 导入统计:');
    console.log('\\n💡 下一步: 运行清洗脚本，更新cleaned_majors表\\n');
    console.log('✅ 全部完成!');

  } catch (error) {
    console.error('\\n❌ 导入失败:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
