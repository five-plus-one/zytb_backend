/**
 * 数据补全脚本
 * 从 enrollment_plans 补全 admission_scores 的 college_code 和 group_code
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'volunteer_system'
};

async function fillMissingData() {
  let connection;

  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功\n');

    // ===== 第一步：检查当前数据完整性 =====
    console.log('📊 第一步：检查当前数据完整性...');

    const [beforeStats]: any = await connection.execute(`
      SELECT
        COUNT(*) AS total_records,
        COUNT(college_code) AS has_college_code,
        COUNT(group_code) AS has_group_code,
        COUNT(CASE WHEN college_code IS NOT NULL AND group_code IS NOT NULL THEN 1 END) AS has_both
      FROM admission_scores
    `);

    const before = beforeStats[0];
    console.log(`   总记录数: ${before.total_records}`);
    console.log(`   已有 college_code: ${before.has_college_code} (${Math.round(before.has_college_code / before.total_records * 100)}%)`);
    console.log(`   已有 group_code: ${before.has_group_code} (${Math.round(before.has_group_code / before.total_records * 100)}%)`);
    console.log(`   两者都有: ${before.has_both} (${Math.round(before.has_both / before.total_records * 100)}%)`);

    // ===== 第二步：补全 college_code（通过 collegeName 匹配）=====
    console.log('\n🔧 第二步：补全 college_code...');

    const [updateCollegeCode]: any = await connection.execute(`
      UPDATE admission_scores AS a
      INNER JOIN (
        SELECT DISTINCT college_code, college_name
        FROM enrollment_plans
        WHERE college_code IS NOT NULL
      ) AS ep
        ON a.college_name = ep.college_name
      SET a.college_code = ep.college_code
      WHERE a.college_code IS NULL
    `);

    console.log(`   ✓ 更新了 ${updateCollegeCode.affectedRows} 条记录的 college_code`);

    // ===== 第三步：补全 group_code 和 group_name =====
    console.log('\n🔧 第三步：补全 group_code 和 group_name...');

    // 方法1: 通过 college_name + major_name 匹配
    const [updateByMajor]: any = await connection.execute(`
      UPDATE admission_scores AS a
      INNER JOIN (
        SELECT DISTINCT
          college_name,
          major_name,
          major_group_code,
          major_group_name,
          source_province,
          subject_type
        FROM enrollment_plans
        WHERE major_group_code IS NOT NULL
          AND year = 2025
      ) AS ep
        ON a.college_name = ep.college_name
        AND a.major_name = ep.major_name
        AND a.source_province = ep.source_province
        AND a.subject_type = ep.subject_type
      SET
        a.group_code = ep.major_group_code,
        a.group_name = ep.major_group_name
      WHERE a.group_code IS NULL
    `);

    console.log(`   ✓ 通过专业名称匹配更新了 ${updateByMajor.affectedRows} 条记录`);

    // 方法2: 如果专业组为空，尝试使用 major_group 字段
    const [updateFromMajorGroup]: any = await connection.execute(`
      UPDATE admission_scores
      SET
        group_code = COALESCE(group_code, major_group),
        group_name = COALESCE(group_name, major_group)
      WHERE group_code IS NULL AND major_group IS NOT NULL
    `);

    console.log(`   ✓ 从 major_group 字段补全了 ${updateFromMajorGroup.affectedRows} 条记录`);

    // ===== 第四步：对于仍然缺失的，使用默认值 =====
    console.log('\n🔧 第四步：为剩余记录设置默认值...');

    const [setDefault]: any = await connection.execute(`
      UPDATE admission_scores
      SET
        group_code = CONCAT(college_code, '_default'),
        group_name = '普通类'
      WHERE group_code IS NULL
        AND college_code IS NOT NULL
    `);

    console.log(`   ✓ 为 ${setDefault.affectedRows} 条记录设置了默认 group_code`);

    // ===== 第五步：检查补全后的数据完整性 =====
    console.log('\n📊 第五步：检查补全后的数据完整性...');

    const [afterStats]: any = await connection.execute(`
      SELECT
        COUNT(*) AS total_records,
        COUNT(college_code) AS has_college_code,
        COUNT(group_code) AS has_group_code,
        COUNT(CASE WHEN college_code IS NOT NULL AND group_code IS NOT NULL THEN 1 END) AS has_both
      FROM admission_scores
    `);

    const after = afterStats[0];
    console.log(`   总记录数: ${after.total_records}`);
    console.log(`   已有 college_code: ${after.has_college_code} (${Math.round(after.has_college_code / after.total_records * 100)}%)`);
    console.log(`   已有 group_code: ${after.has_group_code} (${Math.round(after.has_group_code / after.total_records * 100)}%)`);
    console.log(`   两者都有: ${after.has_both} (${Math.round(after.has_both / after.total_records * 100)}%)`);

    console.log('\n📈 数据补全对比:');
    console.log(`   college_code: ${before.has_college_code} → ${after.has_college_code} (+${after.has_college_code - before.has_college_code})`);
    console.log(`   group_code: ${before.has_group_code} → ${after.has_group_code} (+${after.has_group_code - before.has_group_code})`);
    console.log(`   两者都有: ${before.has_both} → ${after.has_both} (+${after.has_both - before.has_both})`);

    // ===== 第六步：查看示例数据 =====
    console.log('\n📋 第六步：查看示例数据...');

    const [samples]: any = await connection.execute(`
      SELECT
        college_name,
        major_name,
        college_code,
        group_code,
        group_name,
        year,
        min_score,
        min_rank
      FROM admission_scores
      WHERE year >= 2023
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND college_code IS NOT NULL
        AND group_code IS NOT NULL
      ORDER BY year DESC, min_score DESC
      LIMIT 10
    `);

    console.log(`   查询到 ${samples.length} 条示例数据:`);
    samples.forEach((sample: any, index: number) => {
      console.log(`   ${index + 1}. ${sample.college_name} - ${sample.group_name}`);
      console.log(`      专业: ${sample.major_name}`);
      console.log(`      年份: ${sample.year}, 分数: ${sample.min_score}, 位次: ${sample.min_rank}`);
      console.log(`      college_code: ${sample.college_code}, group_code: ${sample.group_code}`);
    });

    // ===== 第七步：检查是否有计算机专业数据 =====
    console.log('\n🔍 第七步：检查计算机专业数据...');

    const [computerMajors]: any = await connection.execute(`
      SELECT
        college_name,
        major_name,
        group_name,
        college_code,
        group_code,
        year,
        min_score
      FROM admission_scores
      WHERE (major_name LIKE '%计算机%' OR major_name LIKE '%软件%')
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND year >= 2023
        AND college_code IS NOT NULL
        AND group_code IS NOT NULL
      ORDER BY year DESC, min_score DESC
      LIMIT 10
    `);

    console.log(`   找到 ${computerMajors.length} 条计算机相关专业数据:`);
    computerMajors.forEach((major: any, index: number) => {
      console.log(`   ${index + 1}. ${major.college_name} - ${major.major_name} (${major.year}年: ${major.min_score}分)`);
      console.log(`      group_code: ${major.group_code}, group_name: ${major.group_name}`);
    });

    console.log('\n✅ 数据补全完成！');

  } catch (error) {
    console.error('\n❌ 数据补全失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

fillMissingData();
