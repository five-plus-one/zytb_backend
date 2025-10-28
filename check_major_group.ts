import { AppDataSource } from './src/config/database';
import { AdmissionScore } from './src/models/AdmissionScore';

async function checkMajorGroup() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const repo = AppDataSource.getRepository(AdmissionScore);

    const samples = await repo.createQueryBuilder('s')
      .select('s.collegeName', 'collegeName')
      .addSelect('s.majorGroup', 'majorGroup')
      .where('s.sourceProvince = :prov', { prov: '江苏' })
      .andWhere('s.subjectType = :type', { type: '物理类' })
      .andWhere('s.minScore >= 558 AND s.minScore <= 688')
      .limit(20)
      .getRawMany();

    console.log('=== admission_scores表中的专业组字段样本 ===\n');
    samples.forEach((s, i) => {
      const mgDisplay = s.majorGroup === null ? '[NULL]' : s.majorGroup === '' ? '[空字符串]' : `"${s.majorGroup}"`;
      console.log(`${i+1}. 院校: ${s.collegeName}`);
      console.log(`   专业组: ${mgDisplay}`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkMajorGroup();
