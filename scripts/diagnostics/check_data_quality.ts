#!/usr/bin/env ts-node
/**
 * 数据质量诊断脚本
 * 检查Core Layer各表的数据完整性,为AI推荐系统提供数据基础评估
 */
import { AppDataSource } from '../../src/config/database';

async function diagnoseDataQuality() {
  console.log('\n🔍 === Core Layer 数据质量诊断 ===\n');

  await AppDataSource.initialize();

  // 1. 院校数据完整性
  const collegeStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT province) as provinces,
      SUM(CASE WHEN is_985 = 1 THEN 1 ELSE 0 END) as colleges_985,
      SUM(CASE WHEN is_211 = 1 THEN 1 ELSE 0 END) as colleges_211,
      SUM(CASE WHEN postgraduate_rate IS NOT NULL THEN 1 ELSE 0 END) as has_postgrad_rate,
      SUM(CASE WHEN \`rank\` IS NOT NULL THEN 1 ELSE 0 END) as has_rank,
      SUM(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as has_description
    FROM core_colleges
  `);

  console.log('📊 院校数据 (core_colleges):');
  console.log(`  总数: ${collegeStats[0].total}`);
  console.log(`  省份覆盖: ${collegeStats[0].provinces}`);
  console.log(`  985院校: ${collegeStats[0].colleges_985}`);
  console.log(`  211院校: ${collegeStats[0].colleges_211}`);
  console.log(`  保研率完整度: ${(collegeStats[0].has_postgrad_rate / collegeStats[0].total * 100).toFixed(1)}%`);
  console.log(`  排名完整度: ${(collegeStats[0].has_rank / collegeStats[0].total * 100).toFixed(1)}%`);
  console.log(`  描述完整度: ${(collegeStats[0].has_description / collegeStats[0].total * 100).toFixed(1)}%\n`);

  // 2. 专业数据完整性
  const majorStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT category) as categories,
      SUM(CASE WHEN hot_level >= 60 THEN 1 ELSE 0 END) as hot_majors,
      SUM(CASE WHEN avg_salary IS NOT NULL THEN 1 ELSE 0 END) as has_salary,
      SUM(CASE WHEN employment_rate IS NOT NULL THEN 1 ELSE 0 END) as has_employment,
      SUM(CASE WHEN embedding_vector IS NOT NULL THEN 1 ELSE 0 END) as has_embedding
    FROM core_majors
  `);

  console.log('📚 专业数据 (core_majors):');
  console.log(`  总数: ${majorStats[0].total}`);
  console.log(`  学科大类: ${majorStats[0].categories}`);
  console.log(`  热门专业: ${majorStats[0].hot_majors}`);
  console.log(`  薪资完整度: ${(majorStats[0].has_salary / majorStats[0].total * 100).toFixed(1)}%`);
  console.log(`  就业率完整度: ${(majorStats[0].has_employment / majorStats[0].total * 100).toFixed(1)}%`);
  console.log(`  向量嵌入完整度: ${(majorStats[0].has_embedding / majorStats[0].total * 100).toFixed(1)}%\n`);

  // 3. 录取分数完整性
  const scoreStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT source_province) as provinces,
      COUNT(DISTINCT year) as years,
      COUNT(DISTINCT college_name) as colleges,
      SUM(CASE WHEN min_rank IS NOT NULL THEN 1 ELSE 0 END) as has_rank
    FROM core_admission_scores
  `);

  console.log('📈 录取分数 (core_admission_scores):');
  console.log(`  总数: ${scoreStats[0].total}`);
  console.log(`  省份: ${scoreStats[0].provinces}`);
  console.log(`  年份: ${scoreStats[0].years}`);
  console.log(`  院校: ${scoreStats[0].colleges}`);
  console.log(`  位次完整度: ${(scoreStats[0].has_rank / scoreStats[0].total * 100).toFixed(1)}%\n`);

  // 4. 招生计划完整性
  const planStats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT source_province) as provinces,
      COUNT(DISTINCT year) as years,
      COUNT(DISTINCT college_name) as colleges,
      SUM(CASE WHEN major_name IS NOT NULL THEN 1 ELSE 0 END) as has_major
    FROM core_enrollment_plans
  `);

  console.log('📋 招生计划 (core_enrollment_plans):');
  console.log(`  总数: ${planStats[0].total}`);
  console.log(`  省份: ${planStats[0].provinces}`);
  console.log(`  年份: ${planStats[0].years}`);
  console.log(`  院校: ${planStats[0].colleges}`);
  console.log(`  专业完整度: ${(planStats[0].has_major / planStats[0].total * 100).toFixed(1)}%\n`);

  // 5. 关键问题检测
  console.log('⚠️  关键问题检测:\n');

  // 检测高分段数据
  const highScoreData = await AppDataSource.query(`
    SELECT COUNT(*) as count
    FROM core_admission_scores
    WHERE min_score >= 650
  `);
  console.log(`  高分段(≥650分)数据: ${highScoreData[0].count} 条`);

  // 检测顶尖院校数据
  const topColleges = await AppDataSource.query(`
    SELECT name, COUNT(*) as score_count
    FROM core_colleges c
    LEFT JOIN core_admission_scores s ON c.name = s.college_name
    WHERE c.is_985 = 1
    GROUP BY c.id, c.name
    HAVING score_count = 0
  `);

  if (topColleges.length > 0) {
    console.log(`\n  ❌ ${topColleges.length} 个985院校缺少录取分数数据:`);
    topColleges.slice(0, 5).forEach((c: any) => {
      console.log(`     - ${c.name}`);
    });
  }

  await AppDataSource.destroy();

  console.log('\n✅ 诊断完成\n');
}

diagnoseDataQuality().catch(console.error);
