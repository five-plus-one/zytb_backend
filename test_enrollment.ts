import { AppDataSource } from './src/config/database';
import { EnrollmentPlan } from './src/models/EnrollmentPlan';

async function testEnrollment() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);

    // 测试1: 检查有哪些年份的数据
    console.log('\n=== 测试1: 检查enrollment_plans表中的年份 ===');
    const years = await enrollmentRepo
      .createQueryBuilder('plan')
      .select('DISTINCT plan.year', 'year')
      .orderBy('plan.year', 'DESC')
      .getRawMany();
    console.log('数据库中的年份:', years);

    // 测试2: 检查2025年是否有数据
    const count2025 = await enrollmentRepo.count({
      where: { year: 2025 }
    });
    console.log(`2025年的招生计划数: ${count2025}`);

    // 测试3: 检查2024年是否有数据
    const count2024 = await enrollmentRepo.count({
      where: { year: 2024 }
    });
    console.log(`2024年的招生计划数: ${count2024}`);

    // 测试4: 检查江苏省的数据
    const jiangsuCount = await enrollmentRepo.count({
      where: { sourceProvince: '江苏' }
    });
    console.log(`江苏省的招生计划总数: ${jiangsuCount}`);

    // 测试5: 检查特定院校的招生计划
    const samplePlans = await enrollmentRepo.find({
      where: {
        collegeName: '南京工业大学',
        sourceProvince: '江苏',
        subjectType: '物理类'
      },
      take: 5
    });
    console.log('\n=== 南京工业大学的招生计划示例 ===');
    samplePlans.forEach((plan, idx) => {
      console.log(`${idx + 1}. 年份:${plan.year}, 专业组:${plan.majorGroupCode}, 专业:${plan.majorName}`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testEnrollment();
