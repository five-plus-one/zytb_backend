import { AppDataSource } from './src/config/database';

async function checkSubjectType() {
  await AppDataSource.initialize();

  const result = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as count
    FROM enrollment_plans
    WHERE year = 2025 AND source_province = '江苏'
    GROUP BY subject_type
  `);

  console.log('enrollment_plans表中的subject_type值:');
  result.forEach((r: any) => console.log(`  ${r.subject_type}: ${r.count}条`));

  await AppDataSource.destroy();
}

checkSubjectType();
