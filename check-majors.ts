import { AppDataSource } from './src/config/database';

async function checkMajors() {
  try {
    await AppDataSource.initialize();

    // 1. 查看物理类专业样例
    const result = await AppDataSource.query(`
      SELECT major_name, major_group_name, college_name, college_code
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
      LIMIT 30
    `);

    console.log('=== 前30个物理类专业 ===');
    result.forEach((r: any, i: number) => {
      console.log(`${i+1}. ${r.college_name} - ${r.major_name} [组:${r.major_group_name || 'N/A'}] (代码:${r.college_code})`);
    });

    // 2. 搜索包含"计算"的专业
    const computerResult = await AppDataSource.query(`
      SELECT major_name, major_group_name, college_name
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND major_name LIKE '%计算%'
      LIMIT 20
    `);

    console.log('\n=== 包含"计算"的专业 ===');
    console.log(`找到 ${computerResult.length} 个专业`);
    computerResult.forEach((r: any) => {
      console.log(`  - ${r.college_name}: ${r.major_name}`);
    });

    // 3. 查询colleges表和enrollment_plans表的college_code匹配情况
    const codeCheck = await AppDataSource.query(`
      SELECT
        (SELECT COUNT(DISTINCT college_code) FROM enrollment_plans WHERE year = 2025) as plan_codes,
        (SELECT COUNT(*) FROM colleges WHERE code IS NOT NULL) as college_codes
    `);

    console.log('\n=== code字段匹配情况 ===');
    console.log(`enrollment_plans中不同的college_code数: ${codeCheck[0].plan_codes}`);
    console.log(`colleges表中有code的院校数: ${codeCheck[0].college_codes}`);

    // 4. 尝试通过院校名称匹配
    const nameMatch = await AppDataSource.query(`
      SELECT ep.college_code, ep.college_name, c.province
      FROM enrollment_plans ep
      LEFT JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025
        AND c.province IS NOT NULL
      LIMIT 10
    `);

    console.log('\n=== 通过院校名称匹配结果 ===');
    console.log(`成功匹配的院校数: ${nameMatch.length}`);
    nameMatch.forEach((r: any) => {
      console.log(`  ${r.college_name} (代码:${r.college_code}) -> 省份:${r.province}`);
    });

    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('错误:', error.message);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

checkMajors();
