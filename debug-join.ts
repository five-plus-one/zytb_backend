import { AppDataSource } from './src/config/database';

async function debugJoinQuery() {
  try {
    await AppDataSource.initialize();

    console.log('=== 调试JOIN查询返回0的问题 ===\n');

    // 1. 检查colleges表中江苏省院校
    const [jsCount] = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM colleges WHERE province = '江苏'
    `);
    console.log(`1. colleges表中江苏省院校数: ${jsCount.count}`);

    // 2. 检查能匹配上的江苏院校
    const [matchedCount] = await AppDataSource.query(`
      SELECT COUNT(DISTINCT ep.college_name) as count
      FROM enrollment_plans ep
      INNER JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025 AND c.province = '江苏'
    `);
    console.log(`2. enrollment_plans中能匹配到colleges江苏省的院校数: ${matchedCount.count}`);

    // 3. 查看样例
    const samples = await AppDataSource.query(`
      SELECT ep.college_name, ep.major_name, c.province, c.city
      FROM enrollment_plans ep
      INNER JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025 AND c.province = '江苏'
      LIMIT 10
    `);

    console.log(`3. 样例数据（前10条）:`)
    samples.forEach((s: any) => {
      console.log(`   ${s.college_name} (${s.province}-${s.city}): ${s.major_name}`);
    });

    // 4. 检查物理类的数据
    const [physicsCount] = await AppDataSource.query(`
      SELECT COUNT(*) as count
      FROM enrollment_plans ep
      INNER JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025
        AND ep.source_province = '江苏'
        AND ep.subject_type = '物理类'
        AND c.province = '江苏'
    `);
    console.log(`\\n4. 江苏物理类+江苏省内院校的专业数: ${physicsCount.count}`);

    // 5. 不加c.province条件试试
    const [noProvinceFilterCount] = await AppDataSource.query(`
      SELECT COUNT(*) as count
      FROM enrollment_plans ep
      INNER JOIN colleges c ON ep.college_name = c.name
      WHERE ep.year = 2025
        AND ep.source_province = '江苏'
        AND ep.subject_type = '物理类'
    `);
    console.log(`5. 江苏物理类（不限院校省份）的专业数: ${noProvinceFilterCount.count}`);

    //6. 查看具体的江苏院校在两个表中的数据
    console.log(`\\n6. 检查具体院校数据:`);
    const jiangsuCollege = await AppDataSource.query(`
      SELECT name, province FROM colleges WHERE name LIKE '%江苏%' LIMIT 5
    `);
    console.log('colleges表中的江苏相关院校:');
    jiangsuCollege.forEach((c: any) => console.log(`   ${c.name} -> ${c.province}`));

    const jiangsuPlan = await AppDataSource.query(`
      SELECT DISTINCT college_name FROM enrollment_plans
      WHERE year = 2025 AND college_name LIKE '%江苏%' LIMIT 5
    `);
    console.log('\\nenrollment_plans表中的江苏相关院校:');
    jiangsuPlan.forEach((p: any) => console.log(`   ${p.college_name}`));

    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('错误:', error.message);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

debugJoinQuery();
