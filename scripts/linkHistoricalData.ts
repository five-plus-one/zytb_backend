/**
 * 历史数据关联脚本
 *
 * 目的：建立 enrollment_plans (2025招生计划) 与 admission_scores (历年分数) 的关联关系
 *
 * 问题：
 * - admission_scores 表中可能缺少 collegeCode 或 groupCode
 * - 即使有这些字段，值也可能与 enrollment_plans 不一致
 *
 * 解决方案：
 * 1. 通过院校名称 + 专业组名称进行模糊匹配
 * 2. 将匹配结果更新到 admission_scores 表中
 * 3. 建立索引加速后续查询
 */

import { AppDataSource } from '../src/config/database';
import { EnrollmentPlan } from '../src/models/EnrollmentPlan';
import { AdmissionScore } from '../src/models/AdmissionScore';

async function linkHistoricalData() {
  console.log('🔗 开始关联历史数据...\n');

  await AppDataSource.initialize();

  const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
  const admissionRepo = AppDataSource.getRepository(AdmissionScore);

  // 第一步：统计当前数据情况
  console.log('📊 统计数据情况...');

  const totalEnrollment = await enrollmentRepo.count();
  const totalAdmission = await admissionRepo.count();
  const admissionWithCode = await admissionRepo
    .createQueryBuilder('as')
    .where('as.collegeCode IS NOT NULL')
    .andWhere("as.collegeCode != ''")
    .getCount();
  const admissionWithGroupCode = await admissionRepo
    .createQueryBuilder('as')
    .where('as.groupCode IS NOT NULL')
    .andWhere("as.groupCode != ''")
    .getCount();

  console.log(`  - 招生计划数据: ${totalEnrollment} 条`);
  console.log(`  - 历史分数数据: ${totalAdmission} 条`);
  console.log(`  - 有 collegeCode: ${admissionWithCode} 条 (${(admissionWithCode/totalAdmission*100).toFixed(1)}%)`);
  console.log(`  - 有 groupCode: ${admissionWithGroupCode} 条 (${(admissionWithGroupCode/totalAdmission*100).toFixed(1)}%)`);
  console.log();

  // 第二步：查看数据样本
  console.log('🔍 查看数据样本...');

  const sampleEnrollment = await enrollmentRepo.findOne({
    where: { year: 2025 }
  });
  const sampleAdmission = await admissionRepo.findOne({
    where: { year: 2024 },
    order: { createdAt: 'DESC' }
  });

  console.log('  招生计划样本:');
  if (sampleEnrollment) {
    console.log(`    - 院校: ${sampleEnrollment.collegeName} (${sampleEnrollment.collegeCode})`);
    console.log(`    - 专业组: ${sampleEnrollment.majorGroupName} (${sampleEnrollment.majorGroupCode})`);
  }

  console.log('  历史分数样本:');
  if (sampleAdmission) {
    console.log(`    - 院校: ${sampleAdmission.collegeName} (${sampleAdmission.collegeCode || '无'})`);
    console.log(`    - 专业组: ${sampleAdmission.groupName || '无'} (${sampleAdmission.groupCode || '无'})`);
    console.log(`    - majorGroup字段: ${sampleAdmission.majorGroup || '无'}`);
  }
  console.log();

  // 第三步：建立院校代码映射
  console.log('🏫 建立院校代码映射...');

  const collegeMapping = new Map<string, string>(); // collegeName -> collegeCode
  const enrollmentPlans = await enrollmentRepo.find({
    select: ['collegeName', 'collegeCode'],
    where: { year: 2025 }
  });

  for (const plan of enrollmentPlans) {
    if (plan.collegeCode && plan.collegeName) {
      collegeMapping.set(plan.collegeName, plan.collegeCode);
    }
  }

  console.log(`  - 建立了 ${collegeMapping.size} 个院校的代码映射`);
  console.log();

  // 第四步：更新缺失的 collegeCode
  console.log('🔧 更新缺失的 collegeCode...');

  const admissionsWithoutCode = await admissionRepo
    .createQueryBuilder('as')
    .where('(as.collegeCode IS NULL OR as.collegeCode = "")')
    .andWhere('as.collegeName IS NOT NULL')
    .getMany();

  let updatedCount = 0;
  for (const admission of admissionsWithoutCode) {
    const collegeCode = collegeMapping.get(admission.collegeName);
    if (collegeCode) {
      admission.collegeCode = collegeCode;
      await admissionRepo.save(admission);
      updatedCount++;
    }
  }

  console.log(`  - 更新了 ${updatedCount}/${admissionsWithoutCode.length} 条记录的 collegeCode`);
  console.log();

  // 第五步：建立专业组映射（通过专业组名称）
  console.log('📚 建立专业组映射...');

  const groupMapping = new Map<string, string>(); // collegeName_groupName -> groupCode
  const enrollmentGroups = await enrollmentRepo
    .createQueryBuilder('ep')
    .select('ep.collegeName')
    .addSelect('ep.collegeCode')
    .addSelect('ep.majorGroupName')
    .addSelect('ep.majorGroupCode')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.majorGroupName IS NOT NULL')
    .andWhere('ep.majorGroupCode IS NOT NULL')
    .groupBy('ep.collegeName, ep.collegeCode, ep.majorGroupName, ep.majorGroupCode')
    .getRawMany();

  for (const group of enrollmentGroups) {
    const key = `${group.ep_collegeName}_${group.ep_majorGroupName}`;
    groupMapping.set(key, group.ep_majorGroupCode);
  }

  console.log(`  - 建立了 ${groupMapping.size} 个专业组的代码映射`);
  console.log();

  // 第六步：更新缺失的 groupCode
  console.log('🔧 更新缺失的 groupCode...');

  const admissionsWithoutGroupCode = await admissionRepo
    .createQueryBuilder('as')
    .where('(as.groupCode IS NULL OR as.groupCode = "")')
    .andWhere('as.collegeName IS NOT NULL')
    .andWhere('(as.groupName IS NOT NULL OR as.majorGroup IS NOT NULL)')
    .getMany();

  let groupUpdatedCount = 0;
  for (const admission of admissionsWithoutGroupCode) {
    // 尝试通过 groupName 匹配
    let groupName = admission.groupName || admission.majorGroup;
    if (groupName) {
      const key = `${admission.collegeName}_${groupName}`;
      const groupCode = groupMapping.get(key);

      if (groupCode) {
        admission.groupCode = groupCode;
        // 同时规范化 majorGroup 字段
        if (!admission.majorGroup) {
          admission.majorGroup = groupName;
        }
        await admissionRepo.save(admission);
        groupUpdatedCount++;
      }
    }
  }

  console.log(`  - 更新了 ${groupUpdatedCount}/${admissionsWithoutGroupCode.length} 条记录的 groupCode`);
  console.log();

  // 第七步：生成关联报告
  console.log('📊 生成关联报告...');

  const finalAdmissionWithCode = await admissionRepo
    .createQueryBuilder('as')
    .where('as.collegeCode IS NOT NULL')
    .andWhere("as.collegeCode != ''")
    .getCount();
  const finalAdmissionWithGroupCode = await admissionRepo
    .createQueryBuilder('as')
    .where('as.groupCode IS NOT NULL')
    .andWhere("as.groupCode != ''")
    .getCount();

  console.log('\n✅ 关联完成！\n');
  console.log('关联结果统计:');
  console.log(`  - collegeCode 覆盖率: ${admissionWithCode}/${totalAdmission} → ${finalAdmissionWithCode}/${totalAdmission}`);
  console.log(`    提升: ${finalAdmissionWithCode - admissionWithCode} 条 (+${((finalAdmissionWithCode - admissionWithCode)/totalAdmission*100).toFixed(1)}%)`);
  console.log(`  - groupCode 覆盖率: ${admissionWithGroupCode}/${totalAdmission} → ${finalAdmissionWithGroupCode}/${totalAdmission}`);
  console.log(`    提升: ${finalAdmissionWithGroupCode - admissionWithGroupCode} 条 (+${((finalAdmissionWithGroupCode - admissionWithGroupCode)/totalAdmission*100).toFixed(1)}%)`);
  console.log();

  // 第八步：验证关联效果
  console.log('🧪 验证关联效果...');

  // 随机抽取一个专业组，测试能否查到历史数据
  const testGroup = await enrollmentRepo.findOne({
    where: {
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类'
    }
  });

  if (testGroup) {
    console.log(`  测试专业组: ${testGroup.collegeName} - ${testGroup.majorGroupName}`);
    console.log(`  (代码: ${testGroup.collegeCode}_${testGroup.majorGroupCode})`);

    const historicalData = await admissionRepo
      .createQueryBuilder('as')
      .where('as.collegeCode = :code', { code: testGroup.collegeCode })
      .andWhere('as.sourceProvince = :province', { province: '江苏' })
      .andWhere('as.subjectType = :type', { type: '物理类' })
      .andWhere('as.year < 2025')
      .orderBy('as.year', 'DESC')
      .getMany();

    console.log(`  找到历史数据: ${historicalData.length} 条`);
    if (historicalData.length > 0) {
      const sample = historicalData[0];
      console.log(`    示例: ${sample.year}年 最低分${sample.minScore} 位次${sample.minRank}`);
    }
  }

  await AppDataSource.destroy();
  console.log('\n✨ 完成！');
}

linkHistoricalData().catch(error => {
  console.error('❌ 关联失败:', error);
  process.exit(1);
});
