import { AppDataSource } from './src/config/database';
import { EnrollmentPlan } from './src/models/EnrollmentPlan';
import { AdmissionScore } from './src/models/AdmissionScore';

async function testCollegeNames() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
    const admissionRepo = AppDataSource.getRepository(AdmissionScore);

    // Test 1: Check college names in admission_scores
    console.log('\n=== admission_scores表中的院校名称示例 (前10个) ===');
    const admissionColleges = await admissionRepo
      .createQueryBuilder('score')
      .select('DISTINCT score.collegeName', 'collegeName')
      .where('score.sourceProvince = :province', { province: '江苏' })
      .orderBy('score.collegeName', 'ASC')
      .limit(10)
      .getRawMany();

    admissionColleges.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.collegeName}`);
    });

    // Test 2: Check college names in enrollment_plans
    console.log('\n=== enrollment_plans表中的院校名称示例 (前10个) ===');
    const enrollmentColleges = await enrollmentRepo
      .createQueryBuilder('plan')
      .select('DISTINCT plan.collegeName', 'collegeName')
      .where('plan.sourceProvince = :province', { province: '江苏' })
      .orderBy('plan.collegeName', 'ASC')
      .limit(10)
      .getRawMany();

    enrollmentColleges.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.collegeName}`);
    });

    // Test 3: Try matching one college name from admission_scores in enrollment_plans
    const sampleCollegeName = admissionColleges[0]?.collegeName;
    if (sampleCollegeName) {
      console.log(`\n=== 测试匹配: ${sampleCollegeName} ===`);

      const matchCount = await enrollmentRepo.count({
        where: {
          collegeName: sampleCollegeName,
          sourceProvince: '江苏',
          subjectType: '物理类'
        }
      });
      console.log(`enrollment_plans中匹配数: ${matchCount}`);
    }

    await AppDataSource.destroy();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

testCollegeNames();
