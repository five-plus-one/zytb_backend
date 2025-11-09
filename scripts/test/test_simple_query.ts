#!/usr/bin/env ts-node
/**
 * 简单测试查询 - 测试基本数据查询
 */
import { AppDataSource } from '../../src/config/database';
import { CoreEnrollmentPlan } from '../../src/models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../../src/models/core/CoreAdmissionScore';

async function testSimpleQuery() {
  console.log('\n🧪 === 测试简单查询 ===\n');

  await AppDataSource.initialize();

  const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
  const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

  // 测试1: 查询江苏physics的招生计划
  console.log('测试1: 查询江苏physics的招生计划');
  const plans = await planRepo
    .createQueryBuilder('plan')
    .where('plan.sourceProvince = :province', { province: '江苏' })
    .andWhere('plan.subjectType LIKE :subjectType', { subjectType: '%physics%' })
    .andWhere('plan.year >= :year', { year: 2024 })
    .limit(5)
    .getMany();

  console.log(`  找到 ${plans.length} 个招生计划`);
  plans.slice(0, 3).forEach(p => {
    console.log(`  - ${p.collegeName} - ${p.majorGroupName || p.majorName} (${p.subjectType})`);
  });

  // 测试2: 查询江苏physics的录取分数
  console.log('\n测试2: 查询江苏physics的录取分数');
  const scores = await scoreRepo
    .createQueryBuilder('score')
    .where('score.sourceProvince = :province', { province: '江苏' })
    .andWhere('score.subjectType = :subjectType', { subjectType: 'physics' })
    .andWhere('score.minRank IS NOT NULL')
    .andWhere('score.minRank >= :minRank', { minRank: 1 })
    .andWhere('score.minRank <= :maxRank', { maxRank: 500 })
    .limit(5)
    .getMany();

  console.log(`  找到 ${scores.length} 个录取分数记录`);
  scores.slice(0, 3).forEach(s => {
    console.log(`  - ${s.collegeName} - ${s.majorGroup || s.majorName}: 最低位次=${s.minRank}, 最低分=${s.minScore}`);
  });

  // 测试3: 查询特定院校（清华大学）
  console.log('\n测试3: 查询清华大学的录取分数');
  const tsinghuaScores = await scoreRepo
    .createQueryBuilder('score')
    .where('score.sourceProvince = :province', { province: '江苏' })
    .andWhere('score.collegeName LIKE :collegeName', { collegeName: '%清华%' })
    .andWhere('score.subjectType = :subjectType', { subjectType: 'physics' })
    .getMany();

  console.log(`  找到 ${tsinghuaScores.length} 条清华大学记录`);
  tsinghuaScores.slice(0, 3).forEach(s => {
    console.log(`  - ${s.collegeName} (${s.year}): 最低位次=${s.minRank}, 最低分=${s.minScore}`);
  });

  // 测试4: 查询南京大学
  console.log('\n测试4: 查询南京大学的录取分数');
  const njuScores = await scoreRepo
    .createQueryBuilder('score')
    .where('score.sourceProvince = :province', { province: '江苏' })
    .andWhere('score.collegeName LIKE :collegeName', { collegeName: '%南京大学%' })
    .andWhere('score.subjectType = :subjectType', { subjectType: 'physics' })
    .getMany();

  console.log(`  找到 ${njuScores.length} 条南京大学记录`);
  njuScores.slice(0, 3).forEach(s => {
    console.log(`  - ${s.collegeName} (${s.year}): 最低位次=${s.minRank}, 最低分=${s.minScore}`);
  });

  await AppDataSource.destroy();

  console.log('\n✅ 测试完成!\n');
}

testSimpleQuery().catch(console.error);
