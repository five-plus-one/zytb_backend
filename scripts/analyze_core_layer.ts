#!/usr/bin/env ts-node
/**
 * Core Layer数据完整性检查和修复方案
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

async function analyzeAndFix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔍 Core Layer数据完整性分析\n');
  console.log('=' + '='.repeat(80) + '\n');

  // 1. 检查校园生活数据
  console.log('1️⃣  检查校园生活数据迁移需求\n');

  const [cleanedCampusLife]: any = await conn.query(`
    SELECT COUNT(*) as count FROM cleaned_campus_life
  `);
  console.log(`   cleaned_campus_life: ${cleanedCampusLife[0].count} 条`);

  const [coreCampusLife]: any = await conn.query(`
    SELECT COUNT(*) as count FROM core_campus_life
  `);
  console.log(`   core_campus_life: ${coreCampusLife[0].count} 条`);
  console.log(`   🔄 需要迁移: ${cleanedCampusLife[0].count - coreCampusLife[0].count} 条\n`);

  // 2. 检查招生计划数据
  console.log('2️⃣  检查招生计划数据\n');

  const [enrollmentPlans]: any = await conn.query(`
    SELECT COUNT(*) as count FROM enrollment_plans
  `);
  console.log(`   enrollment_plans (旧表): ${enrollmentPlans[0].count} 条`);

  const [coreEnrollmentPlans]: any = await conn.query(`
    SELECT COUNT(*) as count FROM core_enrollment_plans
  `);
  console.log(`   core_enrollment_plans: ${coreEnrollmentPlans[0].count} 条`);
  console.log(`   🔄 需要迁移: ${enrollmentPlans[0].count - coreEnrollmentPlans[0].count} 条\n`);

  // 3. 检查院校-专业关联
  console.log('3️⃣  检查院校-专业关联关系\n');

  const [collegeMajorRelations]: any = await conn.query(`
    SELECT COUNT(*) as count FROM core_college_major_relations
  `);
  console.log(`   core_college_major_relations: ${collegeMajorRelations[0].count} 条`);

  // 从录取分数中推断关联关系
  const [admissionRelations]: any = await conn.query(`
    SELECT COUNT(DISTINCT CONCAT(college_id, '-', major_id)) as count
    FROM core_admission_scores
    WHERE college_id IS NOT NULL AND major_id IS NOT NULL
  `);
  console.log(`   从录取分数推断的关联: ${admissionRelations[0].count} 条`);
  console.log(`   🔄 需要生成关联: ${admissionRelations[0].count - collegeMajorRelations[0].count} 条\n`);

  // 4. 检查数据关联完整性
  console.log('4️⃣  检查Core Layer表之间的关联完整性\n');

  // 检查admission_scores中的college_id是否都存在于core_colleges
  const [orphanColleges]: any = await conn.query(`
    SELECT COUNT(DISTINCT s.college_id) as count
    FROM core_admission_scores s
    LEFT JOIN core_colleges c ON s.college_id = c.id
    WHERE s.college_id IS NOT NULL AND c.id IS NULL
  `);
  console.log(`   孤立的院校ID (在分数表但不在院校表): ${orphanColleges[0].count}`);

  // 检查admission_scores中的major_id是否都存在于core_majors
  const [orphanMajors]: any = await conn.query(`
    SELECT COUNT(DISTINCT s.major_id) as count
    FROM core_admission_scores s
    LEFT JOIN core_majors m ON s.major_id = m.id
    WHERE s.major_id IS NOT NULL AND m.id IS NULL
  `);
  console.log(`   孤立的专业ID (在分数表但不在专业表): ${orphanMajors[0].count}\n`);

  // 5. 检查冗余字段的完整性
  console.log('5️⃣  检查冗余字段的数据完整性\n');

  const [missingCollegeNames]: any = await conn.query(`
    SELECT COUNT(*) as count
    FROM core_admission_scores
    WHERE college_name IS NULL OR college_name = ''
  `);
  console.log(`   录取分数表中缺失院校名称: ${missingCollegeNames[0].count}`);

  const [missingMajorNames]: any = await conn.query(`
    SELECT COUNT(*) as count
    FROM core_admission_scores
    WHERE major_name IS NULL OR major_name = ''
  `);
  console.log(`   录取分数表中缺失专业名称: ${missingMajorNames[0].count}`);

  const [missingCampusLifeInColleges]: any = await conn.query(`
    SELECT COUNT(*) as count
    FROM core_colleges
    WHERE dorm_score IS NULL AND canteen_score IS NULL
  `);
  console.log(`   院校表中缺失校园生活数据: ${missingCampusLifeInColleges[0].count}\n`);

  console.log('=' + '='.repeat(80) + '\n');
  console.log('📋 修复建议:\n');

  console.log('1. 迁移校园生活数据到core_campus_life');
  console.log('2. 迁移招生计划数据到core_enrollment_plans');
  console.log('3. 生成core_college_major_relations关联表');
  console.log('4. 修复孤立的ID引用');
  console.log('5. 补充冗余字段的缺失数据\n');

  await conn.end();
}

analyzeAndFix().catch(console.error);
