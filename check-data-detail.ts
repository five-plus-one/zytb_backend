/**
 * 详细检查数据库数据
 */

import { AppDataSource } from './src/config/database';

async function checkDataDetail() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 检查enrollment_plans表的详细情况
    console.log('=== 1. enrollment_plans表详细检查 ===');

    // 查询所有年份
    const yearsResult = await AppDataSource.query(`
      SELECT DISTINCT year FROM enrollment_plans ORDER BY year DESC
    `);
    console.log('可用年份:', yearsResult.map((r: any) => r.year));

    // 查询每个年份的数量
    for (const yearObj of yearsResult) {
      const year = yearObj.year;
      const [countResult] = await AppDataSource.query(`
        SELECT COUNT(*) as count FROM enrollment_plans WHERE year = ?
      `, [year]);
      console.log(`${year}年招生计划总数: ${countResult.count}`);

      // 查询江苏省的数量
      const [jsResult] = await AppDataSource.query(`
        SELECT COUNT(*) as count FROM enrollment_plans
        WHERE year = ? AND source_province = '江苏'
      `, [year]);
      console.log(`${year}年江苏省招生计划数: ${jsResult.count}`);
    }

    // 2. 查看2025年的实际数据样例
    console.log('\n=== 2. 2025年招生计划数据样例 ===');
    const plans2025 = await AppDataSource.query(`
      SELECT college_name, major_name, source_province, subject_type, college_code
      FROM enrollment_plans
      WHERE year = 2025
      LIMIT 10
    `);
    console.log('前10条数据:');
    plans2025.forEach((p: any) => {
      console.log(`  ${p.college_name} - ${p.major_name} (${p.source_province} ${p.subject_type}) [代码:${p.college_code}]`);
    });

    // 3. 检查colleges表的province字段
    console.log('\n=== 3. colleges表province字段检查 ===');
    const [provinceCount] = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM colleges WHERE province IS NOT NULL AND province != ''
    `);
    console.log(`有province数据的院校数: ${provinceCount.count}`);

    // 查看实际的province值
    const provinces = await AppDataSource.query(`
      SELECT DISTINCT province FROM colleges WHERE province IS NOT NULL AND province != '' LIMIT 20
    `);
    console.log('前20个省份值:', provinces.map((p: any) => p.province));

    // 4. 尝试通过院校名称匹配省份
    console.log('\n=== 4. 通过院校名称包含"江苏"的院校 ===');
    const jsColleges = await AppDataSource.query(`
      SELECT name, code, province, city FROM colleges
      WHERE name LIKE '%江苏%'
      LIMIT 10
    `);
    console.log(`院校名称包含"江苏"的院校数: ${jsColleges.length}`);
    jsColleges.forEach((c: any) => {
      console.log(`  ${c.name} (代码:${c.code}, 省份:${c.province}, 城市:${c.city})`);
    });

    // 5. 检查enrollment_plans中的江苏院校
    console.log('\n=== 5. enrollment_plans中江苏相关院校 ===');
    const jsPlansColleges = await AppDataSource.query(`
      SELECT DISTINCT college_name, college_code
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND college_name LIKE '%江苏%'
      LIMIT 10
    `);
    console.log(`招生计划中院校名含"江苏"的院校数: ${jsPlansColleges.length}`);
    jsPlansColleges.forEach((c: any) => {
      console.log(`  ${c.college_name} (代码:${c.college_code})`);
    });

    // 6. 检查是否有计算机相关专业
    console.log('\n=== 6. 2025年江苏物理类计算机专业 ===');
    const computerPlans = await AppDataSource.query(`
      SELECT college_name, major_name, college_code
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND (major_name LIKE '%计算机%' OR major_group_name LIKE '%计算机%')
      LIMIT 10
    `);
    console.log(`计算机相关专业数: ${computerPlans.length}`);
    computerPlans.forEach((p: any) => {
      console.log(`  ${p.college_name} - ${p.major_name} (代码:${p.college_code})`);
    });

    // 7. 查询admission_scores中的院校信息
    console.log('\n=== 7. admission_scores中的江苏院校 ===');
    const scoresColleges = await AppDataSource.query(`
      SELECT DISTINCT college_name
      FROM admission_scores
      WHERE year = 2024
        AND source_province = '江苏'
        AND college_name LIKE '%江苏%'
      LIMIT 10
    `);
    console.log(`录取分数表中院校名含"江苏"的院校数: ${scoresColleges.length}`);
    scoresColleges.forEach((c: any) => {
      console.log(`  ${c.college_name}`);
    });

    console.log('\n✅ 检查完成');
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

checkDataDetail();
