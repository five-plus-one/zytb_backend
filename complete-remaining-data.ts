/**
 * 补全剩余未匹配的enrollment_plans记录
 * 针对那些在colleges表中存在但首次未匹配的院校
 */

import { AppDataSource } from './src/config/database';

async function completeRemainingRecords() {
  await AppDataSource.initialize();

  console.log('=== 补全剩余的enrollment_plans记录 ===\n');

  // 1. 获取所有未补全的院校名称
  const missingColleges = await AppDataSource.query(`
    SELECT DISTINCT college_name
    FROM enrollment_plans
    WHERE year = 2025 AND college_province IS NULL
  `);

  console.log(`📋 找到 ${missingColleges.length} 个未补全的院校\n`);

  let totalUpdated = 0;
  let notFoundCount = 0;

  // 2. 逐个院校进行匹配和更新
  for (const mc of missingColleges) {
    const collegeName = mc.college_name;

    // 先尝试精确匹配
    let collegeInfo = await AppDataSource.query(`
      SELECT id, name, province, city, is_985, is_211, is_world_class
      FROM colleges
      WHERE name = ?
    `, [collegeName]);

    if (collegeInfo.length === 0) {
      // 尝试去除括号后匹配
      const nameWithoutParentheses = collegeName.replace(/[（(].*?[）)]/g, '').trim();
      collegeInfo = await AppDataSource.query(`
        SELECT id, name, province, city, is_985, is_211, is_world_class
        FROM colleges
        WHERE name = ? OR name LIKE ?
      `, [nameWithoutParentheses, `${nameWithoutParentheses}%`]);
    }

    if (collegeInfo.length > 0) {
      const college = collegeInfo[0];

      // 更新该院校的所有记录
      const result = await AppDataSource.query(`
        UPDATE enrollment_plans
        SET
          college_province = ?,
          college_city = ?,
          college_is_985 = ?,
          college_is_211 = ?,
          college_is_world_class = ?
        WHERE college_name = ? AND college_province IS NULL
      `, [
        college.province,
        college.city,
        college.is_985 || false,
        college.is_211 || false,
        college.is_world_class || false,
        collegeName
      ]);

      const affectedRows = result.affectedRows || 0;
      totalUpdated += affectedRows;

      const tags = [];
      if (college.is_985) tags.push('985');
      if (college.is_211) tags.push('211');
      const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';

      console.log(`✓ ${collegeName}${tagStr}: 更新 ${affectedRows} 条记录 (${college.province})`);
    } else {
      notFoundCount++;
      console.log(`✗ ${collegeName}: 未在colleges表中找到匹配`);
    }
  }

  console.log(`\n=== 补全完成 ===`);
  console.log(`✅ 成功更新: ${totalUpdated} 条记录`);
  console.log(`⚠️ 未找到匹配: ${notFoundCount} 个院校`);

  // 3. 显示最终统计
  const finalStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(college_province) as has_province,
      COUNT(CASE WHEN college_is_985 = 1 THEN 1 END) as count_985,
      COUNT(CASE WHEN college_is_211 = 1 THEN 1 END) as count_211
    FROM enrollment_plans
    WHERE year = 2025
  `);

  console.log(`\n📊 最终统计:`);
  console.log(`  总记录数: ${finalStats[0].total}`);
  console.log(`  已补全: ${finalStats[0].has_province} (${(finalStats[0].has_province/finalStats[0].total*100).toFixed(1)}%)`);
  console.log(`  985院校记录: ${finalStats[0].count_985}`);
  console.log(`  211院校记录: ${finalStats[0].count_211}`);

  await AppDataSource.destroy();
}

completeRemainingRecords().catch(console.error);
