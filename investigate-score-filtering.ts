/**
 * 调查分数筛选逻辑为何过滤掉所有985/211院校
 */

import { AppDataSource } from './src/config/database';

async function investigateScoreFiltering() {
  await AppDataSource.initialize();

  console.log('=== 调查分数筛选逻辑 ===\n');

  const userScore = 590;
  const scoreRange = 200;

  // 1. 查询江苏省内985/211院校的招生计划
  console.log('1. 江苏省内985/211院校招生计划:\n');

  const elitePlans = await AppDataSource.query(`
    SELECT
      ep.id,
      ep.college_name,
      ep.major_name,
      ep.college_is_985,
      ep.college_is_211
    FROM enrollment_plans ep
    WHERE ep.year = 2025
      AND ep.source_province = '江苏'
      AND ep.subject_type = '物理类'
      AND ep.college_province = '江苏'
      AND (ep.college_is_985 = 1 OR ep.college_is_211 = 1)
    LIMIT 10
  `);

  console.log(`找到 ${elitePlans.length} 条985/211招生计划记录\n`);

  // 2. 对每条记录，查询其历史录取分数（使用相同的join逻辑）
  for (const plan of elitePlans) {
    console.log(`\n院校: ${plan.college_name}`);
    console.log(`专业: ${plan.major_name}`);

    const tags = [];
    if (plan.college_is_985) tags.push('985');
    if (plan.college_is_211) tags.push('211');
    console.log(`标签: [${tags.join(',')}]`);

    // 查询历史录取分数 (匹配 collegeName, majorName, sourceProvince, subjectType)
    const historicalScores = await AppDataSource.query(`
      SELECT
        year,
        min_score,
        min_rank
      FROM admission_scores
      WHERE source_province = '江苏'
        AND college_name = ?
        AND major_name = ?
        AND subject_type = '物理类'
        AND year < 2025
      ORDER BY year DESC
      LIMIT 3
    `, [plan.college_name, plan.major_name]);

    if (historicalScores.length === 0) {
      console.log(`  ⚠️  无历史录取数据 → 按当前逻辑会被保留`);
    } else {
      console.log(`  历史录取分数:`);
      historicalScores.forEach((hs: any) => {
        const scoreDiff = hs.min_score ? Math.abs(hs.min_score - userScore) : null;
        const inRange = scoreDiff !== null && scoreDiff <= scoreRange;
        const status = inRange ? '✅ 在范围内' : '❌ 超出范围';
        console.log(`    ${hs.year}年: 最低分=${hs.min_score || 'null'}, 分差=${scoreDiff || 'null'} ${status}`);
      });

      // 模拟过滤逻辑
      const latestScore = historicalScores[0];
      if (latestScore.min_score) {
        const scoreDiff = Math.abs(latestScore.min_score - userScore);
        if (scoreDiff > scoreRange) {
          console.log(`  ❌ 此专业将被过滤（分差 ${scoreDiff} > ${scoreRange}）`);
        } else {
          console.log(`  ✅ 此专业将被保留（分差 ${scoreDiff} <= ${scoreRange}）`);
        }
      }
    }
  }

  // 3. 统计有无历史数据的情况
  console.log('\n\n3. 985/211院校历史数据统计:\n');

  const dataStats = await AppDataSource.query(`
    SELECT
      COUNT(DISTINCT ep.id) as total_plans,
      COUNT(DISTINCT CASE WHEN aso.year IS NOT NULL THEN ep.id END) as plans_with_history,
      COUNT(DISTINCT CASE WHEN aso.year IS NULL THEN ep.id END) as plans_without_history
    FROM enrollment_plans ep
    LEFT JOIN admission_scores aso ON
      ep.source_province = aso.source_province AND
      ep.college_name = aso.college_name AND
      ep.major_name = aso.major_name AND
      ep.subject_type = aso.subject_type AND
      aso.year < 2025
    WHERE ep.year = 2025
      AND ep.source_province = '江苏'
      AND ep.subject_type = '物理类'
      AND ep.college_province = '江苏'
      AND (ep.college_is_985 = 1 OR ep.college_is_211 = 1)
  `);

  console.log(`总招生计划数: ${dataStats[0].total_plans}`);
  console.log(`有历史数据: ${dataStats[0].plans_with_history}`);
  console.log(`无历史数据: ${dataStats[0].plans_without_history}`);

  // 4. 检查分数差异分布
  console.log('\n\n4. 分数差异分布:\n');

  const scoreDiffStats = await AppDataSource.query(`
    SELECT
      ep.college_name,
      ep.major_name,
      aso.year,
      aso.min_score,
      ABS(aso.min_score - ${userScore}) as score_diff
    FROM enrollment_plans ep
    INNER JOIN admission_scores aso ON
      ep.source_province = aso.source_province AND
      ep.college_name = aso.college_name AND
      ep.major_name = aso.major_name AND
      ep.subject_type = aso.subject_type
    WHERE ep.year = 2025
      AND ep.source_province = '江苏'
      AND ep.subject_type = '物理类'
      AND ep.college_province = '江苏'
      AND (ep.college_is_985 = 1 OR ep.college_is_211 = 1)
      AND aso.min_score IS NOT NULL
      AND aso.year < 2025
    ORDER BY aso.year DESC, score_diff ASC
    LIMIT 30
  `);

  console.log(`前30条历史分数记录（按分差排序）:`);
  scoreDiffStats.forEach((row: any) => {
    const inRange = row.score_diff <= scoreRange;
    const status = inRange ? '✅' : '❌';
    console.log(`  ${status} ${row.college_name} - ${row.major_name} (${row.year}年): 最低分=${row.min_score}, 分差=${row.score_diff}`);
  });

  // 5. 统计有多少985/211院校会被过滤
  console.log('\n\n5. 模拟过滤结果统计:\n');

  const filterSimulation = await AppDataSource.query(`
    SELECT
      COUNT(DISTINCT ep.id) as total,
      COUNT(DISTINCT CASE
        WHEN aso.year IS NULL THEN ep.id
        WHEN aso.min_score IS NULL THEN ep.id
        WHEN ABS(aso.min_score - ${userScore}) <= ${scoreRange} THEN ep.id
      END) as would_pass,
      COUNT(DISTINCT CASE
        WHEN aso.min_score IS NOT NULL AND ABS(aso.min_score - ${userScore}) > ${scoreRange} THEN ep.id
      END) as would_fail
    FROM enrollment_plans ep
    LEFT JOIN (
      SELECT
        source_province,
        college_name,
        major_name,
        subject_type,
        year,
        min_score,
        ROW_NUMBER() OVER (
          PARTITION BY source_province, college_name, major_name, subject_type
          ORDER BY year DESC
        ) as rn
      FROM admission_scores
      WHERE year < 2025
    ) aso ON
      ep.source_province = aso.source_province AND
      ep.college_name = aso.college_name AND
      ep.major_name = aso.major_name AND
      ep.subject_type = aso.subject_type AND
      aso.rn = 1
    WHERE ep.year = 2025
      AND ep.source_province = '江苏'
      AND ep.subject_type = '物理类'
      AND ep.college_province = '江苏'
      AND (ep.college_is_985 = 1 OR ep.college_is_211 = 1)
  `);

  console.log(`总985/211招生计划: ${filterSimulation[0].total}`);
  console.log(`预计通过筛选: ${filterSimulation[0].would_pass}`);
  console.log(`预计被过滤: ${filterSimulation[0].would_fail}`);

  await AppDataSource.destroy();
}

investigateScoreFiltering().catch(console.error);
