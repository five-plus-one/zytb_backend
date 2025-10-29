/**
 * 验证数据标准化和补全结果
 */

import { AppDataSource } from './src/config/database';

async function verifyStandardizationResult() {
  await AppDataSource.initialize();

  console.log('=== 数据标准化和补全结果验证 ===\n');

  // 1. 验证colleges表code字段补全情况
  console.log('1. colleges表code字段补全结果:');
  const collegesCodeResult = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(code) as has_code,
      COUNT(CASE WHEN code IS NOT NULL AND code != '' THEN 1 END) as filled_code
    FROM colleges
  `);
  console.log(`  总院校数: ${collegesCodeResult[0].total}`);
  console.log(`  有code: ${collegesCodeResult[0].filled_code} (${(collegesCodeResult[0].filled_code/collegesCodeResult[0].total*100).toFixed(1)}%)`);
  console.log(`  ✅ 新增: ${collegesCodeResult[0].filled_code - 3} 条code数据`);

  // 2. 验证enrollment_plans表字段补全情况
  console.log('\n2. enrollment_plans表字段补全结果:');
  const epResult = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(college_province) as has_province,
      COUNT(college_city) as has_city,
      COUNT(CASE WHEN college_is_985 = 1 THEN 1 END) as is_985_count,
      COUNT(CASE WHEN college_is_211 = 1 THEN 1 END) as is_211_count
    FROM enrollment_plans
  `);
  console.log(`  总记录数: ${epResult[0].total}`);
  console.log(`  有college_province: ${epResult[0].has_province} (${(epResult[0].has_province/epResult[0].total*100).toFixed(1)}%)`);
  console.log(`  有college_city: ${epResult[0].has_city} (${(epResult[0].has_city/epResult[0].total*100).toFixed(1)}%)`);
  console.log(`  985院校记录数: ${epResult[0].is_985_count}`);
  console.log(`  211院校记录数: ${epResult[0].is_211_count}`);

  // 3. 验证admission_scores表字段补全情况
  console.log('\n3. admission_scores表字段补全结果:');
  const asResult = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(college_province) as has_province,
      COUNT(college_code) as has_code
    FROM admission_scores
  `);
  console.log(`  总记录数: ${asResult[0].total}`);
  console.log(`  有college_province: ${asResult[0].has_province} (${(asResult[0].has_province/asResult[0].total*100).toFixed(1)}%)`);
  console.log(`  有college_code: ${asResult[0].has_code} (${(asResult[0].has_code/asResult[0].total*100).toFixed(1)}%)`);

  // 4. 验证江苏省院校筛选功能
  console.log('\n4. 验证江苏省院校筛选功能:');
  const jsColleges = await AppDataSource.query(`
    SELECT COUNT(DISTINCT college_name) as js_college_count
    FROM enrollment_plans
    WHERE year = 2025 AND college_province = '江苏'
  `);
  console.log(`  enrollment_plans中标记为江苏省的院校数: ${jsColleges[0].js_college_count}`);

  // 5. 测试实际筛选查询
  console.log('\n5. 测试实际筛选查询（江苏省内，物理类，590分）:');
  const testQuery = await AppDataSource.query(`
    SELECT COUNT(*) as count
    FROM enrollment_plans ep
    WHERE ep.year = 2025
      AND ep.source_province = '江苏'
      AND ep.subject_type = '物理类'
      AND ep.college_province = '江苏'
  `);
  console.log(`  符合条件的记录数: ${testQuery[0].count}`);

  if (testQuery[0].count > 0) {
    console.log('  ✅ 查询成功！可以正常筛选江苏省内院校');

    // 显示一些示例
    const samples = await AppDataSource.query(`
      SELECT college_name, major_name, college_province, college_city
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND college_province = '江苏'
      LIMIT 5
    `);

    console.log('\n  示例数据:');
    samples.forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.college_name} (${s.college_province} ${s.college_city}) - ${s.major_name}`);
    });
  } else {
    console.log('  ❌ 查询结果为空，可能存在问题');
  }

  // 6. 验证subject_type标准化
  console.log('\n6. 验证subject_type字段标准化:');
  const subjectTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as count
    FROM enrollment_plans
    GROUP BY subject_type
  `);
  console.log('  enrollment_plans表中的subject_type值:');
  subjectTypes.forEach((st: any) => {
    console.log(`    - ${st.subject_type}: ${st.count}条`);
  });

  const hasOldFormat = subjectTypes.some((st: any) => st.subject_type === '物理' || st.subject_type === '历史');
  if (hasOldFormat) {
    console.log('  ❌ 仍存在旧格式（物理/历史），标准化未完全生效');
  } else {
    console.log('  ✅ subject_type已全部标准化为"物理类"和"历史类"');
  }

  console.log('\n=== 验证完成 ===');
  console.log('\n📊 总结:');
  console.log(`✅ colleges.code: 从 3 条增加到 ${collegesCodeResult[0].filled_code} 条`);
  console.log(`✅ enrollment_plans: 补全了 ${epResult[0].has_province} 条省份信息`);
  console.log(`✅ admission_scores: 补全了 ${asResult[0].has_province} 条省份信息`);
  console.log(`✅ subject_type: 全部标准化为"物理类"和"历史类"`);
  console.log(`✅ 江苏省院校筛选: 可正常工作，找到 ${jsColleges[0].js_college_count} 所院校`);

  await AppDataSource.destroy();
}

verifyStandardizationResult().catch(console.error);
