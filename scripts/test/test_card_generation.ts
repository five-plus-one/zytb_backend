import { AppDataSource } from '../../src/config/database';
import { RecommendationCardService } from '../../src/services/recommendationCard.service';

async function testCardGeneration() {
  console.log('🧪 === 测试卡片生成功能 ===\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const cardService = new RecommendationCardService();

    // 测试用户信息
    const userProfile = {
      score: 638,
      rank: 8837,
      province: '江苏',
      category: '物理类',  // 输入中文科类
      year: 2025
    };

    // 测试专业组ID列表（从之前的日志中获取）
    const groupIds = [
      '1104_',
      '1103_',
      '1105_',
      '1111_',
      '1261_',
      '2208_',
      '1201_',
      '1107_'
    ];

    console.log('用户信息:');
    console.log(`  省份: ${userProfile.province}`);
    console.log(`  科类: ${userProfile.category}`);
    console.log(`  分数: ${userProfile.score}`);
    console.log(`  位次: ${userProfile.rank}`);
    console.log(`  年份: ${userProfile.year}\n`);

    console.log(`测试专业组ID: ${groupIds.join(', ')}\n`);

    // 调用卡片生成服务
    const cards = await cardService.getCardsByIds(groupIds, userProfile);

    console.log(`\n✅ 成功生成 ${cards.length} 个卡片\n`);

    if (cards.length > 0) {
      console.log('前3个卡片示例:');
      cards.slice(0, 3).forEach((card, index) => {
        console.log(`\n${index + 1}. ${card.collegeName} - ${card.groupName}`);
        console.log(`   院校代码: ${card.collegeCode}`);
        console.log(`   专业组代码: ${card.groupCode}`);
        console.log(`   冲稳保: ${card.riskLevel}`);
        console.log(`   录取概率: ${card.probability}%`);
        console.log(`   专业数量: ${card.totalMajors}`);
        console.log(`   历史数据: ${card.historicalData.length} 年`);
      });
    } else {
      console.error('❌ 未生成任何卡片！');
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testCardGeneration();
