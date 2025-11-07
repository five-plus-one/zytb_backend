import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { EnrollmentPlan } from '../src/models/EnrollmentPlan';

async function checkMajorData() {
  console.log('🔍 检查专业数据...\n');

  try {
    await AppDataSource.initialize();

    const planRepo = AppDataSource.getRepository(EnrollmentPlan);

    // 检查1：江苏省物理类的总招生计划数
    const totalCount = await planRepo.count({
      where: {
        sourceProvince: '江苏',
        subjectType: '物理'
      }
    });

    console.log(`📊 江苏省物理类总招生计划数: ${totalCount}\n`);

    // 检查2：文学相关专业
    const literatureQuery = await planRepo.createQueryBuilder('ep')
      .where('ep.sourceProvince = :province', { province: '江苏' })
      .andWhere('ep.subjectType = :category', { category: '物理' })
      .andWhere('(ep.majorName LIKE :major1 OR ep.majorName LIKE :major2 OR ep.majorName LIKE :major3)', {
        major1: '%文学%',
        major2: '%汉语%',
        major3: '%语言%'
      })
      .limit(10)
      .getMany();

    console.log(`📚 文学相关专业（前10条）: ${literatureQuery.length} 条`);
    literatureQuery.slice(0, 5).forEach(plan => {
      console.log(`  - ${plan.collegeName} / ${plan.majorName}`);
    });
    console.log('');

    // 检查3：考古相关专业
    const archaeologyQuery = await planRepo.createQueryBuilder('ep')
      .where('ep.sourceProvince = :province', { province: '江苏' })
      .andWhere('ep.subjectType = :category', { category: '物理' })
      .andWhere('ep.majorName LIKE :major', { major: '%考古%' })
      .limit(10)
      .getMany();

    console.log(`🏺 考古相关专业: ${archaeologyQuery.length} 条`);
    archaeologyQuery.forEach(plan => {
      console.log(`  - ${plan.collegeName} / ${plan.majorName}`);
    });
    console.log('');

    // 检查4：计算机相关专业
    const csQuery = await planRepo.createQueryBuilder('ep')
      .where('ep.sourceProvince = :province', { province: '江苏' })
      .andWhere('ep.subjectType = :category', { category: '物理' })
      .andWhere('(ep.majorName LIKE :major1 OR ep.majorName LIKE :major2)', {
        major1: '%计算机%',
        major2: '%软件%'
      })
      .andWhere('ep.collegeProvince = :collegeProvince', { collegeProvince: '江苏' })
      .limit(10)
      .getMany();

    console.log(`💻 计算机相关专业（江苏省内院校，前10条）: ${csQuery.length} 条`);
    csQuery.forEach(plan => {
      console.log(`  - ${plan.collegeName} / ${plan.majorName} / ${plan.majorGroupName}`);
    });
    console.log('');

    // 检查5：江苏省内院校有多少
    const jsColleges = await planRepo.createQueryBuilder('ep')
      .select('DISTINCT ep.collegeName', 'collegeName')
      .where('ep.sourceProvince = :province', { province: '江苏' })
      .andWhere('ep.subjectType = :category', { category: '物理' })
      .andWhere('ep.collegeProvince = :collegeProvince', { collegeProvince: '江苏' })
      .getRawMany();

    console.log(`🏫 江苏省内院校数量: ${jsColleges.length}`);
    console.log(`   示例: ${jsColleges.slice(0, 5).map(c => c.collegeName).join(', ')}\n`);

  } catch (error: any) {
    console.error('❌ 检查失败:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

checkMajorData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
