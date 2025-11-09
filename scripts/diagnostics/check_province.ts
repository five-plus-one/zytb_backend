#!/usr/bin/env ts-node
import { AppDataSource } from '../../src/config/database';

(async () => {
  await AppDataSource.initialize();

  const result = await AppDataSource.query(`
    SELECT college_province, COUNT(*) as cnt
    FROM core_enrollment_plans
    WHERE source_province = '江苏' AND subject_type LIKE '%physics%'
    GROUP BY college_province
    LIMIT 10
  `);

  console.log('college_province值分布:');
  result.forEach((r: any) => {
    console.log(`  ${r.college_province || '(NULL)'}: ${r.cnt}条`);
  });

  await AppDataSource.destroy();
})();
