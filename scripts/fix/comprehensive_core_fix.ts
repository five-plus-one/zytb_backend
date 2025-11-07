#!/usr/bin/env ts-node
/**
 * Core Layer 完整修复脚本
 *
 * 1. 重新同步录取分数（修复major_id为NULL的问题）
 * 2. 迁移招生计划数据
 * 3. 生成院校-专业关联表
 * 4. 更新统计信息
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function comprehensiveFix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔧 Core Layer 完整修复开始\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // Task 1: 重新同步录取分数，修复major_id
    console.log('1️⃣  重新同步录取分数数据（修复major_id）...\n');

    // 先清空core_admission_scores
    await conn.query('TRUNCATE TABLE core_admission_scores');
    console.log('   已清空core_admission_scores表');

    // 从cleaned_admission_scores重新同步
    await conn.query(`
      INSERT INTO core_admission_scores (
        id, college_id, college_name, major_id, major_name,
        year, province, batch, subject_type,
        min_score, avg_score, max_score, min_rank,
        plan_count, admit_count, enrollment_rate,
        data_version, last_synced_at, sync_source
      )
      SELECT
        s.id,
        s.college_id,
        c.name as college_name,
        s.major_id,
        m.name as major_name,
        s.year,
        s.province,
        s.batch,
        s.subject_type,
        s.min_score,
        s.avg_score,
        s.max_score,
        s.min_rank,
        s.plan_count,
        s.admit_count,
        s.enrollment_rate,
        1 as data_version,
        NOW() as last_synced_at,
        'cleaned_admission_scores' as sync_source
      FROM cleaned_admission_scores s
      LEFT JOIN core_colleges c ON s.college_id = c.id
      LEFT JOIN core_majors m ON s.major_id = m.id
    `);

    const [scoresCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_admission_scores');
    console.log(`   ✅ 已同步 ${scoresCount[0].count.toLocaleString()} 条录取分数\n`);

    // Task 2: 迁移招生计划
    console.log('2️⃣  迁移招生计划数据...\n');

    await conn.query(`
      INSERT INTO core_enrollment_plans (
        id, college_id, college_name, major_id, major_name,
        year, province, batch, subject_requirement,
        plan_count, tuition_fee, study_years, note,
        data_version, last_synced_at, created_at
      )
      SELECT
        p.id,
        p.college_id,
        p.college_name,
        NULL as major_id,
        p.major_name,
        p.year,
        p.source_province as province,
        p.batch,
        p.subject_type as subject_requirement,
        p.plan_count,
        p.tuition_fee,
        p.study_years,
        p.note,
        1 as data_version,
        NOW() as last_synced_at,
        p.created_at
      FROM enrollment_plans p
      ON DUPLICATE KEY UPDATE
        college_name = VALUES(college_name),
        major_name = VALUES(major_name),
        plan_count = VALUES(plan_count),
        last_synced_at = NOW(),
        data_version = data_version + 1
    `);

    const [plansCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_enrollment_plans');
    console.log(`   ✅ 已迁移 ${plansCount[0].count.toLocaleString()} 条招生计划\n`);

    // Task 3: 生成院校-专业关联表
    console.log('3️⃣  生成院校-专业关联表...\n');

    await conn.query(`
      INSERT INTO core_college_major_relations (
        id,
        college_id,
        college_name,
        major_id,
        major_name,
        first_offered_year,
        is_key_major,
        is_characteristic_major,
        enrollment_province_count,
        avg_admission_score,
        min_admission_score,
        max_admission_score,
        data_version,
        last_synced_at,
        created_at
      )
      SELECT
        UUID() as id,
        s.college_id,
        s.college_name,
        s.major_id,
        s.major_name,
        MIN(s.year) as first_offered_year,
        0 as is_key_major,
        0 as is_characteristic_major,
        COUNT(DISTINCT s.province) as enrollment_province_count,
        ROUND(AVG(s.min_score)) as avg_admission_score,
        MIN(s.min_score) as min_admission_score,
        MAX(s.min_score) as max_admission_score,
        1 as data_version,
        NOW() as last_synced_at,
        NOW() as created_at
      FROM core_admission_scores s
      WHERE s.college_id IS NOT NULL
        AND s.major_id IS NOT NULL
        AND s.college_name IS NOT NULL
        AND s.major_name IS NOT NULL
      GROUP BY s.college_id, s.major_id, s.college_name, s.major_name
      ON DUPLICATE KEY UPDATE
        enrollment_province_count = VALUES(enrollment_province_count),
        avg_admission_score = VALUES(avg_admission_score),
        min_admission_score = VALUES(min_admission_score),
        max_admission_score = VALUES(max_admission_score),
        last_synced_at = NOW(),
        data_version = data_version + 1
    `);

    const [relationsCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_college_major_relations');
    console.log(`   ✅ 已生成 ${relationsCount[0].count.toLocaleString()} 条院校-专业关联\n`);

    // Task 4: 更新core_colleges中的专业数量统计
    console.log('4️⃣  更新院校专业数量统计...\n');

    await conn.query(`
      UPDATE core_colleges c
      SET c.major_count = (
        SELECT COUNT(DISTINCT r.major_id)
        FROM core_college_major_relations r
        WHERE r.college_id = c.id
      )
    `);

    console.log('   ✅ 专业数量统计更新完成\n');

    // Task 5: 更新招生省份数量统计
    console.log('5️⃣  更新院校招生省份统计...\n');

    await conn.query(`
      UPDATE core_colleges c
      SET c.enrollment_province_count = (
        SELECT COUNT(DISTINCT s.province)
        FROM core_admission_scores s
        WHERE s.college_id = c.id
      )
    `);

    console.log('   ✅ 招生省份统计更新完成\n');

    console.log('=' + '='.repeat(80) + '\n');
    console.log('✅ Core Layer 完整修复完成!\n');

    // 最终统计
    console.log('📊 最终统计:\n');

    const [finalStats]: any = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM core_colleges) as colleges,
        (SELECT COUNT(*) FROM core_majors) as majors,
        (SELECT COUNT(*) FROM core_admission_scores) as admission_scores,
        (SELECT COUNT(*) FROM core_enrollment_plans) as enrollment_plans,
        (SELECT COUNT(*) FROM core_college_major_relations) as college_major_relations,
        (SELECT COUNT(*) FROM core_admission_scores WHERE major_id IS NULL) as scores_without_major_id,
        (SELECT COUNT(*) FROM core_admission_scores WHERE major_name IS NULL OR major_name = '') as scores_without_major_name
    `);

    const stats = finalStats[0];
    console.log(`   院校数: ${stats.colleges.toLocaleString()}`);
    console.log(`   专业数: ${stats.majors.toLocaleString()}`);
    console.log(`   录取分数: ${stats.admission_scores.toLocaleString()}`);
    console.log(`     - major_id为NULL: ${stats.scores_without_major_id.toLocaleString()}`);
    console.log(`     - major_name为空: ${stats.scores_without_major_name.toLocaleString()}`);
    console.log(`   招生计划: ${stats.enrollment_plans.toLocaleString()}`);
    console.log(`   院校-专业关联: ${stats.college_major_relations.toLocaleString()}\n`);

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

comprehensiveFix().catch(console.error);
