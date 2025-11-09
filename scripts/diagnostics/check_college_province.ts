#!/usr/bin/env ts-node
import { AppDataSource } from '../../src/config/database';

async function check() {
  await AppDataSource.initialize();

  const result = await AppDataSource.query(`
    SELECT college_province, COUNT(*) as cnt
    FROM core_enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND major_name LIKE '%自动化%'
    GROUP BY college_province
    ORDER BY cnt DESC
    LIMIT 10
  `);

  console.log('\n2025年江苏考生+自动化专业，院校省份分布:');
  result.forEach((r: any) => {
    console.log(`  ${r.college_province || 'NULL'}: ${r.cnt}条`);
  });

  await AppDataSource.destroy();
}

check().catch(console.error);
