#!/usr/bin/env ts-node
/**
 * 规范化 subject_type 字段
 * 将中文转换为英文标识符
 */
import { AppDataSource } from '../../src/config/database';

async function normalizeSubjectTypes() {
  console.log('\n🔧 === 规范化 subject_type 字段 ===\n');

  await AppDataSource.initialize();

  // 1. 检查当前的 subject_type 值
  console.log('📊 检查当前数据...');

  const admissionTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as cnt
    FROM core_admission_scores
    GROUP BY subject_type
  `);

  console.log('\ncore_admission_scores 中的 subject_type:');
  admissionTypes.forEach((row: any) => {
    console.log(`  ${row.subject_type}: ${row.cnt}条`);
  });

  const planTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as cnt
    FROM core_enrollment_plans
    GROUP BY subject_type
  `);

  console.log('\ncore_enrollment_plans 中的 subject_type:');
  planTypes.forEach((row: any) => {
    console.log(`  ${row.subject_type}: ${row.cnt}条`);
  });

  // 2. 创建映射规则
  const mappings = [
    { chinese: '物理类', english: 'physics' },
    { chinese: '物理', english: 'physics' },
    { chinese: '历史类', english: 'history' },
    { chinese: '历史', english: 'history' },
    { chinese: '理科', english: 'science' },
    { chinese: '文科', english: 'liberal_arts' }
  ];

  console.log('\n🔄 开始规范化...\n');

  // 3. 更新 core_admission_scores
  for (const mapping of mappings) {
    const result = await AppDataSource.query(`
      UPDATE core_admission_scores
      SET subject_type = ?
      WHERE subject_type = ?
    `, [mapping.english, mapping.chinese]);

    if (result.affectedRows > 0) {
      console.log(`✅ core_admission_scores: "${mapping.chinese}" → "${mapping.english}" (${result.affectedRows}行)`);
    }
  }

  // 4. 更新 core_enrollment_plans
  for (const mapping of mappings) {
    const result = await AppDataSource.query(`
      UPDATE core_enrollment_plans
      SET subject_type = ?
      WHERE subject_type = ?
    `, [mapping.english, mapping.chinese]);

    if (result.affectedRows > 0) {
      console.log(`✅ core_enrollment_plans: "${mapping.chinese}" → "${mapping.english}" (${result.affectedRows}行)`);
    }
  }

  // 5. 验证结果
  console.log('\n\n📊 规范化后的数据:\n');

  const newAdmissionTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as cnt
    FROM core_admission_scores
    GROUP BY subject_type
  `);

  console.log('core_admission_scores:');
  newAdmissionTypes.forEach((row: any) => {
    console.log(`  ${row.subject_type}: ${row.cnt}条`);
  });

  const newPlanTypes = await AppDataSource.query(`
    SELECT DISTINCT subject_type, COUNT(*) as cnt
    FROM core_enrollment_plans
    GROUP BY subject_type
  `);

  console.log('\ncore_enrollment_plans:');
  newPlanTypes.forEach((row: any) => {
    console.log(`  ${row.subject_type}: ${row.cnt}条`);
  });

  await AppDataSource.destroy();

  console.log('\n✅ 规范化完成!\n');
}

normalizeSubjectTypes().catch(console.error);
