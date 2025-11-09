#!/usr/bin/env ts-node
import { AppDataSource } from '../../src/config/database';

async function check() {
  await AppDataSource.initialize();

  const years = await AppDataSource.query(`
    SELECT year, COUNT(*) as cnt
    FROM core_enrollment_plans
    WHERE source_province = '江苏'
    GROUP BY year
    ORDER BY year DESC
  `);

  console.log('\n📊 江苏省 core_enrollment_plans 年份分布:');
  years.forEach((y: any) => console.log(`  ${y.year}年: ${y.cnt} 条记录`));

  await AppDataSource.destroy();
}

check().catch(console.error);
