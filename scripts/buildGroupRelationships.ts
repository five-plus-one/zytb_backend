/**
 * 数据预处理：建立专业组关联关系
 *
 * 步骤：
 * 1. 从 enrollment_plans 中提取所有专业组
 * 2. 标准化专业组代码（移除括号）
 * 3. 创建 enrollment_plan_groups 记录
 * 4. 更新 enrollment_plans 的 group_id
 * 5. 匹配并更新 admission_scores 的 group_id
 */

import { AppDataSource } from '../src/config/database';
import { EnrollmentPlan } from '../src/models/EnrollmentPlan';
import { AdmissionScore } from '../src/models/AdmissionScore';
import { EnrollmentPlanGroup } from '../src/models/EnrollmentPlanGroup';

// 标准化专业组代码
function normalizeGroupCode(code: string | undefined | null): string {
  if (!code) return '';
  return code.replace(/[（）\(\)\s]/g, '').trim();
}

async function buildGroupRelationships() {
  console.log('🔗 开始建立专业组关联关系...\n');

  await AppDataSource.initialize();

  const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
  const admissionRepo = AppDataSource.getRepository(AdmissionScore);
  const groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);

  // ===== 第一步：从招生计划中提取专业组 =====
  console.log('📋 第一步：提取专业组信息...');

  const enrollmentPlans = await enrollmentRepo
    .createQueryBuilder('ep')
    .select('ep.sourceProvince')
    .addSelect('ep.subjectType')
    .addSelect('ep.collegeCode')
    .addSelect('ep.collegeName')
    .addSelect('ep.majorGroupCode')
    .addSelect('ep.majorGroupName')
    .where('ep.year = :year', { year: 2025 })
    .groupBy('ep.sourceProvince, ep.subjectType, ep.collegeCode, ep.collegeName, ep.majorGroupCode, ep.majorGroupName')
    .getRawMany();

  console.log(`  找到 ${enrollmentPlans.length} 个专业组`);

  // ===== 第二步：创建专业组记录 =====
  console.log('\n🏗️  第二步：创建专业组记录...');

  const groupMap = new Map<string, string>(); // key: collegeCode_groupCode_province_type, value: groupId
  let createdCount = 0;
  let skippedCount = 0;

  for (const plan of enrollmentPlans) {
    // getRawMany() 返回的字段名是下划线格式
    const groupCode = normalizeGroupCode(plan.ep_major_group_code);
    const sourceProvince = plan.ep_source_province;
    const subjectType = plan.ep_subject_type;
    const collegeCode = plan.ep_college_code;
    const collegeName = plan.ep_college_name;

    // 验证必需字段
    if (!collegeCode || !collegeName || !sourceProvince || !subjectType) {
      console.warn(`  ⚠️ 跳过无效记录: collegeCode=${collegeCode}, collegeName=${collegeName}`);
      continue;
    }

    const uniqueKey = `${collegeCode}_${groupCode}_${sourceProvince}_${subjectType}`;

    // 检查是否已存在
    let existingGroup = await groupRepo.findOne({
      where: {
        collegeCode,
        groupCode,
        sourceProvince,
        subjectType
      }
    });

    if (existingGroup) {
      groupMap.set(uniqueKey, existingGroup.id);
      skippedCount++;
      continue;
    }

    // 创建新的专业组记录
    const newGroup = groupRepo.create({
      collegeCode,
      collegeName,
      groupCode: groupCode || '',  // 确保不为undefined
      groupCodeRaw: plan.ep_major_group_code,
      groupName: plan.ep_major_group_name,
      sourceProvince,
      subjectType
    });

    const savedGroup = await groupRepo.save(newGroup);
    groupMap.set(uniqueKey, savedGroup.id);
    createdCount++;

    if (createdCount % 100 === 0) {
      console.log(`  已创建 ${createdCount} 个专业组...`);
    }
  }

  console.log(`  ✅ 完成：创建 ${createdCount} 个，跳过 ${skippedCount} 个已存在的`);

  // ===== 第三步：更新招生计划的 group_id =====
  console.log('\n🔄 第三步：更新招生计划的 group_id...');

  const allEnrollmentPlans = await enrollmentRepo.find({
    where: { year: 2025 }
  });

  let updatedEnrollmentCount = 0;
  let notFoundEnrollmentCount = 0;

  for (const plan of allEnrollmentPlans) {
    const groupCode = normalizeGroupCode(plan.majorGroupCode);
    const uniqueKey = `${plan.collegeCode}_${groupCode}_${plan.sourceProvince}_${plan.subjectType}`;

    const groupId = groupMap.get(uniqueKey);

    if (groupId) {
      plan.groupId = groupId;
      await enrollmentRepo.save(plan);
      updatedEnrollmentCount++;

      if (updatedEnrollmentCount % 500 === 0) {
        console.log(`  已更新 ${updatedEnrollmentCount} 个招生计划...`);
      }
    } else {
      notFoundEnrollmentCount++;
      if (notFoundEnrollmentCount <= 5) {
        console.warn(`  ⚠️ 未找到专业组: ${plan.collegeName} ${plan.majorGroupCode} (${uniqueKey})`);
      }
    }
  }

  console.log(`  ✅ 完成：更新 ${updatedEnrollmentCount} 个招生计划`);
  if (notFoundEnrollmentCount > 0) {
    console.warn(`  ⚠️ ${notFoundEnrollmentCount} 个招生计划未找到对应的专业组`);
  }

  // ===== 第四步：匹配并更新历史分数的 group_id =====
  console.log('\n🔍 第四步：匹配历史分数数据...');

  const allAdmissionScores = await admissionRepo.find();

  let updatedAdmissionCount = 0;
  let notFoundAdmissionCount = 0;
  const unmatchedSamples: string[] = [];

  for (const score of allAdmissionScores) {
    const normalizedGroupCode = normalizeGroupCode(score.groupCode);
    const normalizedMajorGroup = normalizeGroupCode(score.majorGroup);

    // 尝试多种匹配方式
    let matchedGroupId: string | undefined;

    // 方式1: groupCode 匹配
    if (normalizedGroupCode) {
      const key1 = `${score.collegeCode}_${normalizedGroupCode}_${score.sourceProvince}_${score.subjectType}`;
      matchedGroupId = groupMap.get(key1);
    }

    // 方式2: majorGroup 匹配
    if (!matchedGroupId && normalizedMajorGroup) {
      const key2 = `${score.collegeCode}_${normalizedMajorGroup}_${score.sourceProvince}_${score.subjectType}`;
      matchedGroupId = groupMap.get(key2);
    }

    if (matchedGroupId) {
      score.groupId = matchedGroupId;
      await admissionRepo.save(score);
      updatedAdmissionCount++;

      if (updatedAdmissionCount % 500 === 0) {
        console.log(`  已更新 ${updatedAdmissionCount} 个历史分数记录...`);
      }
    } else {
      notFoundAdmissionCount++;
      if (unmatchedSamples.length < 10) {
        unmatchedSamples.push(
          `${score.collegeName} (${score.collegeCode}) groupCode="${score.groupCode}" majorGroup="${score.majorGroup}"`
        );
      }
    }
  }

  console.log(`  ✅ 完成：更新 ${updatedAdmissionCount} 个历史分数记录`);
  if (notFoundAdmissionCount > 0) {
    console.warn(`  ⚠️ ${notFoundAdmissionCount} 个历史分数记录未找到对应的专业组`);
    if (unmatchedSamples.length > 0) {
      console.warn(`  未匹配样本:`);
      unmatchedSamples.forEach((sample, i) => {
        console.warn(`    ${i + 1}. ${sample}`);
      });
    }
  }

  // ===== 第五步：生成统计报告 =====
  console.log('\n\n📊 最终统计报告：\n');

  const totalGroups = await groupRepo.count();
  const enrollmentWithGroup = await enrollmentRepo
    .createQueryBuilder('ep')
    .where('ep.groupId IS NOT NULL')
    .getCount();
  const enrollmentTotal = await enrollmentRepo.count();
  const admissionWithGroup = await admissionRepo
    .createQueryBuilder('as')
    .where('as.groupId IS NOT NULL')
    .getCount();
  const admissionTotal = await admissionRepo.count();

  console.log(`专业组总数: ${totalGroups}`);
  console.log(`\n招生计划关联情况:`);
  console.log(`  总数: ${enrollmentTotal}`);
  console.log(`  已关联: ${enrollmentWithGroup} (${((enrollmentWithGroup / enrollmentTotal) * 100).toFixed(1)}%)`);
  console.log(`  未关联: ${enrollmentTotal - enrollmentWithGroup} (${(((enrollmentTotal - enrollmentWithGroup) / enrollmentTotal) * 100).toFixed(1)}%)`);

  console.log(`\n历史分数关联情况:`);
  console.log(`  总数: ${admissionTotal}`);
  console.log(`  已关联: ${admissionWithGroup} (${((admissionWithGroup / admissionTotal) * 100).toFixed(1)}%)`);
  console.log(`  未关联: ${admissionTotal - admissionWithGroup} (${(((admissionTotal - admissionWithGroup) / admissionTotal) * 100).toFixed(1)}%)`);

  // ===== 第六步：验证关联效果 =====
  console.log('\n\n🧪 验证关联效果...\n');

  // 随机抽取一个专业组，测试是否能通过JOIN查询到历史数据
  const testGroup = await groupRepo.findOne({
    where: { sourceProvince: '江苏', subjectType: '物理类' },
    relations: ['enrollmentPlans', 'admissionScores']
  });

  if (testGroup) {
    console.log(`测试专业组: ${testGroup.collegeName} - ${testGroup.groupName || testGroup.groupCode}`);
    console.log(`  ID: ${testGroup.id}`);
    console.log(`  关联的招生计划数: ${testGroup.enrollmentPlans?.length || 0}`);
    console.log(`  关联的历史分数记录数: ${testGroup.admissionScores?.length || 0}`);

    if (testGroup.admissionScores && testGroup.admissionScores.length > 0) {
      const latestScore = testGroup.admissionScores[0];
      console.log(`  最新历史数据: ${latestScore.year}年 最低分${latestScore.minScore} 位次${latestScore.minRank}`);
      console.log('  ✅ 关联正常！');
    } else {
      console.warn('  ⚠️ 没有关联到历史数据');
    }
  }

  await AppDataSource.destroy();
  console.log('\n✨ 完成！');
}

buildGroupRelationships().catch(error => {
  console.error('❌ 失败:', error);
  process.exit(1);
});
