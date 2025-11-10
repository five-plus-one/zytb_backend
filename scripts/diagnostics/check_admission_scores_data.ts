import { AppDataSource } from '../../src/config/database';
import { CoreAdmissionScore } from '../../src/models/core/CoreAdmissionScore';

async function checkAdmissionScoresData() {
  console.log('🔍 === 检查 core_admission_scores 表数据 ===\n');

  try {
    await AppDataSource.initialize();

    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    // 1. 检查总记录数
    const totalCount = await scoreRepo.count();
    console.log(`总记录数: ${totalCount}\n`);

    // 2. 检查江苏的记录
    const jiangsuCount = await scoreRepo.count({
      where: { sourceProvince: '江苏' }
    });
    console.log(`江苏省记录数: ${jiangsuCount}`);

    // 3. 检查江苏+physics的记录
    const jiangsuPhysicsCount = await scoreRepo.count({
      where: { sourceProvince: '江苏', subjectType: 'physics' }
    });
    console.log(`江苏+physics记录数: ${jiangsuPhysicsCount}`);

    // 4. 检查 college_code 字段
    const scoresWithCode = await scoreRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(s.collegeCode)', 'withCode')
      .getRawOne();

    console.log(`\ncollegeCode 字段统计:`);
    console.log(`  总记录: ${scoresWithCode.total}`);
    console.log(`  有 collegeCode: ${scoresWithCode.withCode}`);
    console.log(`  缺失 collegeCode: ${scoresWithCode.total - scoresWithCode.withCode}`);

    // 5. 检查 major_group_code 字段
    const groupCodeStats = await scoreRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(s.majorGroupCode)', 'withGroupCode')
      .getRawOne();

    console.log(`\nmajorGroupCode 字段统计:`);
    console.log(`  总记录: ${groupCodeStats.total}`);
    console.log(`  有 majorGroupCode: ${groupCodeStats.withGroupCode}`);
    console.log(`  缺失 majorGroupCode: ${groupCodeStats.total - groupCodeStats.withGroupCode}`);

    // 6. 查看江苏的样例数据
    const jiangsuSamples = await scoreRepo.find({
      where: { sourceProvince: '江苏' },
      take: 5,
      order: { year: 'DESC' }
    });

    console.log(`\n江苏省样例数据 (前5条):`);
    jiangsuSamples.forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.collegeName}`);
      console.log(`   year: ${s.year}`);
      console.log(`   subjectType: ${s.subjectType}`);
      console.log(`   collegeCode: ${s.collegeCode || 'NULL'}`);
      console.log(`   majorGroupCode: ${s.majorGroupCode || 'NULL'}`);
      console.log(`   minScore: ${s.minScore}`);
    });

    // 7. 检查有 collegeCode 的江苏样例
    const jiangsuWithCode = await scoreRepo.find({
      where: { sourceProvince: '江苏' },
      take: 5,
      order: { year: 'DESC' }
    });

    const hasCodeSamples = jiangsuWithCode.filter(s => s.collegeCode);
    console.log(`\n\n有 collegeCode 的江苏样例 (${hasCodeSamples.length}条):`);
    hasCodeSamples.slice(0, 3).forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.collegeName}`);
      console.log(`   collegeCode: ${s.collegeCode}`);
      console.log(`   majorGroupCode: ${s.majorGroupCode || 'NULL'}`);
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkAdmissionScoresData();
