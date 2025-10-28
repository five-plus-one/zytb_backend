import { AppDataSource } from './src/config/database';
import { AdmissionScore } from './src/models/AdmissionScore';

async function checkScoreDistribution() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

    const userScore = 638;
    const province = '江苏';
    const subjectType = '物理类';

    // 查询分数分布
    const data = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('score.collegeName', 'collegeName')
      .addSelect('score.majorGroup', 'majorGroup')
      .addSelect('MIN(score.minScore)', 'minScore')
      .where('score.sourceProvince = :province', { province })
      .andWhere('score.subjectType = :subjectType', { subjectType })
      .andWhere('score.year >= :startYear', { startYear: new Date().getFullYear() - 3 })
      .andWhere('score.minScore IS NOT NULL')
      .andWhere('score.minScore >= :minScore', { minScore: userScore - 80 })
      .andWhere('score.minScore <= :maxScore', { maxScore: userScore + 50 })
      .groupBy('score.collegeName, score.majorGroup')
      .orderBy('minScore', 'ASC')
      .getRawMany();

    console.log(`📊 总共找到 ${data.length} 个专业组\n`);

    // 统计分数分布
    let below = 0;  // < 638
    let near10 = 0; // [638, 648)
    let near30 = 0; // [648, 668)
    let above = 0;  // >= 668

    data.forEach(d => {
      const diff = userScore - d.minScore;
      if (diff < 0) {
        below++;
      } else if (diff < 10) {
        near10++;
      } else if (diff < 30) {
        near30++;
      } else {
        above++;
      }
    });

    console.log('📋 分数差分布 (用户分数 - 历史最低分):');
    console.log(`   diff < 0 (历史分数线 > 638,冲刺): ${below} 个 (${(below/data.length*100).toFixed(1)}%)`);
    console.log(`   0 <= diff < 10 (历史分数线在628-638): ${near10} 个 (${(near10/data.length*100).toFixed(1)}%)`);
    console.log(`   10 <= diff < 30 (历史分数线在608-628): ${near30} 个 (${(near30/data.length*100).toFixed(1)}%)`);
    console.log(`   diff >= 30 (历史分数线 < 608,保底): ${above} 个 (${(above/data.length*100).toFixed(1)}%)`);

    console.log('\n📋 前20个专业组的分数线:');
    data.slice(0, 20).forEach((d, i) => {
      const diff = userScore - d.minScore;
      console.log(`${i+1}. ${d.collegeName} ${d.majorGroup || ''}: ${d.minScore}分 (差值: ${diff > 0 ? '+' : ''}${diff})`);
    });

    console.log('\n📋 后20个专业组的分数线:');
    data.slice(-20).forEach((d, i) => {
      const diff = userScore - d.minScore;
      console.log(`${i+1}. ${d.collegeName} ${d.majorGroup || ''}: ${d.minScore}分 (差值: ${diff > 0 ? '+' : ''}${diff})`);
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkScoreDistribution();
