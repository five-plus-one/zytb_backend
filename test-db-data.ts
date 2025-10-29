/**
 * 测试数据库数据脚本
 * 用于检查colleges、enrollment_plans、admission_scores等表的数据情况
 */

import { AppDataSource } from './src/config/database';
import { College } from './src/models/College';
import { EnrollmentPlan } from './src/models/EnrollmentPlan';
import { AdmissionScore } from './src/models/AdmissionScore';
import { ScoreRanking } from './src/models/ScoreRanking';

async function testDatabaseData() {
  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const collegeRepo = AppDataSource.getRepository(College);
    const planRepo = AppDataSource.getRepository(EnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(AdmissionScore);
    const rankingRepo = AppDataSource.getRepository(ScoreRanking);

    // 1. 检查江苏省院校数据
    console.log('=== 1. 检查江苏省院校数据 ===');
    const jiangsuColleges = await collegeRepo
      .createQueryBuilder('c')
      .where('c.province = :province', { province: '江苏' })
      .andWhere('c.code IS NOT NULL')
      .select(['c.code', 'c.name', 'c.province', 'c.city'])
      .limit(10)
      .getMany();

    console.log(`江苏省院校总数: ${jiangsuColleges.length}`);
    if (jiangsuColleges.length > 0) {
      console.log('前10所院校:');
      jiangsuColleges.forEach(c => {
        console.log(`  - ${c.name} (代码: ${c.code})`);
      });
    } else {
      console.log('⚠️ 警告：没有找到江苏省院校数据！');
    }

    const allCollegesCount = await collegeRepo.count();
    const collegesWithCode = await collegeRepo
      .createQueryBuilder('c')
      .where('c.code IS NOT NULL')
      .getCount();
    console.log(`总院校数: ${allCollegesCount}, 有代码的院校数: ${collegesWithCode}\n`);

    // 2. 检查招生计划数据
    console.log('=== 2. 检查招生计划数据 ===');
    const plans2025 = await planRepo
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year: 2025 })
      .andWhere('ep.sourceProvince = :province', { province: '江苏' })
      .andWhere('ep.subjectType = :subjectType', { subjectType: '物理类' })
      .getCount();

    console.log(`2025年江苏物理类招生计划数: ${plans2025}`);

    if (plans2025 > 0) {
      // 查看计算机相关专业
      const computerPlans = await planRepo
        .createQueryBuilder('ep')
        .where('ep.year = :year', { year: 2025 })
        .andWhere('ep.sourceProvince = :province', { province: '江苏' })
        .andWhere('ep.subjectType = :subjectType', { subjectType: '物理类' })
        .andWhere('(ep.majorName LIKE :keyword OR ep.majorGroupName LIKE :keyword)', {
          keyword: '%计算机%'
        })
        .select(['ep.collegeName', 'ep.majorName', 'ep.majorGroupName'])
        .limit(10)
        .getMany();

      console.log(`计算机相关专业数: ${computerPlans.length}`);
      if (computerPlans.length > 0) {
        console.log('前10个计算机专业:');
        computerPlans.forEach(p => {
          console.log(`  - ${p.collegeName}: ${p.majorName}`);
        });
      }
    } else {
      console.log('⚠️ 警告：没有找到2025年江苏物理类招生计划数据！');
    }
    console.log('');

    // 3. 检查录取分数数据
    console.log('=== 3. 检查录取分数数据 ===');
    const scores2024 = await scoreRepo
      .createQueryBuilder('as')
      .where('as.year = :year', { year: 2024 })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.subjectType = :subjectType', { subjectType: '物理类' })
      .getCount();

    console.log(`2024年江苏物理类录取分数数据: ${scores2024}`);

    if (scores2024 > 0) {
      const sampleScores = await scoreRepo
        .createQueryBuilder('as')
        .where('as.year = :year', { year: 2024 })
        .andWhere('as.sourceProvince = :province', { province: '江苏' })
        .andWhere('as.subjectType = :subjectType', { subjectType: '物理类' })
        .select(['as.collegeName', 'as.majorName', 'as.minScore', 'as.minRank'])
        .orderBy('as.minScore', 'DESC')
        .limit(10)
        .getMany();

      console.log('前10个最高分专业:');
      sampleScores.forEach(s => {
        console.log(`  - ${s.collegeName} ${s.majorName}: ${s.minScore}分 (位次${s.minRank})`);
      });
    } else {
      console.log('⚠️ 警告：没有找到2024年江苏物理类录取分数数据！');
    }
    console.log('');

    // 4. 检查位次数据
    console.log('=== 4. 检查位次数据 ===');
    const rankings2025 = await rankingRepo
      .createQueryBuilder('sr')
      .where('sr.year = :year', { year: 2025 })
      .andWhere('sr.province = :province', { province: '江苏' })
      .andWhere('sr.subjectType = :subjectType', { subjectType: '物理类' })
      .getCount();

    console.log(`2025年江苏物理类位次数据: ${rankings2025}`);

    if (rankings2025 > 0) {
      // 查询590分附近的位次
      const ranking590 = await rankingRepo
        .createQueryBuilder('sr')
        .where('sr.year = :year', { year: 2025 })
        .andWhere('sr.province = :province', { province: '江苏' })
        .andWhere('sr.subjectType = :subjectType', { subjectType: '物理类' })
        .andWhere('sr.score <= :score', { score: 590 })
        .orderBy('sr.score', 'DESC')
        .limit(1)
        .getOne();

      if (ranking590) {
        console.log(`590分对应位次: ${ranking590.rank || ranking590.cumulativeCount}`);
      } else {
        console.log('⚠️ 未找到590分的位次数据');
      }
    } else {
      console.log('⚠️ 警告：没有找到2025年江苏物理类位次数据！');
    }
    console.log('');

    // 5. 测试实际筛选逻辑
    console.log('=== 5. 测试实际筛选逻辑（模拟filter_majors） ===');

    // 先查询江苏省院校代码
    const jiangsuCollegeCodes = await collegeRepo
      .createQueryBuilder('c')
      .select('c.code')
      .where('c.province = :province', { province: '江苏' })
      .andWhere('c.code IS NOT NULL')
      .getMany();

    const collegeCodes = jiangsuCollegeCodes.map(c => c.code).filter(code => code);
    console.log(`江苏省院校代码数量: ${collegeCodes.length}`);

    if (collegeCodes.length > 0) {
      // 按院校代码筛选招生计划
      const filteredPlans = await planRepo
        .createQueryBuilder('ep')
        .where('ep.year = :year', { year: 2025 })
        .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince: '江苏' })
        .andWhere('ep.subjectType = :subjectType', { subjectType: '物理类' })
        .andWhere('ep.collegeCode IN (:...collegeCodes)', { collegeCodes })
        .andWhere('(ep.majorName LIKE :keyword OR ep.majorGroupName LIKE :keyword)', {
          keyword: '%计算机%'
        })
        .limit(10)
        .getMany();

      console.log(`按省内院校筛选后的计算机专业数: ${filteredPlans.length}`);

      if (filteredPlans.length > 0) {
        console.log('前10个专业:');
        filteredPlans.forEach(p => {
          console.log(`  - ${p.collegeName} (${p.collegeCode}): ${p.majorName}`);
        });
      }
    }

    console.log('\n✅ 测试完成');
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// 运行测试
testDatabaseData();
