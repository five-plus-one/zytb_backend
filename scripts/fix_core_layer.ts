#!/usr/bin/env ts-node
/**
 * Core Layer数据完整性修复脚本
 *
 * 任务：
 * 1. 迁移enrollment_plans到core_enrollment_plans
 * 2. 补充core_admission_scores中缺失的专业名称
 * 3. 生成core_college_major_relations关联表
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

async function fixCoreLayer() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔧 开始修复Core Layer数据完整性\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // 任务1: 迁移招生计划到core_enrollment_plans
    console.log('1️⃣  迁移招生计划数据到 core_enrollment_plans...\n');

    const [plans]: any = await conn.query(`
      SELECT
        p.id,
        p.college_id,
        c.name as college_name,
        p.year,
        p.province,
        p.batch,
        p.subject_requirement,
        p.plan_count,
        p.tuition_fee,
        p.study_years,
        p.note
      FROM enrollment_plans p
      LEFT JOIN colleges c ON p.college_id = c.id
      ORDER BY p.id
    `);

    console.log(`   找到 ${plans.length} 条招生计划`);

    let migrated = 0;
    for (const plan of plans) {
      try {
        await conn.query(`
          INSERT INTO core_enrollment_plans (
            id, college_id, college_name, year, province, batch,
            subject_requirement, plan_count, tuition_fee, study_years,
            note, data_version, last_synced_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            college_name = VALUES(college_name),
            plan_count = VALUES(plan_count),
            last_synced_at = NOW(),
            data_version = data_version + 1
        `, [
          plan.id,
          plan.college_id,
          plan.college_name,
          plan.year,
          plan.province,
          plan.batch,
          plan.subject_requirement,
          plan.plan_count,
          plan.tuition_fee,
          plan.study_years,
          plan.note
        ]);

        migrated++;

        if (migrated % 1000 === 0) {
          console.log(`   已迁移: ${migrated}/${plans.length}`);
        }
      } catch (error: any) {
        console.error(`   ⚠️  迁移失败 [${plan.id}]: ${error.message}`);
      }
    }

    console.log(`\n   ✅ 招生计划迁移完成: ${migrated}/${plans.length}\n`);

    // 任务2: 补充core_admission_scores中缺失的专业名称
    console.log('2️⃣  补充录取分数表中缺失的专业名称...\n');

    await conn.query(`
      UPDATE core_admission_scores s
      INNER JOIN core_majors m ON s.major_id = m.id
      SET s.major_name = m.name
      WHERE s.major_name IS NULL OR s.major_name = ''
    `);

    const [updatedMajorNames]: any = await conn.query(`
      SELECT ROW_COUNT() as count
    `);

    console.log(`   ✅ 已补充 ${updatedMajorNames[0].count} 条专业名称\n`);

    // 任务3: 生成core_college_major_relations关联表
    console.log('3️⃣  生成院校-专业关联表...\n');

    // 从录取分数表中提取关联关系
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
      GROUP BY s.college_id, s.major_id
      ON DUPLICATE KEY UPDATE
        enrollment_province_count = VALUES(enrollment_province_count),
        avg_admission_score = VALUES(avg_admission_score),
        min_admission_score = VALUES(min_admission_score),
        max_admission_score = VALUES(max_admission_score),
        last_synced_at = NOW(),
        data_version = data_version + 1
    `);

    const [relationCount]: any = await conn.query(`
      SELECT COUNT(*) as count FROM core_college_major_relations
    `);

    console.log(`   ✅ 生成 ${relationCount[0].count} 条院校-专业关联\n`);

    // 任务4: 更新core_colleges中的专业数量统计
    console.log('4️⃣  更新院校表中的专业数量统计...\n');

    await conn.query(`
      UPDATE core_colleges c
      SET c.major_count = (
        SELECT COUNT(DISTINCT r.major_id)
        FROM core_college_major_relations r
        WHERE r.college_id = c.id
      )
    `);

    console.log(`   ✅ 专业数量统计更新完成\n`);

    console.log('=' + '='.repeat(80) + '\n');
    console.log('✅ Core Layer数据完整性修复完成!\n');

    // 最终统计
    console.log('📊 最终统计:\n');

    const [finalStats]: any = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM core_colleges) as colleges,
        (SELECT COUNT(*) FROM core_majors) as majors,
        (SELECT COUNT(*) FROM core_admission_scores) as admission_scores,
        (SELECT COUNT(*) FROM core_enrollment_plans) as enrollment_plans,
        (SELECT COUNT(*) FROM core_college_major_relations) as college_major_relations
    `);

    const stats = finalStats[0];
    console.log(`   院校数: ${stats.colleges.toLocaleString()}`);
    console.log(`   专业数: ${stats.majors.toLocaleString()}`);
    console.log(`   录取分数: ${stats.admission_scores.toLocaleString()}`);
    console.log(`   招生计划: ${stats.enrollment_plans.toLocaleString()}`);
    console.log(`   院校-专业关联: ${stats.college_major_relations.toLocaleString()}\n`);

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

fixCoreLayer().catch(console.error);
