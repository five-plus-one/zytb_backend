import { AppDataSource } from './src/config/database';
import { AdmissionScore } from './src/models/AdmissionScore';

async function testQuery() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

    // 测试查询: 江苏省, 638分附近的数据
    console.log('\n=== 测试1: 查询江苏省的admission_scores总数 ===');
    const totalCount = await admissionScoreRepo.count({
      where: {
        sourceProvince: '江苏'
      }
    });
    console.log(`江苏省总记录数: ${totalCount}`);

    console.log('\n=== 测试2: 查询江苏省物理类的数据 ===');
    const physicsCount = await admissionScoreRepo.count({
      where: {
        sourceProvince: '江苏',
        subjectType: '物理类'
      }
    });
    console.log(`江苏省物理类记录数: ${physicsCount}`);

    console.log('\n=== 测试3: 查询分数范围558-688的数据 (638±80) ===');
    const scoreRangeData = await admissionScoreRepo
      .createQueryBuilder('score')
      .where('score.sourceProvince = :province', { province: '江苏' })
      .andWhere('score.subjectType = :subjectType', { subjectType: '物理类' })
      .andWhere('score.minScore IS NOT NULL')
      .andWhere('score.minScore >= :minScore', { minScore: 558 })
      .andWhere('score.minScore <= :maxScore', { maxScore: 688 })
      .getCount();
    console.log(`分数范围内记录数: ${scoreRangeData}`);

    console.log('\n=== 测试4: 查询近3年数据 ===');
    const recentYears = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('DISTINCT score.year', 'year')
      .where('score.sourceProvince = :province', { province: '江苏' })
      .orderBy('score.year', 'DESC')
      .getRawMany();
    console.log('数据库中的年份:', recentYears);

    const currentYear = new Date().getFullYear();
    console.log(`当前年份: ${currentYear}, 近3年范围: ${currentYear - 3} ~ ${currentYear}`);

    const recent3YearsCount = await admissionScoreRepo
      .createQueryBuilder('score')
      .where('score.sourceProvince = :province', { province: '江苏' })
      .andWhere('score.subjectType = :subjectType', { subjectType: '物理类' })
      .andWhere('score.year >= :startYear', { startYear: currentYear - 3 })
      .getCount();
    console.log(`近3年记录数: ${recent3YearsCount}`);

    console.log('\n=== 测试5: 查询符合所有条件的数据 (模拟推荐引擎查询) ===');
    const matchingData = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('score.collegeName', 'collegeName')
      .addSelect('score.majorGroup', 'majorGroup')
      .addSelect('MIN(score.minScore)', 'minScore')
      .addSelect('AVG(score.minScore)', 'avgScore')
      .where('score.sourceProvince = :province', { province: '江苏' })
      .andWhere('score.subjectType = :subjectType', { subjectType: '物理类' })
      .andWhere('score.year >= :startYear', { startYear: currentYear - 3 })
      .andWhere('score.minScore IS NOT NULL')
      .andWhere('score.minScore >= :minScore', { minScore: 558 })
      .andWhere('score.minScore <= :maxScore', { maxScore: 688 })
      .groupBy('score.collegeName, score.majorGroup')
      .limit(10)
      .getRawMany();

    console.log(`符合条件的院校+专业组数量: ${matchingData.length}`);
    console.log('前10条数据示例:');
    matchingData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.collegeName} - ${item.majorGroup || '无专业组'} (最低分:${item.minScore}, 平均分:${Math.round(item.avgScore)})`);
    });

    console.log('\n=== 测试6: 检查subjectType字段的所有可能值 ===');
    const subjectTypes = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('DISTINCT score.subjectType', 'subjectType')
      .where('score.sourceProvince = :province', { province: '江苏' })
      .getRawMany();
    console.log('江苏省的科目类型:', subjectTypes);

    await AppDataSource.destroy();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testQuery();
