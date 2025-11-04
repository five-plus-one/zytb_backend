/**
 * 深度诊断历史数据匹配问题
 *
 * 目的：找出所有导致历史数据匹配失败的原因
 */

import { AppDataSource } from '../src/config/database';
import { EnrollmentPlan } from '../src/models/EnrollmentPlan';
import { AdmissionScore } from '../src/models/AdmissionScore';

async function deepDiagnosis() {
  console.log('🔬 开始深度诊断历史数据匹配问题...\n');

  await AppDataSource.initialize();

  const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
  const admissionRepo = AppDataSource.getRepository(AdmissionScore);

  // ===== 第一步：查看实际数据样本（多条） =====
  console.log('📋 第一步：查看数据样本（各10条）\n');

  const enrollmentSamples = await enrollmentRepo
    .createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :province', { province: '江苏' })
    .andWhere('ep.subjectType = :type', { type: '物理类' })
    .limit(10)
    .getMany();

  console.log('【招生计划样本】(2025年江苏物理类)');
  for (let i = 0; i < Math.min(5, enrollmentSamples.length); i++) {
    const ep = enrollmentSamples[i];
    console.log(`  ${i+1}. ${ep.collegeName} (${ep.collegeCode})`);
    console.log(`     专业组代码: "${ep.majorGroupCode}" | 专业组名称: "${ep.majorGroupName}"`);
    console.log(`     专业: ${ep.majorName}`);
  }
  console.log();

  const admissionSamples = await admissionRepo
    .createQueryBuilder('as')
    .where('as.sourceProvince = :province', { province: '江苏' })
    .andWhere('as.subjectType = :type', { type: '物理类' })
    .andWhere('as.year = :year', { year: 2024 })
    .limit(10)
    .getMany();

  console.log('【历史分数样本】(2024年江苏物理类)');
  for (let i = 0; i < Math.min(5, admissionSamples.length); i++) {
    const as = admissionSamples[i];
    console.log(`  ${i+1}. ${as.collegeName} (${as.collegeCode || '无'})`);
    console.log(`     groupCode: "${as.groupCode}" | majorGroup: "${as.majorGroup}"`);
    console.log(`     groupName: "${as.groupName || '无'}"`);
    console.log(`     最低分: ${as.minScore} | 最低位次: ${as.minRank}`);
  }
  console.log();

  // ===== 第二步：分析字段填充率 =====
  console.log('📊 第二步：分析字段填充率\n');

  const enrollmentTotal = await enrollmentRepo.count({ where: { year: 2025, sourceProvince: '江苏', subjectType: '物理类' } });
  const enrollmentWithGroupCode = await enrollmentRepo
    .createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :province', { province: '江苏' })
    .andWhere('ep.subjectType = :type', { type: '物理类' })
    .andWhere('ep.majorGroupCode IS NOT NULL')
    .andWhere("ep.majorGroupCode != ''")
    .getCount();

  console.log(`【招生计划字段填充率】`);
  console.log(`  总数: ${enrollmentTotal}`);
  console.log(`  有 majorGroupCode: ${enrollmentWithGroupCode} (${(enrollmentWithGroupCode/enrollmentTotal*100).toFixed(1)}%)`);
  console.log();

  const admissionTotal = await admissionRepo.count({ where: { sourceProvince: '江苏', subjectType: '物理类', year: 2024 } });
  const admissionWithCollegeCode = await admissionRepo
    .createQueryBuilder('as')
    .where('as.sourceProvince = :province', { province: '江苏' })
    .andWhere('as.subjectType = :type', { type: '物理类' })
    .andWhere('as.year = :year', { year: 2024 })
    .andWhere('as.collegeCode IS NOT NULL')
    .andWhere("as.collegeCode != ''")
    .getCount();

  const admissionWithGroupCode = await admissionRepo
    .createQueryBuilder('as')
    .where('as.sourceProvince = :province', { province: '江苏' })
    .andWhere('as.subjectType = :type', { type: '物理类' })
    .andWhere('as.year = :year', { year: 2024 })
    .andWhere('as.groupCode IS NOT NULL')
    .andWhere("as.groupCode != ''")
    .getCount();

  const admissionWithMajorGroup = await admissionRepo
    .createQueryBuilder('as')
    .where('as.sourceProvince = :province', { province: '江苏' })
    .andWhere('as.subjectType = :type', { type: '物理类' })
    .andWhere('as.year = :year', { year: 2024 })
    .andWhere('as.majorGroup IS NOT NULL')
    .andWhere("as.majorGroup != ''")
    .getCount();

  console.log(`【历史分数字段填充率】`);
  console.log(`  总数: ${admissionTotal}`);
  console.log(`  有 collegeCode: ${admissionWithCollegeCode} (${(admissionWithCollegeCode/admissionTotal*100).toFixed(1)}%)`);
  console.log(`  有 groupCode: ${admissionWithGroupCode} (${(admissionWithGroupCode/admissionTotal*100).toFixed(1)}%)`);
  console.log(`  有 majorGroup: ${admissionWithMajorGroup} (${(admissionWithMajorGroup/admissionTotal*100).toFixed(1)}%)`);
  console.log();

  // ===== 第三步：分析字段格式（重点！） =====
  console.log('🔍 第三步：分析字段格式差异\n');

  // 获取所有不同的groupCode格式
  const enrollmentGroupCodes = await enrollmentRepo
    .createQueryBuilder('ep')
    .select('DISTINCT ep.majorGroupCode', 'code')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :province', { province: '江苏' })
    .andWhere('ep.majorGroupCode IS NOT NULL')
    .andWhere("ep.majorGroupCode != ''")
    .limit(20)
    .getRawMany();

  console.log('【招生计划 majorGroupCode 格式样本】');
  enrollmentGroupCodes.slice(0, 10).forEach((row, i) => {
    console.log(`  ${i+1}. "${row.code}" (长度: ${row.code.length})`);
  });
  console.log();

  const admissionGroupCodes = await admissionRepo
    .createQueryBuilder('as')
    .select('DISTINCT as.groupCode', 'code')
    .where('as.sourceProvince = :province', { province: '江苏' })
    .andWhere('as.year = :year', { year: 2024 })
    .andWhere('as.groupCode IS NOT NULL')
    .andWhere("as.groupCode != ''")
    .limit(20)
    .getRawMany();

  console.log('【历史分数 groupCode 格式样本】');
  admissionGroupCodes.slice(0, 10).forEach((row, i) => {
    console.log(`  ${i+1}. "${row.code}" (长度: ${row.code.length})`);
  });
  console.log();

  const admissionMajorGroups = await admissionRepo
    .createQueryBuilder('as')
    .select('DISTINCT as.majorGroup', 'code')
    .where('as.sourceProvince = :province', { province: '江苏' })
    .andWhere('as.year = :year', { year: 2024 })
    .andWhere('as.majorGroup IS NOT NULL')
    .andWhere("as.majorGroup != ''")
    .limit(20)
    .getRawMany();

  console.log('【历史分数 majorGroup 格式样本】');
  admissionMajorGroups.slice(0, 10).forEach((row, i) => {
    console.log(`  ${i+1}. "${row.code}" (长度: ${row.code.length})`);
  });
  console.log();

  // ===== 第四步：实际匹配测试 =====
  console.log('🧪 第四步：实际匹配测试\n');

  // 随机选5个招生计划，尝试匹配历史数据
  const testPlans = await enrollmentRepo
    .createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :province', { province: '江苏' })
    .andWhere('ep.subjectType = :type', { type: '物理类' })
    .orderBy('RAND()')
    .limit(5)
    .getMany();

  for (const plan of testPlans) {
    console.log(`\n测试: ${plan.collegeName} - ${plan.majorGroupName || '无专业组名称'}`);
    console.log(`  collegeCode: "${plan.collegeCode}" | majorGroupCode: "${plan.majorGroupCode}"`);

    // 尝试多种查询方式
    // 方式1: 精确匹配 collegeCode + groupCode
    const match1 = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeCode = :code', { code: plan.collegeCode })
      .andWhere('as.groupCode = :group', { group: plan.majorGroupCode })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.year < :year', { year: 2025 })
      .getCount();

    console.log(`  方式1 (collegeCode + groupCode精确匹配): ${match1} 条`);

    // 方式2: collegeCode + majorGroup
    const match2 = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeCode = :code', { code: plan.collegeCode })
      .andWhere('as.majorGroup = :group', { group: plan.majorGroupCode })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.year < :year', { year: 2025 })
      .getCount();

    console.log(`  方式2 (collegeCode + majorGroup精确匹配): ${match2} 条`);

    // 方式3: 移除括号后匹配
    const normalized = plan.majorGroupCode?.replace(/[（）\(\)\s]/g, '');
    const match3 = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeCode = :code', { code: plan.collegeCode })
      .andWhere('(REPLACE(REPLACE(REPLACE(REPLACE(as.groupCode, "（", ""), "）", ""), "(", ""), ")", "") = :group OR REPLACE(REPLACE(REPLACE(REPLACE(as.majorGroup, "（", ""), "）", ""), "(", ""), ")", "") = :group)', { group: normalized })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.year < :year', { year: 2025 })
      .getCount();

    console.log(`  方式3 (移除括号后匹配): ${match3} 条`);

    // 方式4: 只按院校匹配
    const match4 = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeCode = :code', { code: plan.collegeCode })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.year < :year', { year: 2025 })
      .getCount();

    console.log(`  方式4 (仅院校级别匹配): ${match4} 条`);

    // 方式5: 按院校名称匹配
    const match5 = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeName = :name', { name: plan.collegeName })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.year < :year', { year: 2025 })
      .getCount();

    console.log(`  方式5 (按院校名称匹配): ${match5} 条`);

    if (match1 === 0 && match2 === 0 && match3 === 0 && match4 === 0 && match5 === 0) {
      console.log(`  ⚠️ 所有方式均无法匹配！`);
    }
  }

  // ===== 第五步：统计可匹配率 =====
  console.log('\n\n📈 第五步：统计可匹配率\n');

  const allEnrollments = await enrollmentRepo.find({
    where: {
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类'
    },
    select: ['collegeCode', 'collegeName', 'majorGroupCode']
  });

  // 去重：按 collegeCode + majorGroupCode 分组
  const uniqueGroups = new Map<string, any>();
  for (const ep of allEnrollments) {
    const key = `${ep.collegeCode}_${ep.majorGroupCode || ''}`;
    if (!uniqueGroups.has(key)) {
      uniqueGroups.set(key, ep);
    }
  }

  console.log(`招生计划去重后专业组数: ${uniqueGroups.size}`);

  let canMatch = 0;
  let cannotMatch = 0;
  const unmatchedSamples: string[] = [];

  for (const [key, ep] of uniqueGroups) {
    // 尝试匹配
    const normalized = ep.majorGroupCode?.replace(/[（）\(\)\s]/g, '') || '';

    const count = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeCode = :code', { code: ep.collegeCode })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.year < :year', { year: 2025 })
      .andWhere(normalized ?
        '(as.groupCode = :group OR as.majorGroup = :group OR REPLACE(REPLACE(REPLACE(REPLACE(as.groupCode, "（", ""), "）", ""), "(", ""), ")", "") = :normalized OR REPLACE(REPLACE(REPLACE(REPLACE(as.majorGroup, "（", ""), "）", ""), "(", ""), ")", "") = :normalized)' :
        '1=1'
      , normalized ? { group: ep.majorGroupCode, normalized } : {})
      .getCount();

    if (count > 0) {
      canMatch++;
    } else {
      cannotMatch++;
      if (unmatchedSamples.length < 10) {
        unmatchedSamples.push(`${ep.collegeName} (${ep.collegeCode}) - ${ep.majorGroupCode}`);
      }
    }
  }

  console.log(`\n可匹配: ${canMatch} (${(canMatch/uniqueGroups.size*100).toFixed(1)}%)`);
  console.log(`无法匹配: ${cannotMatch} (${(cannotMatch/uniqueGroups.size*100).toFixed(1)}%)`);

  if (unmatchedSamples.length > 0) {
    console.log(`\n无法匹配的样本:`);
    unmatchedSamples.forEach((sample, i) => {
      console.log(`  ${i+1}. ${sample}`);
    });
  }

  await AppDataSource.destroy();
  console.log('\n✨ 诊断完成！');
}

deepDiagnosis().catch(error => {
  console.error('❌ 诊断失败:', error);
  process.exit(1);
});
