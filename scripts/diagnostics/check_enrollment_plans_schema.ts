import { AppDataSource } from '../../src/config/database';

async function checkEnrollmentPlansSchema() {
  await AppDataSource.initialize();

  console.log('=== enrollment_plans 表结构 ===\n');
  const cols = await AppDataSource.query('DESCRIBE enrollment_plans');
  cols.forEach((c: any) => console.log(`  ${c.Field.padEnd(30)} ${c.Type}`));

  console.log('\n\n=== 样例数据 ===\n');
  const sample = await AppDataSource.query(`
    SELECT * FROM enrollment_plans WHERE source_province = '江苏' LIMIT 1
  `);

  if (sample[0]) {
    Object.keys(sample[0]).forEach(k => {
      console.log(`  ${k}: ${sample[0][k]}`);
    });
  }

  await AppDataSource.destroy();
  process.exit(0);
}

checkEnrollmentPlansSchema();
