import { AppDataSource } from './src/config/database';
import { AgentSession } from './src/models/AgentSession';
import { NewRecommendationEngine } from './src/services/agent/recommendation_new.service';

async function testRecommendationEngine() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 创建推荐引擎实例
    const engine = new NewRecommendationEngine();

    // 模拟用户偏好
    const userPrefs = {
      decisionWeights: {
        college: 33,
        major: 34,
        city: 33,
        employment: 50,
        furtherStudy: 50,
        interest: 50,
        prospect: 50
      },
      province: '江苏',
      examScore: 638,
      scoreRank: 10000,
      subjectType: '物理类',
      preferences: []
    };

    console.log('🎯 开始测试推荐引擎');
    console.log(`📊 用户信息: ${userPrefs.province} ${userPrefs.examScore}分 ${userPrefs.subjectType}`);
    console.log('');

    // 调用推荐引擎
    const startTime = Date.now();
    const recommendations = await engine.generateRecommendations(userPrefs, 40);
    const endTime = Date.now();

    console.log('');
    console.log('='.repeat(80));
    console.log(`✅ 推荐生成完成! 耗时: ${endTime - startTime}ms`);
    console.log(`📊 生成了 ${recommendations.length} 条推荐`);
    console.log('='.repeat(80));
    console.log('');

    if (recommendations.length > 0) {
      console.log('📋 前10条推荐详情:');
      console.log('');
      recommendations.slice(0, 10).forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec.collegeName} - ${rec.majorGroupName || '无专业组'}`);
        console.log(`   专业组代码: ${rec.majorGroupCode || '无'}`);
        console.log(`   总分: ${rec.totalScore.toFixed(2)}`);
        console.log(`   历史最低分: ${rec.historicalMinScore || '无数据'}`);
        console.log(`   历史平均分: ${rec.historicalAvgScore ? rec.historicalAvgScore.toFixed(1) : '无数据'}`);
        console.log(`   录取概率: ${rec.admissionProbability}`);
        console.log(`   分类: ${rec.scoreCategory}`);
        console.log(`   专业数: ${rec.majorsInGroup.length}`);
        if (rec.majorsInGroup.length > 0) {
          console.log(`   专业列表: ${rec.majorsInGroup.slice(0, 3).join(', ')}${rec.majorsInGroup.length > 3 ? '...' : ''}`);
        }
        console.log('');
      });

      console.log('📊 推荐统计:');
      const bold = recommendations.filter(r => r.scoreCategory === 'bold').length;
      const moderate = recommendations.filter(r => r.scoreCategory === 'moderate').length;
      const stable = recommendations.filter(r => r.scoreCategory === 'stable').length;
      console.log(`   冲刺型 (bold): ${bold} 条`);
      console.log(`   适中型 (moderate): ${moderate} 条`);
      console.log(`   稳妥型 (stable): ${stable} 条`);
    } else {
      console.log('❌ 没有生成任何推荐，请检查数据库数据！');
    }

    await AppDataSource.destroy();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testRecommendationEngine();
