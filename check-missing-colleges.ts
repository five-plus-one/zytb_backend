/**
 * 检查未补全数据的院校
 */

import { AppDataSource } from './src/config/database';

async function checkMissingData() {
  await AppDataSource.initialize();

  console.log('=== 检查未补全的数据 ===\n');

  // 1. 检查哪些院校的数据没有被补全
  console.log('1. 未补全college_province的院校（前30个）:');
  const missingColleges = await AppDataSource.query(`
    SELECT DISTINCT college_name, COUNT(*) as count
    FROM enrollment_plans
    WHERE year = 2025
      AND college_province IS NULL
    GROUP BY college_name
    ORDER BY count DESC
    LIMIT 30
  `);

  console.log(`  总共有 ${missingColleges.length} 个院校未补全\n`);
  missingColleges.forEach((c: any, i: number) => {
    console.log(`  ${i + 1}. ${c.college_name}: ${c.count}条记录`);
  });

  // 2. 检查这些院校在colleges表中是否存在
  console.log('\n2. 检查前10个院校在colleges表的匹配情况:');
  for (const mc of missingColleges.slice(0, 10)) {
    const exactMatch = await AppDataSource.query(`
      SELECT name, province, city FROM colleges
      WHERE name = ?
    `, [mc.college_name]);

    if (exactMatch.length > 0) {
      console.log(`  ✓ ${mc.college_name} -> 精确匹配: ${exactMatch[0].name} (${exactMatch[0].province})`);
    } else {
      // 尝试模糊匹配
      const fuzzyMatch = await AppDataSource.query(`
        SELECT name, province, city FROM colleges
        WHERE name LIKE ?
        LIMIT 3
      `, [`%${mc.college_name.substring(0, 4)}%`]);

      if (fuzzyMatch.length > 0) {
        console.log(`  ~ ${mc.college_name} -> 可能匹配:`);
        fuzzyMatch.forEach((fm: any) => {
          console.log(`      - ${fm.name} (${fm.province})`);
        });
      } else {
        console.log(`  ✗ ${mc.college_name} -> 未找到任何匹配`);
      }
    }
  }

  // 3. 检查985/211院校是否被补全
  console.log('\n3. 检查江苏985/211院校的补全情况:');
  const famous985 = ['南京大学', '东南大学'];
  const famous211 = ['河海大学', '南京农业大学', '中国药科大学', '南京航空航天大学', '南京理工大学', '江南大学', '苏州大学'];

  for (const collegeName of [...famous985, ...famous211]) {
    const result = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_province) as filled,
        MAX(college_is_985) as is_985,
        MAX(college_is_211) as is_211
      FROM enrollment_plans
      WHERE year = 2025 AND college_name = ?
    `, [collegeName]);

    if (result[0].total > 0) {
      const fillRate = (result[0].filled / result[0].total * 100).toFixed(1);
      const tags = [];
      if (result[0].is_985) tags.push('985');
      if (result[0].is_211) tags.push('211');
      const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';
      console.log(`  ${collegeName}: ${result[0].filled}/${result[0].total} (${fillRate}%)${tagStr}`);
    } else {
      console.log(`  ${collegeName}: 未找到招生计划`);
    }
  }

  // 4. 统计补全率
  console.log('\n4. 总体补全率统计:');
  const stats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(college_province) as has_province,
      COUNT(CASE WHEN college_is_985 = 1 THEN 1 END) as count_985,
      COUNT(CASE WHEN college_is_211 = 1 THEN 1 END) as count_211
    FROM enrollment_plans
    WHERE year = 2025
  `);

  console.log(`  总记录数: ${stats[0].total}`);
  console.log(`  已补全province: ${stats[0].has_province} (${(stats[0].has_province/stats[0].total*100).toFixed(1)}%)`);
  console.log(`  985院校记录: ${stats[0].count_985}`);
  console.log(`  211院校记录: ${stats[0].count_211}`);
  console.log(`  未补全: ${stats[0].total - stats[0].has_province} (${((stats[0].total - stats[0].has_province)/stats[0].total*100).toFixed(1)}%)`);

  await AppDataSource.destroy();
}

checkMissingData().catch(console.error);
