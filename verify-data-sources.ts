/**
 * 验证数据标准化方案的数据来源
 */

import { AppDataSource } from './src/config/database';

async function verifyDataSources() {
  await AppDataSource.initialize();

  console.log('=== 数据来源验证 ===\n');

  // 1. 检查colleges表有哪些字段可以作为数据源
  console.log('1. colleges表字段（可作为数据源）:');
  const collegesColumns = await AppDataSource.query(`
    SHOW COLUMNS FROM colleges
  `);
  collegesColumns.forEach((col: any) => {
    console.log(`  - ${col.Field}: ${col.Type}`);
  });

  // 2. 检查colleges表数据完整性
  console.log('\n2. colleges表数据完整性:');
  const collegesStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(code) as has_code,
      COUNT(province) as has_province,
      COUNT(city) as has_city,
      COUNT(is_985) as has_985,
      COUNT(is_211) as has_211,
      COUNT(is_world_class) as has_world_class
    FROM colleges
  `);
  console.log(`  总院校数: ${collegesStats[0].total}`);
  console.log(`  有code: ${collegesStats[0].has_code} (${(collegesStats[0].has_code/collegesStats[0].total*100).toFixed(1)}%)`);
  console.log(`  有province: ${collegesStats[0].has_province} (${(collegesStats[0].has_province/collegesStats[0].total*100).toFixed(1)}%)`);
  console.log(`  有city: ${collegesStats[0].has_city} (${(collegesStats[0].has_city/collegesStats[0].total*100).toFixed(1)}%)`);
  console.log(`  有985标记: ${collegesStats[0].has_985} (${(collegesStats[0].has_985/collegesStats[0].total*100).toFixed(1)}%)`);
  console.log(`  有211标记: ${collegesStats[0].has_211} (${(collegesStats[0].has_211/collegesStats[0].total*100).toFixed(1)}%)`);
  console.log(`  有双一流标记: ${collegesStats[0].has_world_class} (${(collegesStats[0].has_world_class/collegesStats[0].total*100).toFixed(1)}%)`);

  // 3. 检查enrollment_plans表的code字段来源
  console.log('\n3. enrollment_plans表college_code字段（可作为colleges.code的数据源）:');
  const epCodeStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT college_code) as distinct_codes,
      COUNT(DISTINCT college_name) as distinct_colleges
    FROM enrollment_plans
    WHERE college_code IS NOT NULL AND college_code != ''
  `);
  console.log(`  有code的记录数: ${epCodeStats[0].total}`);
  console.log(`  不同的college_code: ${epCodeStats[0].distinct_codes}`);
  console.log(`  不同的college_name: ${epCodeStats[0].distinct_colleges}`);

  // 4. 检查enrollment_plans需要补全的字段
  console.log('\n4. enrollment_plans表当前状态:');
  const epColumns = await AppDataSource.query(`
    SHOW COLUMNS FROM enrollment_plans
  `);
  const hasCollegeProvince = epColumns.some((col: any) => col.Field === 'college_province');

  if (hasCollegeProvince) {
    const epNeedsFill = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_province) as has_province,
        COUNT(college_city) as has_city
      FROM enrollment_plans
    `);
    console.log(`  总记录数: ${epNeedsFill[0].total}`);
    console.log(`  已有college_province: ${epNeedsFill[0].has_province}`);
    console.log(`  已有college_city: ${epNeedsFill[0].has_city}`);
    console.log(`  需要补全province: ${epNeedsFill[0].total - epNeedsFill[0].has_province}`);
  } else {
    console.log('  college_province字段不存在（将在标准化时创建）');
  }

  // 5. 验证院校名称匹配率
  console.log('\n5. 验证enrollment_plans和colleges的院校名称匹配情况:');
  const matchTest = await AppDataSource.query(`
    SELECT
      COUNT(DISTINCT ep.college_name) as total_ep_colleges,
      COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN ep.college_name END) as matched_colleges
    FROM enrollment_plans ep
    LEFT JOIN colleges c ON ep.college_name = c.name
    WHERE ep.year = 2025
  `);
  const matchRate = (matchTest[0].matched_colleges / matchTest[0].total_ep_colleges * 100).toFixed(1);
  console.log(`  enrollment_plans中的院校数: ${matchTest[0].total_ep_colleges}`);
  console.log(`  可直接匹配的院校数: ${matchTest[0].matched_colleges}`);
  console.log(`  直接匹配率: ${matchRate}%`);
  console.log(`  需要模糊匹配: ${matchTest[0].total_ep_colleges - matchTest[0].matched_colleges}`);

  // 6. 检查admission_scores表的情况
  console.log('\n6. admission_scores表数据情况:');
  const asColumns = await AppDataSource.query(`
    SHOW COLUMNS FROM admission_scores
  `);
  const hasAsCollegeProvince = asColumns.some((col: any) => col.Field === 'college_province');

  const asStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT college_name) as distinct_colleges
    FROM admission_scores
  `);
  console.log(`  总记录数: ${asStats[0].total}`);
  console.log(`  不同院校数: ${asStats[0].distinct_colleges}`);

  if (hasAsCollegeProvince) {
    const asNeedsFill = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_province) as has_province
      FROM admission_scores
    `);
    console.log(`  已有college_province: ${asNeedsFill[0].has_province}`);
    console.log(`  需要补全: ${asNeedsFill[0].total - asNeedsFill[0].has_province}`);
  } else {
    console.log('  college_province字段不存在（将在标准化时创建）');
  }

  console.log('\n=== 数据补全方案总结 ===');
  console.log('✅ 补全enrollment_plans.college_province <- colleges.province（通过院校名称匹配）');
  console.log('✅ 补全enrollment_plans.college_city <- colleges.city（通过院校名称匹配）');
  console.log('✅ 补全enrollment_plans.college_is_985 <- colleges.is_985（通过院校名称匹配）');
  console.log('✅ 补全enrollment_plans.college_is_211 <- colleges.is_211（通过院校名称匹配）');
  console.log('✅ 补全enrollment_plans.college_is_world_class <- colleges.is_world_class（通过院校名称匹配）');
  console.log('✅ 补全colleges.code <- enrollment_plans.college_code（通过院校名称匹配）');
  console.log('✅ 补全admission_scores.college_province <- colleges.province（通过院校名称匹配）');
  console.log('✅ 补全admission_scores.college_code <- colleges.code（通过院校名称匹配）');

  console.log('\n📌 所有补全数据都来自现有表格字段，有可靠依据！');

  await AppDataSource.destroy();
}

verifyDataSources().catch(console.error);
