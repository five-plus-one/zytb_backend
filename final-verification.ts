/**
 * 最终验证脚本
 */

import { AppDataSource } from './src/config/database';

async function finalVerification() {
  await AppDataSource.initialize();

  console.log('=== 最终验证结果 ===\n');

  // 1. 总体统计
  const stats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(college_province) as has_province,
      COUNT(CASE WHEN college_is_985 = 1 THEN 1 END) as count_985,
      COUNT(CASE WHEN college_is_211 = 1 THEN 1 END) as count_211
    FROM enrollment_plans
    WHERE year = 2025
  `);

  console.log('📊 enrollment_plans表补全结果:');
  console.log(`  总记录数: ${stats[0].total}`);
  console.log(`  已补全province: ${stats[0].has_province} (${(stats[0].has_province/stats[0].total*100).toFixed(1)}%)`);
  console.log(`  985院校记录: ${stats[0].count_985}`);
  console.log(`  211院校记录: ${stats[0].count_211}`);

  // 2. 验证985/211院校
  console.log('\n🏆 江苏985/211院校补全情况:');
  const famous = ['南京大学', '东南大学', '河海大学', '南京农业大学', '中国药科大学',
                  '南京航空航天大学', '南京理工大学', '江南大学', '苏州大学'];

  for (const name of famous) {
    const result = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_province) as filled,
        MAX(college_is_985) as is_985,
        MAX(college_is_211) as is_211
      FROM enrollment_plans
      WHERE year = 2025 AND college_name = ?
    `, [name]);

    if (result[0].total > 0) {
      const tags = [];
      if (result[0].is_985) tags.push('985');
      if (result[0].is_211) tags.push('211');
      const tagStr = tags.length > 0 ? `[${tags.join(',')}]` : '';
      const rate = (result[0].filled / result[0].total * 100).toFixed(1);
      console.log(`  ${name} ${tagStr}: ${result[0].filled}/${result[0].total} (${rate}%)`);
    }
  }

  // 3. 测试江苏省内院校筛选
  console.log('\n✅ 测试江苏省内院校筛选:');
  const jsTest = await AppDataSource.query(`
    SELECT COUNT(*) as count, COUNT(DISTINCT college_name) as colleges
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_province = '江苏'
  `);
  console.log(`  江苏省内物理类招生计划: ${jsTest[0].count} 条`);
  console.log(`  涉及院校数: ${jsTest[0].colleges} 所`);

  // 4. 测试985/211院校筛选
  console.log('\n🎓 测试985/211院校筛选:');
  const eliteTest = await AppDataSource.query(`
    SELECT COUNT(*) as count_985, COUNT(DISTINCT college_name) as colleges_985
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_is_985 = 1
  `);
  console.log(`  985院校招生计划: ${eliteTest[0].count_985} 条`);
  console.log(`  985院校数量: ${eliteTest[0].colleges_985} 所`);

  const elite211Test = await AppDataSource.query(`
    SELECT COUNT(*) as count_211, COUNT(DISTINCT college_name) as colleges_211
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_is_211 = 1
  `);
  console.log(`  211院校招生计划: ${elite211Test[0].count_211} 条`);
  console.log(`  211院校数量: ${elite211Test[0].colleges_211} 所`);

  await AppDataSource.destroy();
  console.log('\n🎉 数据标准化和补全全部完成！');
}

finalVerification().catch(console.error);
