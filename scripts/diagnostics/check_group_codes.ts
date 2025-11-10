import { AppDataSource } from '../../src/config/database';
import { CoreEnrollmentPlan } from '../../src/models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../../src/models/core/CoreAdmissionScore';

async function checkGroupCodes() {
  console.log('🔍 === 检查专业组代码 ===\n');

  try {
    await AppDataSource.initialize();

    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    const collegeCodes = ['1104', '1103', '1105'];

    for (const code of collegeCodes) {
      console.log(`\n院校代码: ${code}`);

      // 检查招生计划
      const plans = await planRepo.find({
        where: {
          collegeCode: code,
          year: 2025,
          sourceProvince: '江苏',
          subjectType: 'physics'
        },
        take: 5
      });

      console.log(`  2025招生计划: ${plans.length > 0 ? plans.length + '条' : '无'}`);
      if (plans.length > 0) {
        console.log(`    院校名: ${plans[0].collegeName}`);
        console.log(`    专业组代码: "${plans[0].majorGroupCode}"`);
        console.log(`    专业组名称: "${plans[0].majorGroupName}"`);
      }

      // 检查历史分数
      const scores = await scoreRepo.find({
        where: {
          collegeCode: code,
          sourceProvince: '江苏',
          subjectType: 'physics'
        },
        take: 5,
        order: { year: 'DESC' }
      });

      console.log(`  历史分数: ${scores.length > 0 ? scores.length + '条' : '无'}`);
      if (scores.length > 0) {
        console.log(`    最近年份: ${scores[0].year}`);
        console.log(`    专业组代码: "${scores[0].majorGroupCode}"`);
        console.log(`    专业组名称: "${scores[0].majorGroupName}"`);
      }
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkGroupCodes();
