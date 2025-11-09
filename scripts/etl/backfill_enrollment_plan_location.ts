#!/usr/bin/env ts-node
/**
 * 回填 core_enrollment_plans 表的院校省份和城市信息
 */
import { AppDataSource } from '../../src/config/database';

async function backfillCollegeLocation() {
  console.log('\n🔄 === 回填院校地理位置信息 ===\n');

  await AppDataSource.initialize();

  // 1. 从 core_colleges 表回填
  console.log('1️⃣ 从 core_colleges 表回填 college_province 和 college_city...');

  const result1 = await AppDataSource.query(`
    UPDATE core_enrollment_plans ep
    INNER JOIN core_colleges cc ON ep.college_id = cc.id
    SET
      ep.college_province = cc.province,
      ep.college_city = cc.city
    WHERE ep.college_province IS NULL OR ep.college_city IS NULL
  `);

  console.log(`   ✅ 更新了 ${result1.affectedRows} 条记录`);

  // 2. 对于仍然为NULL的，尝试从 colleges 表回填
  console.log('\n2️⃣ 从 colleges 表回填剩余的NULL记录...');

  const result2 = await AppDataSource.query(`
    UPDATE core_enrollment_plans ep
    INNER JOIN colleges c ON ep.college_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET
      ep.college_province = c.province,
      ep.college_city = c.city
    WHERE ep.college_province IS NULL OR ep.college_city IS NULL
  `);

  console.log(`   ✅ 更新了 ${result2.affectedRows} 条记录`);

  // 3. 检查回填结果
  console.log('\n3️⃣ 检查回填结果...');

  const stats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN college_province IS NOT NULL THEN 1 ELSE 0 END) as has_province,
      SUM(CASE WHEN college_city IS NOT NULL THEN 1 ELSE 0 END) as has_city
    FROM core_enrollment_plans
  `);

  const stat = stats[0];
  console.log(`   总记录数: ${stat.total}`);
  console.log(`   有省份信息: ${stat.has_province} (${(stat.has_province/stat.total*100).toFixed(1)}%)`);
  console.log(`   有城市信息: ${stat.has_city} (${(stat.has_city/stat.total*100).toFixed(1)}%)`);

  // 4. 验证江苏+自动化的数据
  console.log('\n4️⃣ 验证江苏物理类+自动化专业的数据...');

  const jiangzheAuto = await AppDataSource.query(`
    SELECT COUNT(*) as cnt
    FROM core_enrollment_plans
    WHERE source_province = '江苏'
      AND subject_type LIKE '%physics%'
      AND (college_province = '江苏' OR college_province = '浙江')
      AND (major_name LIKE '%自动化%' OR major_group_name LIKE '%自动化%')
      AND year >= 2024
  `);

  console.log(`   江苏/浙江+自动化专业的招生计划: ${jiangzheAuto[0].cnt} 条`);

  await AppDataSource.destroy();

  console.log('\n✅ 回填完成!\n');
}

backfillCollegeLocation().catch(console.error);
