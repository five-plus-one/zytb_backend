/**
 * 快速修复脚本：通过JOIN解决院校匹配问题
 * 不需要修改表结构，直接优化查询逻辑
 */

import { AppDataSource } from './src/config/database';

async function quickFix() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    console.log('=== 分析院校名称匹配情况 ===\n');

    // 1. 检查enrollment_plans和colleges的匹配情况
    const matchAnalysis = await AppDataSource.query(`
      SELECT
        COUNT(DISTINCT ep.college_name) as total_colleges_in_plans,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN ep.college_name END) as matched_colleges,
        COUNT(DISTINCT CASE WHEN c.id IS NULL THEN ep.college_name END) as unmatched_colleges
      FROM enrollment_plans ep
      LEFT JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025
    `);

    console.log('匹配分析:');
    console.log(`  enrollment_plans中不同院校数: ${matchAnalysis[0].total_colleges_in_plans}`);
    console.log(`  成功匹配的院校数: ${matchAnalysis[0].matched_colleges}`);
    console.log(`  未匹配的院校数: ${matchAnalysis[0].unmatched_colleges}`);

    // 2. 显示未匹配的院校样例
    const unmatchedColleges = await AppDataSource.query(`
      SELECT DISTINCT ep.college_name
      FROM enrollment_plans ep
      LEFT JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025 AND c.id IS NULL
      LIMIT 20
    `);

    console.log('\n未匹配的院校样例:');
    unmatchedColleges.forEach((c: any) => {
      console.log(`  - ${c.college_name}`);
    });

    // 3. 测试通过JOIN查询江苏省内院校的专业
    console.log('\n=== 测试JOIN查询 ===');
    const result = await AppDataSource.query(`
      SELECT
        ep.college_name,
        ep.major_name,
        c.province,
        c.city
      FROM enrollment_plans ep
      INNER JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025
        AND ep.source_province = '江苏'
        AND ep.subject_type = '物理类'
        AND c.province = '江苏'
      LIMIT 10
    `);

    console.log(`\n通过JOIN找到江苏省内院校的专业数: ${result.length}`);
    result.forEach((r: any) => {
      console.log(`  ${r.college_name} (${r.province}-${r.city}): ${r.major_name}`);
    });

    // 4. 提供修复建议
    console.log('\n=== 修复建议 ===');

    if (matchAnalysis[0].matched_colleges > 0) {
      console.log('✅ 部分院校可以通过JOIN匹配');
      console.log('建议：修改MajorFilterService，使用JOIN代替IN查询');
    }

    if (matchAnalysis[0].unmatched_colleges > matchAnalysis[0].matched_colleges) {
      console.log('⚠️  大部分院校无法直接匹配');
      console.log('建议：');
      console.log('  1. 运行完整的数据标准化程序');
      console.log('  2. 或者使用模糊匹配（LIKE）');
    }

    console.log('\n✅ 分析完成');
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

quickFix();
