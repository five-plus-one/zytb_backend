const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zy_backend',
  entities: [],
  synchronize: false
});

async function checkData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 检查enrollment_plans样本数据
    console.log('=== 1. 检查 enrollment_plans 样本数据 ===');
    const plans = await AppDataSource.query(`
      SELECT id, college_name, major_name, major_code, major_group_name, major_group_code, college_id
      FROM enrollment_plans
      WHERE source_province = '江苏' AND subject_type = '物理' AND year = 2025
      LIMIT 5
    `);
    console.log('样本数据：', JSON.stringify(plans, null, 2));

    // 2. 检查colleges样本数据
    console.log('\n=== 2. 检查 colleges 样本数据 ===');
    const colleges = await AppDataSource.query(`
      SELECT id, name, city, province, is_985, is_211, is_double_first_class, rank
      FROM colleges
      LIMIT 5
    `);
    console.log('样本数据：', JSON.stringify(colleges, null, 2));

    // 3. 检查majors样本数据
    console.log('\n=== 3. 检查 majors 样本数据 ===');
    const majors = await AppDataSource.query(`
      SELECT id, name, code, category, employment_rate, avg_salary
      FROM majors
      LIMIT 5
    `);
    console.log('样本数据：', JSON.stringify(majors, null, 2));

    // 4. 检查名称匹配情况
    console.log('\n=== 4. 检查名称匹配情况 ===');
    const planNames = await AppDataSource.query(`
      SELECT DISTINCT college_name FROM enrollment_plans WHERE source_province = '江苏' LIMIT 10
    `);
    console.log('enrollment_plans中的院校名称：', planNames.map(p => p.college_name));

    const collegeNames = await AppDataSource.query(`
      SELECT name FROM colleges LIMIT 10
    `);
    console.log('colleges表中的院校名称：', collegeNames.map(c => c.name));

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkData();
