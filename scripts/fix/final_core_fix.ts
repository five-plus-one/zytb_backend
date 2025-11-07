#!/usr/bin/env ts-node
/**
 * Core Layer 最终修复脚本 - 使用正确的字段名
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function finalFix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔧 Core Layer 最终修复开始\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    console.log('⚠️  注意: cleaned_admission_scores表没有major_name字段，无法匹配major_id\n');
    console.log('   将直接同步现有数据，major_id和major_name将为NULL\n');

    // Task 1: 重新同步录取分数，修复major_id和major_name
    console.log('1️⃣  重新同步录取分数数据（修复major_id和major_name）...\n');

    await conn.query('TRUNCATE TABLE core_admission_scores');
    console.log('   已清空core_admission_scores表');

    await conn.query(`
      INSERT INTO core_admission_scores (
        id, college_id, college_name, major_id, major_name,
        year, source_province, batch, subject_type,
        min_score, avg_score, max_score, min_rank,
        plan_count,
        data_version, last_synced_at
      )
      SELECT
        s.id,
        s.cleaned_college_id as college_id,
        c.name as college_name,
        s.cleaned_major_id as major_id,
        m.name as major_name,
        s.year,
        s.source_province,
        s.batch,
        s.subject_type,
        s.min_score,
        s.avg_score,
        s.max_score,
        s.min_rank,
        s.plan_count,
        1 as data_version,
        NOW() as last_synced_at
      FROM cleaned_admission_scores s
      LEFT JOIN core_colleges c ON s.cleaned_college_id = c.id
      LEFT JOIN core_majors m ON s.cleaned_major_id = m.id
    `);

    const [scoresCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_admission_scores');
    const [withMajorId]: any = await conn.query('SELECT COUNT(*) as count FROM core_admission_scores WHERE major_id IS NOT NULL');
    const [withMajorName]: any = await conn.query('SELECT COUNT(*) as count FROM core_admission_scores WHERE major_name IS NOT NULL AND major_name != ""');

    console.log(`   ✅ 已同步 ${scoresCount[0].count.toLocaleString()} 条录取分数`);
    console.log(`      - 有major_id: ${withMajorId[0].count.toLocaleString()} 条`);
    console.log(`      - 有major_name: ${withMajorName[0].count.toLocaleString()} 条\n`);

    // Task 2: 迁移招生计划
    console.log('2️⃣  迁移招生计划数据...\n');

    await conn.query(`
      INSERT INTO core_enrollment_plans (
        id, college_id, college_name, college_code,
        major_name, major_code,
        year, source_province, batch, subject_type,
        plan_count, tuition, study_years, major_remarks,
        data_version, last_synced_at, created_at
      )
      SELECT
        p.id,
        p.college_id,
        p.college_name,
        p.college_code,
        p.major_name,
        p.major_code,
        p.year,
        p.source_province,
        p.batch,
        p.subject_type,
        p.plan_count,
        p.tuition,
        p.study_years,
        p.major_remarks,
        1 as data_version,
        NOW() as last_synced_at,
        p.created_at
      FROM enrollment_plans p
      WHERE p.college_id IS NOT NULL
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
        latest_offered_year,
        province_count,
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
        MAX(s.year) as latest_offered_year,
        COUNT(DISTINCT s.source_province) as province_count,
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
        province_count = VALUES(province_count),
        latest_offered_year = VALUES(latest_offered_year),
        last_synced_at = NOW(),
        data_version = data_version + 1
    `);

    const [relationsCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_college_major_relations');
    console.log(`   ✅ 已生成 ${relationsCount[0].count.toLocaleString()} 条院校-专业关联\n`);

    // Task 4: 更新core_colleges统计信息
    console.log('4️⃣  更新院校统计信息...\n');

    await conn.query(`
      UPDATE core_colleges c
      SET c.major_count = (
        SELECT COUNT(DISTINCT r.major_id)
        FROM core_college_major_relations r
        WHERE r.college_id = c.id
      ),
      c.enrollment_province_count = (
        SELECT COUNT(DISTINCT s.source_province)
        FROM core_admission_scores s
        WHERE s.college_id = c.id
      )
    `);

    console.log('   ✅ 院校统计信息更新完成\n');

    console.log('=' + '='.repeat(80) + '\n');
    console.log('✅ Core Layer 修复完成!\n');

    // 最终统计
    console.log('📊 最终统计:\n');

    const [finalStats]: any = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM core_colleges) as colleges,
        (SELECT COUNT(*) FROM core_majors) as majors,
        (SELECT COUNT(*) FROM core_admission_scores) as admission_scores,
        (SELECT COUNT(*) FROM core_admission_scores WHERE major_id IS NOT NULL) as scores_with_major_id,
        (SELECT COUNT(*) FROM core_admission_scores WHERE major_name IS NOT NULL AND major_name != '') as scores_with_major_name,
        (SELECT COUNT(*) FROM core_enrollment_plans) as enrollment_plans,
        (SELECT COUNT(*) FROM core_college_major_relations) as college_major_relations
    `);

    const stats = finalStats[0];
    console.log(`   院校数: ${stats.colleges.toLocaleString()}`);
    console.log(`   专业数: ${stats.majors.toLocaleString()}`);
    console.log(`   录取分数: ${stats.admission_scores.toLocaleString()}`);
    console.log(`     - 有major_id: ${stats.scores_with_major_id.toLocaleString()}`);
    console.log(`     - 有major_name: ${stats.scores_with_major_name.toLocaleString()}`);
    console.log(`   招生计划: ${stats.enrollment_plans.toLocaleString()}`);
    console.log(`   院校-专业关联: ${stats.college_major_relations.toLocaleString()}\n`);

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

finalFix().catch(console.error);
