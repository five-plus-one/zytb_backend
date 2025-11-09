#!/usr/bin/env ts-node
/**
 * 测试修复后的SmartRecommendationService
 *
 * 测试场景：江苏考生（638分，位次8837）想在江苏或浙江学习自动化
 */
import { AppDataSource } from '../../src/config/database';
import { SmartRecommendationService } from '../../src/services/smartRecommendation.service';

async function testSmartRecommendation() {
  console.log('\n🧪 === 测试修复后的SmartRecommendationService ===\n');

  await AppDataSource.initialize();

  const service = new SmartRecommendationService();

  // 用户档案
  const userProfile = {
    score: 638,
    rank: 8837,
    province: '江苏',
    category: 'physics',
    year: 2025  // 修改为2025年
  };

  console.log('用户档案:', userProfile);

  // 测试1: 无偏好（应该返回很多推荐）
  console.log('\n📊 === 测试1: 无偏好过滤 ===');
  const result1 = await service.getSmartRecommendations(userProfile, {});
  console.log(`结果: 总共${result1.summary.totalCount}个推荐`);
  console.log(`  冲: ${result1.summary.rushCount}个`);
  console.log(`  稳: ${result1.summary.stableCount}个`);
  console.log(`  保: ${result1.summary.safeCount}个`);

  // 测试2: 地域偏好（江苏、浙江）
  console.log('\n📊 === 测试2: 地域偏好（江苏、浙江）===');
  const result2 = await service.getSmartRecommendations(userProfile, {
    locations: ['江苏', '浙江']
  });
  console.log(`结果: 总共${result2.summary.totalCount}个推荐`);
  console.log(`  冲: ${result2.summary.rushCount}个`);
  console.log(`  稳: ${result2.summary.stableCount}个`);
  console.log(`  保: ${result2.summary.safeCount}个`);
  console.log('\n前10个院校:');
  result2.stable.slice(0, 10).forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.collegeName} - ${g.groupName} (省份: ${g.collegeProvince}, 概率: ${g.probability}%)`);
  });

  // 测试3: 地域+专业偏好（江苏、浙江 + 自动化）
  console.log('\n📊 === 测试3: 地域+专业偏好（江苏、浙江 + 自动化）===');
  const result3 = await service.getSmartRecommendations(userProfile, {
    locations: ['江苏', '浙江'],
    majors: ['自动化']
  });
  console.log(`结果: 总共${result3.summary.totalCount}个推荐`);
  console.log(`  冲: ${result3.summary.rushCount}个`);
  console.log(`  稳: ${result3.summary.stableCount}个`);
  console.log(`  保: ${result3.summary.safeCount}个`);

  if (result3.summary.totalCount > 0) {
    console.log('\n所有推荐院校:');
    [...result3.rush, ...result3.stable, ...result3.safe].forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.collegeName} - ${g.groupName}`);
      console.log(`      省份: ${g.collegeProvince}, 概率: ${g.probability}%, 分数差: ${g.scoreGap}`);
    });
  }

  await AppDataSource.destroy();

  console.log('\n✅ 测试完成\n');
}

testSmartRecommendation().catch(console.error);
