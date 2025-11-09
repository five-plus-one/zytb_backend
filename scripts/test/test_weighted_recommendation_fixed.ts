#!/usr/bin/env ts-node
/**
 * 测试修复后的推荐引擎
 */
import { AppDataSource } from '../../src/config/database';
import { WeightedRecommendationEngine } from '../../src/services/agent/weighted-recommendation-v2.service';
import { AgentPreference } from '../../src/models/AgentPreference';

async function test() {
  console.log('\n🧪 === 测试修复后的推荐引擎 ===\n');

  await AppDataSource.initialize();

  const engine = new WeightedRecommendationEngine();

  // 模拟用户场景：江苏考生，638分，位次8837，物理类，偏好江苏/浙江的自动化专业
  const context = {
    userId: 'test-user',
    sessionId: 'test-session',
    examScore: 638,
    scoreRank: 8837,
    province: '江苏',
    subjectType: 'physics',
    preferences: [
      {
        indicatorId: 'SEC_08',
        indicatorName: '目标地域',
        value: JSON.stringify(['江苏', '浙江']),
        confidence: 1.0
      } as AgentPreference,
      {
        indicatorId: 'SEC_09',
        indicatorName: '目标专业',
        value: JSON.stringify(['自动化']),
        confidence: 1.0
      } as AgentPreference
    ]
  };

  console.log('用户信息:');
  console.log(`  省份: ${context.province}`);
  console.log(`  科类: ${context.subjectType}`);
  console.log(`  分数: ${context.examScore}`);
  console.log(`  位次: ${context.scoreRank}`);
  console.log(`  偏好地域: 江苏, 浙江`);
  console.log(`  偏好专业: 自动化\n`);

  const startTime = Date.now();

  try {
    const recommendations = await engine.generateRecommendations(context, 60);

    const endTime = Date.now();

    console.log(`\n📊 === 推荐结果统计 ===`);
    console.log(`  推荐数量: ${recommendations.length}`);
    console.log(`  用时: ${endTime - startTime}ms`);

    if (recommendations.length > 0) {
      // 统计风险分布
      const riskStats = recommendations.reduce((acc, r) => {
        acc[r.riskLevel] = (acc[r.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`  风险分布:`);
      console.log(`    冲 (high): ${riskStats.high || 0}`);
      console.log(`    稳 (medium): ${riskStats.medium || 0}`);
      console.log(`    保 (low): ${riskStats.low || 0}`);

      // 显示前10个推荐
      console.log(`\n🎯 === 前10个推荐 ===`);
      recommendations.slice(0, 10).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.collegeName} - ${rec.majors[0]?.majorName || '专业未知'}`);
        console.log(`     省份: ${rec.collegeProvince || '未知'}, 城市: ${rec.collegeCity || '未知'}`);
        console.log(`     风险: ${rec.riskLevel}, 概率: ${rec.admissionProbability}%, 总分: ${rec.scores.weightedTotal.toFixed(1)}`);
      });

      // 验证是否符合偏好
      const matchingRegion = recommendations.filter(r =>
        r.collegeProvince === '江苏' || r.collegeProvince === '浙江'
      );
      const matchingMajor = recommendations.filter(r =>
        r.majors.some(m => m.majorName?.includes('自动化'))
      );

      console.log(`\n✅ === 偏好匹配验证 ===`);
      console.log(`  匹配江苏/浙江: ${matchingRegion.length}/${recommendations.length} (${(matchingRegion.length/recommendations.length*100).toFixed(1)}%)`);
      console.log(`  包含自动化专业: ${matchingMajor.length}/${recommendations.length} (${(matchingMajor.length/recommendations.length*100).toFixed(1)}%)`);

      if (recommendations.length >= 20) {
        console.log(`\n✅ 修复成功! 推荐数量从2个增加到${recommendations.length}个!`);
      } else {
        console.log(`\n⚠️  推荐数量仍然偏少 (${recommendations.length}个)，可能需要进一步调整`);
      }
    } else {
      console.log(`\n❌ 未生成任何推荐!`);
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }

  await AppDataSource.destroy();

  console.log('\n✅ 测试完成\n');
}

test().catch(console.error);
