#!/usr/bin/env ts-node
/**
 * 测试推荐引擎的过滤问题
 */
import { AppDataSource } from '../../src/config/database';

async function test() {
  console.log('\n🔬 === 测试推荐过滤问题 ===\n');

  await AppDataSource.initialize();

  const province = '江苏';
  const subjectType = 'physics';
  const userRank = 8837; // 来自用户案例
  const userScore = 638;

  // 模拟动态位次范围计算（通常是 ±50%）
  const rankRange = {
    min: Math.max(1, Math.round(userRank - userRank * 0.5)),
    max: Math.round(userRank + userRank * 0.5)
  };

  console.log(`用户位次: ${userRank}, 范围: ${rankRange.min} - ${rankRange.max}\n`);

  // 1. 检查有多少江苏/浙江+自动化的招生计划
  const totalPlans = await AppDataSource.query(`
    SELECT COUNT(*) as cnt
    FROM core_enrollment_plans
    WHERE source_province = '江苏'
      AND subject_type LIKE '%physics%'
      AND (college_province = '江苏' OR college_province = '浙江')
      AND (major_name LIKE '%自动化%' OR major_group_name LIKE '%自动化%')
      AND year >= 2024
  `);

  console.log(`1️⃣ 江苏/浙江+自动化的招生计划数: ${totalPlans[0].cnt}`);

  // 2. 查询这些计划对应的院校有多少有历史分数
  const collegesWithScores = await AppDataSource.query(`
    SELECT DISTINCT ep.college_name
    FROM core_enrollment_plans ep
    INNER JOIN core_admission_scores cas ON
      cas.college_name = ep.college_name
      AND cas.source_province = ep.source_province
      AND cas.subject_type = '${subjectType}'
    WHERE ep.source_province = '江苏'
      AND ep.subject_type LIKE '%physics%'
      AND (ep.college_province = '江苏' OR ep.college_province = '浙江')
      AND (ep.major_name LIKE '%自动化%' OR ep.major_group_name LIKE '%自动化%')
      AND ep.year >= 2024
  `);

  console.log(`2️⃣ 有历史录取分数的院校数: ${collegesWithScores.length}`);

  // 3. 在位次范围内有历史分数的院校数
  const collegesInRankRange = await AppDataSource.query(`
    SELECT DISTINCT ep.college_name
    FROM core_enrollment_plans ep
    INNER JOIN core_admission_scores cas ON
      cas.college_name = ep.college_name
      AND cas.source_province = ep.source_province
      AND cas.subject_type = '${subjectType}'
      AND cas.min_rank IS NOT NULL
      AND cas.min_rank >= ${rankRange.min}
      AND cas.min_rank <= ${rankRange.max}
    WHERE ep.source_province = '江苏'
      AND ep.subject_type LIKE '%physics%'
      AND (ep.college_province = '江苏' OR ep.college_province = '浙江')
      AND (ep.major_name LIKE '%自动化%' OR ep.major_group_name LIKE '%自动化%')
      AND ep.year >= 2024
  `);

  console.log(`3️⃣ 在位次范围${rankRange.min}-${rankRange.max}内有历史分数的院校数: ${collegesInRankRange.length}`);
  console.log(`\n院校列表:`);
  collegesInRankRange.forEach((r: any, i: number) => {
    console.log(`  ${i + 1}. ${r.college_name}`);
  });

  // 4. 查看位次分布
  const rankDistribution = await AppDataSource.query(`
    SELECT
      MIN(cas.min_rank) as min_rank,
      MAX(cas.min_rank) as max_rank,
      AVG(cas.min_rank) as avg_rank,
      COUNT(*) as cnt
    FROM core_admission_scores cas
    INNER JOIN core_enrollment_plans ep ON
      ep.college_name = cas.college_name
      AND ep.source_province = cas.source_province
    WHERE cas.source_province = '江苏'
      AND cas.subject_type = '${subjectType}'
      AND (ep.college_province = '江苏' OR ep.college_province = '浙江')
      AND (ep.major_name LIKE '%自动化%' OR ep.major_group_name LIKE '%自动化%')
      AND cas.min_rank IS NOT NULL
  `);

  console.log(`\n4️⃣ 江苏/浙江+自动化专业的历史位次分布:`);
  const dist = rankDistribution[0];
  console.log(`  最低位次: ${dist.min_rank}`);
  console.log(`  最高位次: ${dist.max_rank}`);
  console.log(`  平均位次: ${Math.round(dist.avg_rank)}`);
  console.log(`  记录数: ${dist.cnt}`);

  console.log(`\n💡 分析结论:`);
  console.log(`  总计划数: ${totalPlans[0].cnt}`);
  console.log(`  在用户位次范围内的院校: ${collegesInRankRange.length}`);
  console.log(`  覆盖率: ${(collegesInRankRange.length / collegesWithScores.length * 100).toFixed(1)}%`);

  if (collegesInRankRange.length < 10) {
    console.log(`\n⚠️  问题: 位次范围过滤太严格，导致大量符合偏好的院校被排除！`);
  }

  await AppDataSource.destroy();

  console.log('\n✅ 测试完成\n');
}

test().catch(console.error);
