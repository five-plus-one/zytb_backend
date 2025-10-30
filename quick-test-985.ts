/**
 * 快速测试：只查询985/211院校（通过在SQL里直接筛选）
 */

import { AppDataSource } from './src/config/database';

async function quickTest() {
  await AppDataSource.initialize();

  console.log('=== 快速测试：模拟筛选逻辑 ===\n');

  const userScore = 590;
  const scoreRange = 200;

  // 1. 获取江苏省内所有985/211招生计划
  console.log('1. 查询985/211招生计划...\n');

  const plans = await AppDataSource.query(`
    SELECT
      id,
      college_name,
      major_name,
      college_is_985,
      college_is_211
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_province = '江苏'
      AND (college_is_985 = 1 OR college_is_211 = 1)
    ORDER BY college_name, major_name
    LIMIT 100
  `);

  console.log(`找到 ${plans.length} 条985/211招生计划\n`);

  // 2. 模拟查询历史分数和过滤
  let passedCount = 0;
  let failedCount = 0;
  let noHistoryCount = 0;

  const passed985211 = [];

  for (const plan of plans.slice(0, 50)) {  // 只测试前50条
    // 查历史分数
    const history = await AppDataSource.query(`
      SELECT year, min_score
      FROM admission_scores
      WHERE source_province = '江苏'
        AND college_name = ?
        AND major_name = ?
        AND subject_type = '物理类'
        AND year < 2025
      ORDER BY year DESC
      LIMIT 1
    `, [plan.college_name, plan.major_name]);

    if (history.length === 0) {
      // 无历史数据，保留
      passedCount++;
      noHistoryCount++;
      passed985211.push({...plan, reason: '无历史数据'});
    } else {
      const latestScore = history[0];
      if (!latestScore.min_score) {
        // 历史分数为null，保留
        passedCount++;
        passed985211.push({...plan, reason: '历史分数为null'});
      } else {
        const scoreDiff = Math.abs(latestScore.min_score - userScore);
        if (scoreDiff <= scoreRange) {
          // 分数在范围内，保留
          passedCount++;
          passed985211.push({...plan, reason: `分差${scoreDiff}`, latestScore: latestScore.min_score});
        } else {
          // 分数超出范围，过滤
          failedCount++;
        }
      }
    }
  }

  console.log(`\n筛选结果（前50条中）:`);
  console.log(`  通过: ${passedCount} 条`);
  console.log(`  过滤: ${failedCount} 条`);
  console.log(`  其中无历史数据: ${noHistoryCount} 条\n`);

  if (passedCount > 0) {
    console.log('✅ 通过筛选的985/211专业（前10个）:\n');
    passed985211.slice(0, 10).forEach((p: any) => {
      const tags = [];
      if (p.college_is_985) tags.push('985');
      if (p.college_is_211) tags.push('211');
      const scoreInfo = p.latestScore ? ` (历史分${p.latestScore})` : '';
      console.log(`  ${p.college_name} [${tags.join(',')}] - ${p.major_name} - ${p.reason}${scoreInfo}`);
    });
  } else {
    console.log('❌ 没有985/211专业通过筛选');
  }

  await AppDataSource.destroy();
}

quickTest().catch(console.error);
