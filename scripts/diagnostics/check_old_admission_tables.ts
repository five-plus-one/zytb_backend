import { AppDataSource } from '../../src/config/database';

async function checkOldTables() {
  console.log('🔍 === 检查旧表结构 ===\n');

  try {
    await AppDataSource.initialize();

    // 获取所有表
    const tables = await AppDataSource.query(`SHOW TABLES LIKE '%admission%'`);
    console.log('包含 admission 的表:');
    tables.forEach((t: any) => {
      console.log(`  - ${Object.values(t)[0]}`);
    });

    // 检查 admission_scores 表结构
    console.log('\n\n=== admission_scores 表结构 ===');
    const columns = await AppDataSource.query(`DESCRIBE admission_scores`);
    console.log('字段列表:');
    columns.forEach((col: any) => {
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 检查是否有 code 相关字段
    console.log('\n\n=== 查找 code 相关字段 ===');
    const codeFields = columns.filter((col: any) =>
      col.Field.toLowerCase().includes('code')
    );
    console.log('Code 相关字段:');
    codeFields.forEach((col: any) => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    // 检查样例数据
    console.log('\n\n=== admission_scores 样例数据 ===');
    const samples = await AppDataSource.query(`
      SELECT * FROM admission_scores
      WHERE source_province = '江苏'
      LIMIT 3
    `);

    if (samples.length > 0) {
      console.log('字段:', Object.keys(samples[0]).join(', '));
      samples.forEach((s: any, i: number) => {
        console.log(`\n样例 ${i + 1}:`);
        console.log(`  college_name: ${s.college_name}`);
        console.log(`  year: ${s.year}`);
        // 打印所有包含 code 的字段
        Object.keys(s).filter(k => k.includes('code')).forEach(k => {
          console.log(`  ${k}: ${s[k]}`);
        });
      });
    } else {
      console.log('无数据');
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkOldTables();
