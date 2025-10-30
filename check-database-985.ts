/**
 * 直接测试数据库中985/211院校的数据
 */

import { AppDataSource } from './src/config/database';

async function checkDatabase() {
  await AppDataSource.initialize();

  console.log('=== 检查数据库中的985/211数据 ===\n');

  // 1. 检查有多少985/211院校
  const count985211 = await AppDataSource.query(`
    SELECT
      COUNT(DISTINCT college_name) as total_colleges,
      SUM(CASE WHEN college_is_985 = 1 THEN 1 ELSE 0 END) as count_985,
      SUM(CASE WHEN college_is_211 = 1 THEN 1 ELSE 0 END) as count_211
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_province = '江苏'
      AND (college_is_985 = 1 OR college_is_211 = 1)
  `);

  console.log('985/211院校统计:');
  console.log(count985211[0]);

  // 2. 列出所有985/211院校
  const colleges = await AppDataSource.query(`
    SELECT DISTINCT
      college_name,
      college_is_985,
      college_is_211,
      COUNT(*) as plan_count
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_province = '江苏'
      AND (college_is_985 = 1 OR college_is_211 = 1)
    GROUP BY college_name, college_is_985, college_is_211
    ORDER BY college_name
  `);

  console.log(`\n共找到 ${colleges.length} 所985/211院校:\n`);
  colleges.forEach((c: any) => {
    const tags = [];
    if (c.college_is_985) tags.push('985');
    if (c.college_is_211) tags.push('211');
    console.log(`  ${c.college_name} [${tags.join(',')}] - ${c.plan_count}个专业`);
  });

  // 3. 随机选一个985/211院校，查看其专业和历史分数
  if (colleges.length > 0) {
    const testCollege = colleges[0];
    console.log(`\n\n测试院校: ${testCollege.college_name}`);

    const plans = await AppDataSource.query(`
      SELECT
        id,
        major_name,
        college_is_985,
        college_is_211
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND college_name = ?
      LIMIT 5
    `, [testCollege.college_name]);

    console.log(`\n该校专业（前5个）:`);
    plans.forEach((p: any) => {
      console.log(`  - ${p.major_name} (985=${p.college_is_985}, 211=${p.college_is_211})`);
    });

    // 查历史分数
    if (plans.length > 0) {
      const testPlan = plans[0];
      console.log(`\n查询专业"${testPlan.major_name}"的历史分数:`);

      const history = await AppDataSource.query(`
        SELECT year, min_score, min_rank
        FROM admission_scores
        WHERE source_province = '江苏'
          AND college_name = ?
          AND major_name = ?
          AND subject_type = '物理类'
          AND year < 2025
        ORDER BY year DESC
        LIMIT 3
      `, [testCollege.college_name, testPlan.major_name]);

      if (history.length === 0) {
        console.log('  ⚠️  无历史分数数据');
      } else {
        history.forEach((h: any) => {
          console.log(`  ${h.year}年: 最低分=${h.min_score}, 最低位次=${h.min_rank}`);
        });
      }
    }
  }

  await AppDataSource.destroy();
}

checkDatabase().catch(console.error);
