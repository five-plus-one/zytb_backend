#!/usr/bin/env ts-node
/**
 * 清洗专业基本介绍数据：Raw → Cleaned → Core
 *
 * 策略：
 * 1. 从raw_csv_major_info读取
 * 2. 通过专业代码和名称匹配，更新cleaned_majors
 * 3. 同步更新majors表（旧表）
 * 4. 同步到core_majors表
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

interface CleaningStats {
  total: number;
  matched: number;
  updated: number;
  inserted: number;
  notMatched: number;
}

/**
 * 解析就业率字符串
 * 例如: "2015年：70%-75%、2016年：85%-90%、2017年：85%-90%"
 */
function parseEmploymentRate(rateStr: string): number | null {
  if (!rateStr) return null;

  // 提取最近一年的就业率
  const matches = rateStr.match(/(\d{4})年[：:]\s*(\d+)%-(\d+)%/g);
  if (!matches || matches.length === 0) return null;

  // 取最后一条（最新年份）
  const lastMatch = matches[matches.length - 1];
  const nums = lastMatch.match(/(\d+)%-(\d+)%/);
  if (!nums) return null;

  // 取中间值
  const min = parseInt(nums[1]);
  const max = parseInt(nums[2]);
  return (min + max) / 2;
}

/**
 * 解析修业年限
 * 例如: "四年" → 4
 */
function parseStudyYears(yearsStr: string): number {
  const map: { [key: string]: number } = {
    '一年': 1, '二年': 2, '三年': 3, '四年': 4,
    '五年': 5, '六年': 6, '七年': 7, '八年': 8
  };
  return map[yearsStr] || parseInt(yearsStr) || 4;
}

async function updateCleanedMajors(conn: mysql.Connection): Promise<CleaningStats> {
  console.log('\\n📊 开始更新cleaned_majors表...\\n');

  const stats: CleaningStats = {
    total: 0,
    matched: 0,
    updated: 0,
    inserted: 0,
    notMatched: 0
  };

  // 获取所有Raw层数据
  const [rawData]: any = await conn.query(`
    SELECT * FROM raw_csv_major_info
    ORDER BY major_code, major_name
  `);

  stats.total = rawData.length;
  console.log(`总共${stats.total}条Raw数据\\n`);

  for (const raw of rawData) {
    let existing: any[] = [];

    // 第1步：精确匹配（通过专业代码或名称）
    const [exactMatch]: any = await conn.query(`
      SELECT id, standard_name, code
      FROM cleaned_majors
      WHERE code = ? OR standard_name = ?
      LIMIT 1
    `, [raw.major_code, raw.major_name]);

    if (exactMatch.length > 0) {
      existing = exactMatch;
    } else {
      // 第2步：模糊匹配（通过专业名称）
      const [fuzzyMatch]: any = await conn.query(`
        SELECT id, standard_name, code,
          CASE
            WHEN standard_name LIKE ? THEN 90
            WHEN standard_name LIKE ? THEN 80
            WHEN standard_name LIKE ? THEN 70
            ELSE 60
          END as match_score
        FROM cleaned_majors
        WHERE standard_name LIKE ? OR standard_name LIKE ? OR standard_name LIKE ?
        ORDER BY match_score DESC, standard_name
        LIMIT 1
      `, [
        `${raw.major_name}%`,  // 开头匹配 - 90分
        `%${raw.major_name}`,  // 结尾匹配 - 80分
        `%${raw.major_name}%`, // 包含匹配 - 70分
        `${raw.major_name}%`,
        `%${raw.major_name}`,
        `%${raw.major_name}%`
      ]);

      if (fuzzyMatch.length > 0) {
        existing = fuzzyMatch;
        console.log(`  🔍 模糊匹配: "${raw.major_name}" → "${fuzzyMatch[0].standard_name}"`);
      }
    }

    if (existing.length > 0) {
      // 匹配到了，执行更新
      stats.matched++;

      // 计算就业率
      const employmentRate = parseEmploymentRate(raw.employment_rate);

      // 更新cleaned_majors
      try {
        await conn.query(`
          UPDATE cleaned_majors SET
            discipline = COALESCE(?, discipline),
            study_years = COALESCE(?, study_years),
            employment_rate = COALESCE(?, employment_rate),
            description = COALESCE(?, description),
            training_objective = COALESCE(?, training_objective),
            code = COALESCE(code, ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          raw.discipline,
          parseStudyYears(raw.study_years),
          employmentRate,
          raw.what_is,
          raw.what_to_do,
          raw.major_code,  // 补充缺失的专业代码
          existing[0].id
        ]);

        // 同时更新majors表（向后兼容）
        await conn.query(`
          UPDATE majors SET
            discipline = COALESCE(?, discipline),
            years = COALESCE(?, years),
            employment_rate = COALESCE(?, employment_rate),
            description = COALESCE(?, description),
            career = COALESCE(?, career),
            training_objective = COALESCE(?, training_objective),
            code = COALESCE(code, ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE code = ? OR name = ?
        `, [
          raw.discipline,
          parseStudyYears(raw.study_years),
          employmentRate,
          raw.what_is,
          raw.what_to_do,
          raw.job_prospects,
          raw.major_code,  // 补充缺失的专业代码
          raw.major_code,
          raw.major_name
        ]);

        stats.updated++;

        if (stats.updated % 50 === 0) {
          console.log(`  已更新: ${stats.updated}/${stats.matched}`);
        }
      } catch (error: any) {
        console.error(`  ⚠️  更新失败 [${raw.major_name}]: ${error.message}`);
      }
    } else {
      // 没有匹配到，新增到cleaned_majors
      try {
        const employmentRate = parseEmploymentRate(raw.employment_rate);
        const { v4: uuidv4 } = require('uuid');
        const newId = uuidv4();

        // 插入到cleaned_majors
        await conn.query(`
          INSERT INTO cleaned_majors (
            id, standard_name, code, discipline, category,
            study_years, employment_rate, description, training_objective,
            data_quality_score, verified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          newId,
          raw.major_name,
          raw.major_code,
          raw.discipline,
          raw.major_category || raw.discipline,
          parseStudyYears(raw.study_years),
          employmentRate,
          raw.what_is,
          raw.what_to_do,
          60,  // 初始数据质量评分
          0    // 未验证
        ]);

        // 同时插入到majors表（向后兼容）
        await conn.query(`
          INSERT INTO majors (
            id, name, code, discipline, category, years,
            employment_rate, description, training_objective, career,
            is_hot, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            discipline = VALUES(discipline),
            employment_rate = VALUES(employment_rate),
            description = VALUES(description),
            updated_at = NOW()
        `, [
          newId,
          raw.major_name,
          raw.major_code,
          raw.discipline,
          raw.major_category || raw.discipline,
          parseStudyYears(raw.study_years),
          employmentRate,
          raw.what_is,
          raw.what_to_do,
          raw.job_prospects,
          0
        ]);

        stats.inserted++;

        if (stats.inserted % 50 === 0) {
          console.log(`  ✨ 已新增: ${stats.inserted}`);
        }
      } catch (error: any) {
        stats.notMatched++;
        console.error(`  ❌ 新增失败 [${raw.major_name}]: ${error.message}`);
      }
    }
  }

  console.log(`\\n✅ Cleaned层更新完成:`);
  console.log(`  总计: ${stats.total}`);
  console.log(`  匹配更新: ${stats.matched}`);
  console.log(`  新增: ${stats.inserted}`);
  console.log(`  失败: ${stats.notMatched}`);

  return stats;
}

async function syncToCore(conn: mysql.Connection) {
  console.log('\\n🔄 同步到Core层...\\n');

  // 从cleaned_majors同步到core_majors
  const [majors]: any = await conn.query(`
    SELECT id FROM cleaned_majors
    WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `);

  console.log(`需要同步的专业: ${majors.length}条`);

  let synced = 0;
  for (const major of majors) {
    try {
      // 使用简化的同步逻辑
      await conn.query(`
        INSERT INTO core_majors (
          id, name, code, discipline, category, sub_category,
          degree_type, study_years, required_subjects,
          description, avg_salary, employment_rate,
          career_fields, data_version, last_synced_at,
          created_at, updated_at
        )
        SELECT
          id, standard_name, code, discipline, category, sub_category,
          degree_type, study_years, required_subjects,
          description, avg_salary, employment_rate,
          career_fields, 1, NOW(),
          created_at, updated_at
        FROM cleaned_majors
        WHERE id = ?
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          employment_rate = VALUES(employment_rate),
          description = VALUES(description),
          last_synced_at = NOW(),
          data_version = data_version + 1,
          updated_at = CURRENT_TIMESTAMP
      `, [major.id]);

      synced++;
    } catch (error: any) {
      console.error(`  ⚠️  同步失败 [${major.id}]: ${error.message}`);
    }
  }

  console.log(`\\n✅ Core层同步完成: ${synced}/${majors.length}`);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\\n🔄 开始清洗专业基本介绍数据\\n');
  console.log('=' + '='.repeat(60) + '\\n');

  try {
    // 第1步：更新Cleaned层
    const stats = await updateCleanedMajors(conn);

    // 第2步：同步到Core层
    await syncToCore(conn);

    console.log('\\n' + '='.repeat(60));
    console.log('\\n✅ 数据清洗完成!\\n');

    console.log('📊 最终统计:');
    console.log(`  原始数据: ${stats.total}`);
    console.log(`  匹配并更新: ${stats.updated}`);
    console.log(`  新增: ${stats.inserted}`);
    console.log(`  失败: ${stats.notMatched}`);
    console.log(`  处理率: ${(((stats.updated + stats.inserted) / stats.total) * 100).toFixed(1)}%\\n`);

  } catch (error) {
    console.error('\\n❌ 清洗失败:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
