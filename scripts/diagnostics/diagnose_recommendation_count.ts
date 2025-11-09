#!/usr/bin/env ts-node
/**
 * 诊断推荐数量少的问题
 */
import { AppDataSource } from '../../src/config/database';
import { CoreEnrollmentPlan } from '../../src/models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../../src/models/core/CoreAdmissionScore';

async function diagnose() {
  console.log('\n🔍 === 诊断推荐数量问题 ===\n');

  await AppDataSource.initialize();

  const province = '江苏';
  const subjectType = 'physics';
  const userRank = 8837;
  const userScore = 638;

  // 1. 检查总的招生计划数量
  const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
  const totalPlans = await planRepo
    .createQueryBuilder('plan')
    .where('plan.sourceProvince = :province', { province })
    .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${subjectType}%` })
    .andWhere('plan.year >= :year', { year: 2024 })
    .getCount();

  console.log(`1️⃣ 江苏物理类2024年招生计划总数: ${totalPlans}`);

  // 2. 检查包含"自动化"的招生计划
  const autoPlans = await planRepo
    .createQueryBuilder('plan')
    .where('plan.sourceProvince = :province', { province })
    .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${subjectType}%` })
    .andWhere('plan.year >= :year', { year: 2024 })
    .andWhere('(plan.majorName LIKE :auto OR plan.majorGroupName LIKE :auto)', {
      auto: '%自动化%'
    })
    .getCount();

  console.log(`2️⃣ 包含"自动化"的招生计划数: ${autoPlans}`);

  // 3. 检查位次范围内的录取分数记录
  const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

  // 中分段策略: 50%范围
  const rankRange = {
    min: Math.max(1, Math.round(userRank - userRank * 0.5)),
    max: Math.round(userRank + userRank * 0.5)
  };

  console.log(`3️⃣ 位次范围: ${rankRange.min} - ${rankRange.max}`);

  const scoresInRange = await scoreRepo
    .createQueryBuilder('score')
    .where('score.sourceProvince = :province', { province })
    .andWhere('score.subjectType = :subjectType', { subjectType })
    .andWhere('score.minRank IS NOT NULL')
    .andWhere('score.minRank >= :minRank', { minRank: rankRange.min })
    .andWhere('score.minRank <= :maxRank', { maxRank: rankRange.max })
    .getCount();

  console.log(`4️⃣ 位次范围内的录取分数记录数: ${scoresInRange}`);

  // 4. 检查不同院校的数量
  const distinctColleges = await scoreRepo
    .createQueryBuilder('score')
    .select('DISTINCT score.collegeName', 'collegeName')
    .where('score.sourceProvince = :province', { province })
    .andWhere('score.subjectType = :subjectType', { subjectType })
    .andWhere('score.minRank IS NOT NULL')
    .andWhere('score.minRank >= :minRank', { minRank: rankRange.min })
    .andWhere('score.minRank <= :maxRank', { maxRank: rankRange.max })
    .getRawMany();

  console.log(`5️⃣ 位次范围内不同院校数量: ${distinctColleges.length}`);

  // 5. 检查浙江或江苏的院校
  const jiangsuZhejiangPlans = await planRepo
    .createQueryBuilder('plan')
    .where('plan.sourceProvince = :province', { province })
    .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${subjectType}%` })
    .andWhere('plan.year >= :year', { year: 2024 })
    .andWhere('(plan.collegeProvince = :prov1 OR plan.collegeProvince = :prov2)', {
      prov1: '江苏',
      prov2: '浙江'
    })
    .getCount();

  console.log(`6️⃣ 江苏或浙江省内院校的招生计划数: ${jiangsuZhejiangPlans}`);

  // 6. 检查同时满足地域+专业的计划
  const matchingPlans = await planRepo
    .createQueryBuilder('plan')
    .where('plan.sourceProvince = :province', { province })
    .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${subjectType}%` })
    .andWhere('plan.year >= :year', { year: 2024 })
    .andWhere('(plan.collegeProvince = :prov1 OR plan.collegeProvince = :prov2)', {
      prov1: '江苏',
      prov2: '浙江'
    })
    .andWhere('(plan.majorName LIKE :auto OR plan.majorGroupName LIKE :auto)', {
      auto: '%自动化%'
    })
    .getCount();

  console.log(`7️⃣ 同时满足地域(江苏/浙江)+专业(自动化)的计划数: ${matchingPlans}`);

  // 7. 查看具体有哪些院校
  const matchingColleges = await planRepo
    .createQueryBuilder('plan')
    .select('DISTINCT plan.collegeName', 'collegeName')
    .addSelect('plan.collegeProvince', 'province')
    .where('plan.sourceProvince = :province', { province })
    .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${subjectType}%` })
    .andWhere('plan.year >= :year', { year: 2024 })
    .andWhere('(plan.collegeProvince = :prov1 OR plan.collegeProvince = :prov2)', {
      prov1: '江苏',
      prov2: '浙江'
    })
    .andWhere('(plan.majorName LIKE :auto OR plan.majorGroupName LIKE :auto)', {
      auto: '%自动化%'
    })
    .getRawMany();

  console.log(`\n8️⃣ 符合条件的院校列表 (前20个):`);
  matchingColleges.slice(0, 20).forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.collegeName} (${c.province})`);
  });

  await AppDataSource.destroy();

  console.log('\n✅ 诊断完成\n');
}

diagnose().catch(console.error);
