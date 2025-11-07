import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';

async function checkAvailableData() {
  console.log('🔍 检查数据库中实际有哪些数据...\n');

  try {
    await AppDataSource.initialize();

    // 检查有哪些省份
    const provinces = await AppDataSource.query(`
      SELECT DISTINCT source_province, COUNT(*) as count
      FROM enrollment_plans
      GROUP BY source_province
      ORDER BY count DESC
    `);

    console.log('📍 数据库中的省份分布:');
    provinces.forEach((p: any) => {
      console.log(`   ${p.source_province}: ${p.count} 条`);
    });
    console.log('');

    // 检查有哪些科类
    const categories = await AppDataSource.query(`
      SELECT DISTINCT subject_type, COUNT(*) as count
      FROM enrollment_plans
      GROUP BY subject_type
      ORDER BY count DESC
    `);

    console.log('📚 数据库中的科类分布:');
    categories.forEach((c: any) => {
      console.log(`   ${c.subject_type}: ${c.count} 条`);
    });
    console.log('');

    // 检查江苏的科类
    const jsCategories = await AppDataSource.query(`
      SELECT DISTINCT subject_type, COUNT(*) as count
      FROM enrollment_plans
      WHERE source_province = '江苏'
      GROUP BY subject_type
    `);

    console.log('📚 江苏省的科类分布:');
    jsCategories.forEach((c: any) => {
      console.log(`   ${c.subject_type}: ${c.count} 条`);
    });
    console.log('');

    // 随机抽取几条数据看看格式
    const sampleData = await AppDataSource.query(`
      SELECT source_province, subject_type, college_name, major_name
      FROM enrollment_plans
      LIMIT 10
    `);

    console.log('📋 随机抽样（前10条）:');
    sampleData.forEach((row: any, idx: number) => {
      console.log(`   ${idx + 1}. [${row.source_province}] [${row.subject_type}] ${row.college_name} - ${row.major_name}`);
    });

  } catch (error: any) {
    console.error('❌ 检查失败:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

checkAvailableData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
