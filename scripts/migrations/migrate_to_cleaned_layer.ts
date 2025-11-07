#!/usr/bin/env ts-node
/**
 * 阶段2: 数据迁移脚本
 * 从现有表迁移到三层架构的清洗层
 */

import { AppDataSource } from '../../src/config/database';
import { College } from '../../src/models/College';
import { Major } from '../../src/models/Major';
import { AdmissionScore } from '../../src/models/AdmissionScore';
import { CollegeCampusLife } from '../../src/models/CollegeCampusLife';
import { v4 as uuidv4 } from 'uuid';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../', process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'volunteer_system',
  multipleStatements: true
};

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

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

/**
 * 计算数据质量分数
 */
function calculateQualityScore(record: any, requiredFields: string[]): number {
  let score = 0;
  const pointsPerField = 100 / requiredFields.length;

  for (const field of requiredFields) {
    if (record[field] !== null && record[field] !== undefined && record[field] !== '') {
      score += pointsPerField;
    }
  }

  return Math.round(score);
}

/**
 * 迁移院校数据
 */
async function migrateColleges(connection: mysql.Connection): Promise<MigrationStats> {
  log('\n🏫 开始迁移院校数据...', colors.cyan);

  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 };

  try {
    // 读取现有院校数据
    const [colleges]: any = await connection.query('SELECT * FROM colleges');
    stats.total = colleges.length;

    log(`  发现 ${stats.total} 条院校记录`, colors.blue);

    for (const college of colleges) {
      try {
        // 计算数据质量分
        const requiredFields = ['name', 'code', 'province', 'city', 'type', 'address', 'website'];
        const dataQualityScore = calculateQualityScore(college, requiredFields);

        const allFields = [...requiredFields, 'admission_phone', 'email', 'student_count', 'teacher_count',
          'founded_year', 'is_985', 'is_211', 'postgraduate_rate', 'national_special_major_count',
          'world_class_disciplines', 'academician_count', 'affiliation', 'key_level'];
        const completenessScore = calculateQualityScore(college, allFields);

        // 插入到cleaned_colleges
        await connection.query(`
          INSERT INTO cleaned_colleges (
            id, standard_name, short_name, code, province, city, college_type,
            affiliation, is_985, is_211, is_double_first_class, is_world_class,
            is_art, is_national_key, key_level, education_level,
            postgraduate_rate, national_special_major_count, province_special_major_count,
            world_class_disciplines, founded_year, female_ratio, male_ratio,
            student_count, teacher_count, academician_count,
            admission_phone, email, address, website,
            data_quality_score, completeness_score, verified,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            standard_name = VALUES(standard_name),
            updated_at = CURRENT_TIMESTAMP
        `, [
          college.id,
          college.name,
          null,  // short_name
          college.code,
          college.province,
          college.city,
          college.type,
          college.affiliation,
          college.is_985 || false,
          college.is_211 || false,
          college.is_double_first_class || false,
          college.is_world_class || false,
          college.is_art || false,
          college.is_national_key || false,
          college.key_level,
          college.education_level,
          college.postgraduate_rate,
          college.national_special_major_count,
          college.province_special_major_count,
          college.world_class_disciplines,
          college.founded_year,
          college.female_ratio,
          college.male_ratio,
          college.student_count,
          college.teacher_count,
          college.academician_count,
          college.admission_phone,
          college.email,
          college.address,
          college.website,
          dataQualityScore,
          completenessScore,
          false,  // verified
          college.created_at,
          college.updated_at
        ]);

        // 创建精确名称映射
        await connection.query(`
          INSERT INTO entity_college_name_mappings (
            id, source_name, normalized_name, cleaned_college_id,
            mapping_type, confidence_score, source_type, verified, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            cleaned_college_id = VALUES(cleaned_college_id)
        `, [
          uuidv4(),
          college.name,
          college.name,
          college.id,
          'exact',
          1.00,
          'legacy',
          true
        ]);

        // 如果有newName,创建别名映射
        if (college.new_name && college.new_name !== college.name) {
          await connection.query(`
            INSERT INTO entity_college_name_mappings (
              id, source_name, normalized_name, cleaned_college_id,
              mapping_type, confidence_score, source_type, verified, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              cleaned_college_id = VALUES(cleaned_college_id)
          `, [
            uuidv4(),
            college.new_name,
            college.name,
            college.id,
            'alias',
            0.95,
            'legacy',
            false
          ]);
        }

        stats.success++;
      } catch (error: any) {
        log(`    ❌ 迁移失败: ${college.name} - ${error.message}`, colors.red);
        stats.failed++;
      }
    }

    log(`  ✅ 院校迁移完成: ${stats.success}/${stats.total}`, colors.green);

  } catch (error: any) {
    log(`  ❌ 院校迁移失败: ${error.message}`, colors.red);
    throw error;
  }

  return stats;
}

/**
 * 迁移专业数据
 */
async function migrateMajors(connection: mysql.Connection): Promise<MigrationStats> {
  log('\n📚 开始迁移专业数据...', colors.cyan);

  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 };

  try {
    const [majors]: any = await connection.query('SELECT * FROM majors');
    stats.total = majors.length;

    log(`  发现 ${stats.total} 条专业记录`, colors.blue);

    for (const major of majors) {
      try {
        const requiredFields = ['name', 'code', 'category', 'discipline'];
        const dataQualityScore = calculateQualityScore(major, [
          ...requiredFields, 'description', 'avg_salary', 'employment_rate', 'career_fields'
        ]);

        await connection.query(`
          INSERT INTO cleaned_majors (
            id, standard_name, code, discipline, category, sub_category,
            degree_type, study_years, required_subjects, training_objective,
            avg_salary, employment_rate, career_fields, courses, skills,
            description, data_quality_score, verified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            standard_name = VALUES(standard_name),
            updated_at = CURRENT_TIMESTAMP
        `, [
          major.id,
          major.name,
          major.code,
          major.discipline,
          major.category,
          major.sub_category,
          major.degree_type,
          major.years || 4,
          JSON.stringify(major.required_subjects),
          major.training_objective,
          major.avg_salary,
          major.employment_rate,
          JSON.stringify(major.career_fields),
          JSON.stringify(major.courses),
          JSON.stringify(major.skills),
          major.description,
          dataQualityScore,
          false,
          major.created_at,
          major.updated_at
        ]);

        // 创建名称映射
        await connection.query(`
          INSERT INTO entity_major_name_mappings (
            id, source_name, normalized_name, cleaned_major_id,
            mapping_type, confidence_score, source_type, verified, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            cleaned_major_id = VALUES(cleaned_major_id)
        `, [
          uuidv4(),
          major.name,
          major.name,
          major.id,
          'exact',
          1.00,
          'legacy',
          true
        ]);

        stats.success++;
      } catch (error: any) {
        log(`    ❌ 迁移失败: ${major.name} - ${error.message}`, colors.red);
        stats.failed++;
      }
    }

    log(`  ✅ 专业迁移完成: ${stats.success}/${stats.total}`, colors.green);

  } catch (error: any) {
    log(`  ❌ 专业迁移失败: ${error.message}`, colors.red);
    throw error;
  }

  return stats;
}

/**
 * 迁移录取分数数据
 */
async function migrateAdmissionScores(connection: mysql.Connection): Promise<MigrationStats> {
  log('\n📊 开始迁移录取分数数据...', colors.cyan);

  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 };

  try {
    const [scores]: any = await connection.query('SELECT * FROM admission_scores LIMIT 100000');
    stats.total = scores.length;

    log(`  发现 ${stats.total} 条录取分数记录`, colors.blue);

    let batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < scores.length; i += batchSize) {
      const batch = scores.slice(i, i + batchSize);

      for (const score of batch) {
        try {
          // 通过名称映射找到cleaned_college_id
          const [mapping]: any = await connection.query(`
            SELECT cleaned_college_id FROM entity_college_name_mappings
            WHERE source_name = ? AND source_type = 'legacy'
            LIMIT 1
          `, [score.college_name]);

          if (!mapping || mapping.length === 0) {
            stats.skipped++;
            continue;
          }

          const cleanedCollegeId = mapping[0].cleaned_college_id;

          const dataQualityScore = calculateQualityScore(score, [
            'min_score', 'min_rank', 'avg_score', 'plan_count'
          ]);

          await connection.query(`
            INSERT INTO cleaned_admission_scores (
              id, cleaned_college_id, cleaned_major_id, year, source_province,
              subject_type, batch, min_score, min_rank, avg_score, max_score,
              max_rank, plan_count, major_group_code, major_group_name,
              subject_requirements, data_quality_score, data_source,
              raw_source_type, raw_source_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              min_score = VALUES(min_score),
              updated_at = CURRENT_TIMESTAMP
          `, [
            score.id,
            cleanedCollegeId,
            null,  // cleaned_major_id - 需要后续通过专业名称映射
            score.year,
            score.source_province,
            score.subject_type,
            score.batch,
            score.min_score,
            score.min_rank,
            score.avg_score,
            score.max_score,
            score.max_rank,
            score.plan_count,
            score.group_code,
            score.group_name,
            score.subject_requirements,
            dataQualityScore,
            'legacy_admission_scores',
            'legacy',
            score.id,
            score.created_at,
            score.updated_at
          ]);

          stats.success++;
        } catch (error: any) {
          stats.failed++;
        }
      }

      processed += batch.length;
      if (processed % 10000 === 0) {
        log(`    处理进度: ${processed}/${stats.total} (${((processed / stats.total) * 100).toFixed(1)}%)`, colors.blue);
      }
    }

    log(`  ✅ 录取分数迁移完成: ${stats.success}/${stats.total}, 跳过: ${stats.skipped}`, colors.green);

  } catch (error: any) {
    log(`  ❌ 录取分数迁移失败: ${error.message}`, colors.red);
    throw error;
  }

  return stats;
}

/**
 * 迁移校园生活数据
 */
async function migrateCampusLife(connection: mysql.Connection): Promise<MigrationStats> {
  log('\n🏠 开始迁移校园生活数据...', colors.cyan);

  const stats: MigrationStats = { total: 0, success: 0, failed: 0, skipped: 0 };

  try {
    const [campusLife]: any = await connection.query('SELECT * FROM college_campus_life');
    stats.total = campusLife.length;

    log(`  发现 ${stats.total} 条校园生活记录`, colors.blue);

    for (const cl of campusLife) {
      try {
        const dataQualityScore = calculateQualityScore(cl, [
          'dorm_score', 'canteen_quality_score', 'transport_score', 'reliability', 'answer_count'
        ]);

        await connection.query(`
          INSERT INTO cleaned_campus_life (
            id, cleaned_college_id,
            dorm_style, has_air_conditioner, has_independent_bathroom, bathroom_distance, dorm_score,
            has_morning_self_study, has_evening_self_study, has_library, has_overnight_study_room, study_environment_score,
            canteen_price_level, canteen_quality_score, canteen_has_issues,
            has_subway, in_urban_area, to_city_time, transport_score,
            has_washing_machine, campus_wifi_quality, campus_wifi_speed,
            has_power_cutoff, power_cutoff_time, has_network_cutoff, network_cutoff_time, hot_water_time,
            has_morning_run, running_requirement, can_ride_ebike, ebike_charging_location,
            shared_bike_availability, shared_bike_types,
            supermarket_quality, supermarket_description, express_delivery_convenience, express_delivery_policy,
            dorm_curfew_time, school_gate_policy, check_dormitory, late_return_policy,
            holiday_duration, has_mini_semester, mini_semester_duration,
            can_order_takeout, takeout_pickup_distance, can_bring_computer,
            power_limit_description, campus_card_description, bank_card_issued,
            reliability, answer_count, data_quality_score, data_source,
            raw_source_ids, raw_answers, created_at, updated_at
          ) VALUES (${Array(59).fill('?').join(',')})
          ON DUPLICATE KEY UPDATE
            dorm_score = VALUES(dorm_score),
            updated_at = CURRENT_TIMESTAMP
        `, [
          cl.id, cl.college_id,
          cl.dorm_style, cl.has_air_conditioner, cl.has_independent_bathroom, cl.bathroom_distance, cl.dorm_score,
          cl.has_morning_self_study, cl.has_evening_self_study, cl.has_library, cl.has_overnight_study_room, cl.study_environment_score,
          cl.canteen_price_level, cl.canteen_quality_score, cl.canteen_has_issues,
          cl.has_subway, cl.in_urban_area, cl.to_city_time, cl.transport_score,
          cl.has_washing_machine, cl.campus_wifi_quality, cl.campus_wifi_speed,
          cl.has_power_cutoff, cl.power_cutoff_time, cl.has_network_cutoff, cl.network_cutoff_time, cl.hot_water_time,
          cl.has_morning_run, cl.running_requirement, cl.can_ride_ebike, cl.ebike_charging_location,
          cl.shared_bike_availability, cl.shared_bike_types,
          cl.supermarket_quality, cl.supermarket_description, cl.express_delivery_convenience, cl.express_delivery_policy,
          cl.dorm_curfew_time, cl.school_gate_policy, cl.check_dormitory, cl.late_return_policy,
          cl.holiday_duration, cl.has_mini_semester, cl.mini_semester_duration,
          cl.can_order_takeout, cl.takeout_pickup_distance, cl.can_bring_computer,
          cl.power_limit_description, cl.campus_card_description, cl.bank_card_issued,
          cl.reliability, cl.answer_count, dataQualityScore, cl.data_source,
          JSON.stringify([cl.id]), cl.raw_answers,
          cl.created_at, cl.updated_at
        ]);

        stats.success++;
      } catch (error: any) {
        log(`    ❌ 迁移失败: ${cl.college_name} - ${error.message}`, colors.red);
        stats.failed++;
      }
    }

    log(`  ✅ 校园生活迁移完成: ${stats.success}/${stats.total}`, colors.green);

  } catch (error: any) {
    log(`  ❌ 校园生活迁移失败: ${error.message}`, colors.red);
    throw error;
  }

  return stats;
}

/**
 * 验证迁移结果
 */
async function validateMigration(connection: mysql.Connection): Promise<void> {
  log('\n🔍 验证迁移结果...', colors.cyan);

  const checks = [
    { name: '院校数据', source: 'colleges', target: 'cleaned_colleges' },
    { name: '专业数据', source: 'majors', target: 'cleaned_majors' },
    { name: '院校名称映射', source: 'colleges', target: 'entity_college_name_mappings' },
    { name: '专业名称映射', source: 'majors', target: 'entity_major_name_mappings' },
    { name: '校园生活', source: 'college_campus_life', target: 'cleaned_campus_life' }
  ];

  for (const check of checks) {
    const [sourceCount]: any = await connection.query(`SELECT COUNT(*) as count FROM ${check.source}`);
    const [targetCount]: any = await connection.query(`SELECT COUNT(*) as count FROM ${check.target}`);

    const source = sourceCount[0].count;
    const target = targetCount[0].count;
    const percentage = source > 0 ? ((target / source) * 100).toFixed(1) : '0.0';

    if (target >= source * 0.95) {
      log(`  ✅ ${check.name}: ${target}/${source} (${percentage}%)`, colors.green);
    } else {
      log(`  ⚠️  ${check.name}: ${target}/${source} (${percentage}%)`, colors.yellow);
    }
  }

  // 检查数据质量
  const [qualityStats]: any = await connection.query(`
    SELECT
      AVG(data_quality_score) as avg_quality,
      MIN(data_quality_score) as min_quality,
      MAX(data_quality_score) as max_quality,
      COUNT(CASE WHEN data_quality_score >= 80 THEN 1 END) as high_quality,
      COUNT(CASE WHEN data_quality_score >= 50 AND data_quality_score < 80 THEN 1 END) as medium_quality,
      COUNT(CASE WHEN data_quality_score < 50 THEN 1 END) as low_quality
    FROM cleaned_colleges
  `);

  const quality = qualityStats[0];
  log(`\n  📊 数据质量分布:`, colors.blue);
  log(`    平均质量分: ${quality.avg_quality?.toFixed(1)}`, colors.blue);
  log(`    高质量(≥80分): ${quality.high_quality} 条`, colors.green);
  log(`    中等质量(50-80分): ${quality.medium_quality} 条`, colors.yellow);
  log(`    低质量(<50分): ${quality.low_quality} 条`, colors.red);
}

/**
 * 主函数
 */
async function main() {
  log('='.repeat(60), colors.cyan);
  log('     阶段2: 数据迁移到清洗层', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. 迁移院校
    await migrateColleges(connection);

    // 2. 迁移专业
    await migrateMajors(connection);

    // 3. 迁移录取分数
    await migrateAdmissionScores(connection);

    // 4. 迁移校园生活
    await migrateCampusLife(connection);

    // 5. 验证
    await validateMigration(connection);

    log('\n' + '='.repeat(60), colors.green);
    log('     ✅ 阶段2完成: 数据迁移成功!', colors.green);
    log('='.repeat(60), colors.green);

  } catch (error: any) {
    log('\n❌ 迁移失败!', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
