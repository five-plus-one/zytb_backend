#!/usr/bin/env ts-node
/**
 * 检查当前 subject_type 字段的实际值
 */
import { AppDataSource } from '../../src/config/database';

async function checkSubjectTypes() {
  console.log('\n🔍 === 检查 subject_type 字段当前值 ===\n');

  await AppDataSource.initialize();

  // 检查 core_admission_scores
  const admissionTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as cnt
    FROM core_admission_scores
    GROUP BY subject_type
  `);

  console.log('core_admission_scores:');
  admissionTypes.forEach((row: any) => {
    console.log(`  "${row.subject_type}": ${row.cnt}条`);
  });

  // 检查 core_enrollment_plans
  const planTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as cnt
    FROM core_enrollment_plans
    GROUP BY subject_type
  `);

  console.log('\ncore_enrollment_plans:');
  planTypes.forEach((row: any) => {
    console.log(`  "${row.subject_type}": ${row.cnt}条`);
  });

  // 测试查询 - 使用 physics
  const physicsCount = await AppDataSource.query(`
    SELECT COUNT(*) as cnt
    FROM core_admission_scores
    WHERE subject_type = 'physics'
  `);
  console.log(`\n查询 subject_type='physics': ${physicsCount[0].cnt}条`);

  // 测试查询 - 使用物理
  const chineseCount = await AppDataSource.query(`
    SELECT COUNT(*) as cnt
    FROM core_admission_scores
    WHERE subject_type = '物理'
  `);
  console.log(`查询 subject_type='物理': ${chineseCount[0].cnt}条`);

  await AppDataSource.destroy();

  console.log('\n✅ 检查完成\n');
}

checkSubjectTypes().catch(console.error);
