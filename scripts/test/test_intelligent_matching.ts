#!/usr/bin/env ts-node
/**
 * 测试智能匹配修复效果
 *
 * 模拟用户场景：LLM传递 majorCategories: ['自动化类']
 */
import { AppDataSource } from '../../src/config/database';
import { SmartRecommendationService } from '../../src/services/smartRecommendation.service';

async function testIntelligentMatching() {
  console.log('\n🧪 === 测试智能匹配修复效果 ===\n');

  await AppDataSource.initialize();

  const service = new SmartRecommendationService();

  // 用户档案
  const userProfile = {
    score: 638,
    rank: 8837,
    province: '江苏',
    category: '物理类',
    year: 2025
  };

  console.log('用户档案:', userProfile);

  // 测试场景：模拟LLM传递错误的 majorCategories
  console.log('\n📊 === 测试场景: LLM传递 majorCategories: [\'自动化类\'] ===\n');

  const result = await service.getSmartRecommendations(userProfile, {
    locations: ['江苏', '浙江'],
    majorCategories: ['自动化类']  // 模拟LLM的错误输入
  });

  console.log('\n✅ === 测试结果 ===');
  console.log(`总推荐数: ${result.summary.totalCount}个`);
  console.log(`  冲: ${result.summary.rushCount}个`);
  console.log(`  稳: ${result.summary.stableCount}个`);
  console.log(`  保: ${result.summary.safeCount}个`);

  if (result.summary.totalCount > 0) {
    console.log('\n前10个推荐:');
    [...result.rush, ...result.stable, ...result.safe].slice(0, 10).forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.collegeName} - ${g.groupName}`);
      console.log(`      省份: ${g.collegeProvince}, 概率: ${g.probability}%, 分数差: ${g.scoreGap}`);
    });
  }

  await AppDataSource.destroy();

  console.log('\n✅ 测试完成\n');

  // 验证结果
  if (result.summary.totalCount === 0) {
    console.error('❌ 测试失败：返回0个推荐');
    process.exit(1);
  } else if (result.summary.totalCount < 10) {
    console.warn(`⚠️  推荐数量偏少：只有${result.summary.totalCount}个`);
  } else {
    console.log(`🎉 测试成功：返回${result.summary.totalCount}个推荐`);
  }
}

testIntelligentMatching().catch(console.error);
