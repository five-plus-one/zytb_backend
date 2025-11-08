#!/usr/bin/env ts-node
/**
 * 测试多维度加权推荐引擎 V2
 */
import { AppDataSource } from '../../src/config/database';
import { WeightedRecommendationEngine } from '../../src/services/agent/weighted-recommendation-v2.service';
import { AgentPreference } from '../../src/models/AgentPreference';

async function testRecommendationEngine() {
  console.log('\n🧪 === 测试多维度加权推荐引擎 V2 ===\n');

  await AppDataSource.initialize();

  const engine = new WeightedRecommendationEngine();

  // 测试场景1: 高分段学生 (700分/排名126)
  console.log('\n📝 测试场景1: 高分段学生');
  console.log('   分数: 700分');
  console.log('   位次: 126');
  console.log('   省份: 江苏');
  console.log('   科类: 物理');
  console.log('   偏好: 院校>专业>城市 (50:30:20)\n');

  const context1 = {
    userId: 'test-user-1',
    sessionId: 'test-session-1',
    examScore: 700,
    scoreRank: 126,
    province: '江苏',
    subjectType: '物理',
    preferences: [
      {
        indicatorId: 'CORE_01',
        value: JSON.stringify({ college: 50, major: 30, city: 20 })
      } as AgentPreference
    ]
  };

  try {
    const recommendations1 = await engine.generateRecommendations(context1, 60);

    console.log(`\n✅ 测试场景1结果: 获得 ${recommendations1.length} 个推荐`);

    if (recommendations1.length > 0) {
      console.log('\n前10个推荐:');
      recommendations1.slice(0, 10).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.collegeName} - ${r.majorGroupName || '未知专业组'}`);
        console.log(`     总分: ${r.scores.weightedTotal.toFixed(1)} | 录取概率: ${r.admissionProbability.toFixed(0)}% | 风险: ${r.riskLevel}`);
        console.log(`     历史最低分: ${r.historicalMinScore || 'N/A'} | 历史最低位次: ${r.historicalMinRank || 'N/A'}`);
        console.log(`     匹配级别: ${r.dataQuality.matchLevel} | 置信度: ${r.dataQuality.confidenceScore}`);
        console.log('');
      });

      // 统计
      const stats = {
        high: recommendations1.filter(r => r.riskLevel === 'high').length,
        medium: recommendations1.filter(r => r.riskLevel === 'medium').length,
        low: recommendations1.filter(r => r.riskLevel === 'low').length,
        exact: recommendations1.filter(r => r.dataQuality.matchLevel === 'exact').length,
        fuzzy: recommendations1.filter(r => r.dataQuality.matchLevel === 'fuzzy').length,
        fallback: recommendations1.filter(r => r.dataQuality.matchLevel === 'fallback').length,
        has985: recommendations1.filter(r => r.is985).length,
        has211: recommendations1.filter(r => r.is211).length
      };

      console.log('📊 推荐统计:');
      console.log(`   冲刺: ${stats.high} | 稳妥: ${stats.medium} | 保底: ${stats.low}`);
      console.log(`   精确匹配: ${stats.exact} | 模糊匹配: ${stats.fuzzy} | 宽松匹配: ${stats.fallback}`);
      console.log(`   985院校: ${stats.has985} | 211院校: ${stats.has211}`);
    } else {
      console.log('❌ 测试失败: 未获得任何推荐');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  // 测试场景2: 中分段学生 (600分)
  console.log('\n\n📝 测试场景2: 中分段学生');
  console.log('   分数: 600分');
  console.log('   省份: 江苏');
  console.log('   科类: 物理');
  console.log('   偏好: 专业>院校>城市 (50:30:20)\n');

  const context2 = {
    userId: 'test-user-2',
    sessionId: 'test-session-2',
    examScore: 600,
    province: '江苏',
    subjectType: '物理',
    preferences: [
      {
        indicatorId: 'CORE_01',
        value: JSON.stringify({ college: 30, major: 50, city: 20 })
      } as AgentPreference
    ]
  };

  try {
    const recommendations2 = await engine.generateRecommendations(context2, 60);

    console.log(`\n✅ 测试场景2结果: 获得 ${recommendations2.length} 个推荐`);

    if (recommendations2.length > 0) {
      console.log('\n前5个推荐:');
      recommendations2.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.collegeName} - ${r.majorGroupName || '未知专业组'} (总分: ${r.scores.weightedTotal.toFixed(1)})`);
      });
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  await AppDataSource.destroy();

  console.log('\n✅ 测试完成!\n');
}

testRecommendationEngine().catch(console.error);
