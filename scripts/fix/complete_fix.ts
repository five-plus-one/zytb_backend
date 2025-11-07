#!/usr/bin/env ts-node
/**
 * 完整修复脚本 - 修复Cleaned层和Core层的所有问题
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function completeFixall() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔧 完整数据修复开始\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // ========================================
    // Step 1: 在cleaned_admission_scores表中添加major_name和major_code字段
    // ========================================
    console.log('1️⃣  在cleaned_admission_scores表中添加major字段...\n');

    const [cols]: any = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cleaned_admission_scores'
        AND COLUMN_NAME IN ('major_name', 'major_code')
    `);

    const hasMajorName = cols.some((c: any) => c.COLUMN_NAME === 'major_name');
    const hasMajorCode = cols.some((c: any) => c.COLUMN_NAME === 'major_code');

    if (!hasMajorName) {
      await conn.query(`
        ALTER TABLE cleaned_admission_scores
        ADD COLUMN major_name VARCHAR(100) AFTER cleaned_major_id
      `);
      console.log('   ✅ 已添加major_name字段');
    } else {
      console.log('   ℹ️  major_name字段已存在');
    }

    if (!hasMajorCode) {
      await conn.query(`
        ALTER TABLE cleaned_admission_scores
        ADD COLUMN major_code VARCHAR(20) AFTER major_name
      `);
      console.log('   ✅ 已添加major_code字段\n');
    } else {
      console.log('   ℹ️  major_code字段已存在\n');
    }

    // ========================================
    // Step 2: 从admission_scores表迁移major_name到cleaned_admission_scores
    // ========================================
    console.log('2️⃣  从旧表迁移major_name数据...\n');

    // 通过院校名称、年份、省份、批次匹配
    const [updated1]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN admission_scores a ON
        a.college_name COLLATE utf8mb4_unicode_ci = (SELECT name FROM core_colleges WHERE id = c.cleaned_college_id)
        AND a.year = c.year
        AND a.province COLLATE utf8mb4_unicode_ci = c.source_province
        AND COALESCE(a.batch, '') COLLATE utf8mb4_unicode_ci = COALESCE(c.batch, '')
        AND a.subject_type COLLATE utf8mb4_unicode_ci = c.subject_type
      SET
        c.major_name = a.major_name,
        c.major_code = NULL
      WHERE c.major_name IS NULL
    `);

    console.log(`   ✅ 通过精确匹配更新了 ${updated1.affectedRows} 条记录\n`);

    // ========================================
    // Step 3: 通过major_name匹配cleaned_majors表获取major_id
    // ========================================
    console.log('3️⃣  匹配major_id...\n');

    // 精确匹配
    const [updated2]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN cleaned_majors m ON c.major_name = m.standard_name
      SET c.cleaned_major_id = m.id
      WHERE c.cleaned_major_id IS NULL
        AND c.major_name IS NOT NULL
    `);
    console.log(`   ✅ 精确匹配: ${updated2.affectedRows} 条`);

    // 模糊匹配 - 去除括号内容后匹配
    const [updated3]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN cleaned_majors m ON
        TRIM(SUBSTRING_INDEX(c.major_name, '（', 1)) = m.standard_name
        OR TRIM(SUBSTRING_INDEX(c.major_name, '(', 1)) = m.standard_name
      SET c.cleaned_major_id = m.id
      WHERE c.cleaned_major_id IS NULL
        AND c.major_name IS NOT NULL
    `);
    console.log(`   ✅ 模糊匹配（去括号）: ${updated3.affectedRows} 条\n`);

    const [matchStats]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(cleaned_major_id) as with_id,
        COUNT(major_name) as with_name
      FROM cleaned_admission_scores
    `);

    console.log(`   📊 匹配结果:`);
    console.log(`      总记录: ${matchStats[0].total.toLocaleString()}`);
    console.log(`      有major_name: ${matchStats[0].with_name.toLocaleString()} (${Math.round(matchStats[0].with_name * 100 / matchStats[0].total)}%)`);
    console.log(`      有major_id: ${matchStats[0].with_id.toLocaleString()} (${Math.round(matchStats[0].with_id * 100 / matchStats[0].total)}%)\n`);

    // ========================================
    // Step 4: 修复enrollment_plans的college_id
    // ========================================
    console.log('4️⃣  修复enrollment_plans的college_id...\n');

    const [updated4]: any = await conn.query(`
      UPDATE enrollment_plans ep
      INNER JOIN core_colleges c ON ep.college_name COLLATE utf8mb4_unicode_ci = c.name
      SET ep.college_id = c.id
      WHERE ep.college_id IS NULL
    `);

    console.log(`   ✅ 更新了 ${updated4.affectedRows} 条记录\n`);

    const [planStats]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_id) as with_id
      FROM enrollment_plans
    `);

    console.log(`   📊 结果: ${planStats[0].with_id.toLocaleString()}/${planStats[0].total.toLocaleString()} 有college_id\n`);

    // ========================================
    // Step 5: 重新同步到Core层
    // ========================================
    console.log('5️⃣  重新同步数据到Core层...\n');

    // 5.1 同步录取分数
    console.log('   5.1 同步录取分数...');
    await conn.query('TRUNCATE TABLE core_admission_scores');

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
        s.major_name,
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
    `);

    const [coreScores]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(major_id) as with_id,
        COUNT(major_name) as with_name
      FROM core_admission_scores
    `);

    console.log(`       ✅ ${coreScores[0].total.toLocaleString()} 条 (major_id: ${coreScores[0].with_id.toLocaleString()}, major_name: ${coreScores[0].with_name.toLocaleString()})`);

    // 5.2 同步招生计划
    console.log('   5.2 同步招生计划...');

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

    const [corePlans]: any = await conn.query('SELECT COUNT(*) as count FROM core_enrollment_plans');
    console.log(`       ✅ ${corePlans[0].count.toLocaleString()} 条\n`);

    // ========================================
    // Step 6: 生成院校-专业关联表
    // ========================================
    console.log('6️⃣  生成院校-专业关联表...\n');

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

    const [relations]: any = await conn.query('SELECT COUNT(*) as count FROM core_college_major_relations');
    console.log(`   ✅ 生成 ${relations[0].count.toLocaleString()} 条关联\n`);

    // ========================================
    // Step 7: 更新统计信息
    // ========================================
    console.log('7️⃣  更新院校统计信息...\n');

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

    console.log('   ✅ 统计信息更新完成\n');

    // ========================================
    // 最终报告
    // ========================================
    console.log('=' + '='.repeat(80) + '\n');
    console.log('✅ 所有修复完成!\n');

    console.log('📊 最终统计:\n');

    const [finalStats]: any = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM core_colleges) as colleges,
        (SELECT COUNT(*) FROM core_majors) as majors,
        (SELECT COUNT(*) FROM core_admission_scores) as admission_scores,
        (SELECT COUNT(*) FROM core_admission_scores WHERE major_id IS NOT NULL) as scores_with_major_id,
        (SELECT COUNT(*) FROM core_admission_scores WHERE major_name IS NOT NULL AND major_name != '') as scores_with_major_name,
        (SELECT COUNT(*) FROM core_enrollment_plans) as enrollment_plans,
        (SELECT COUNT(*) FROM core_college_major_relations) as college_major_relations,
        (SELECT COUNT(*) FROM core_campus_life) as campus_life
    `);

    const stats = finalStats[0];
    console.log(`   院校数: ${stats.colleges.toLocaleString()}`);
    console.log(`   专业数: ${stats.majors.toLocaleString()}`);
    console.log(`   录取分数: ${stats.admission_scores.toLocaleString()}`);
    console.log(`     - 有major_id: ${stats.scores_with_major_id.toLocaleString()} (${Math.round(stats.scores_with_major_id * 100 / stats.admission_scores)}%)`);
    console.log(`     - 有major_name: ${stats.scores_with_major_name.toLocaleString()} (${Math.round(stats.scores_with_major_name * 100 / stats.admission_scores)}%)`);
    console.log(`   招生计划: ${stats.enrollment_plans.toLocaleString()}`);
    console.log(`   院校-专业关联: ${stats.college_major_relations.toLocaleString()}`);
    console.log(`   校园生活: ${stats.campus_life.toLocaleString()}\n`);

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

completeFixall().catch(console.error);
