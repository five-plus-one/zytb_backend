import { AppDataSource } from './src/config/database';
import { EnrollmentPlan } from './src/models/EnrollmentPlan';

async function checkEnrollmentMajorGroup() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const repo = AppDataSource.getRepository(EnrollmentPlan);

    const samples = await repo.find({
      where: {
        collegeName: '南京工业大学',
        sourceProvince: '江苏',
        subjectType: '物理'
      },
      select: ['collegeName', 'majorGroupCode', 'majorGroupName', 'majorName'],
      take: 10
    });

    console.log('=== enrollment_plans中南京工业大学的专业组 ===\n');
    if (samples.length === 0) {
      console.log('❌ 没有找到任何记录！');
    } else {
      samples.forEach((s, i) => {
        console.log(`${i+1}. 院校: ${s.collegeName}`);
        console.log(`   专业组代码: ${s.majorGroupCode || '[NULL]'}`);
        console.log(`   专业组名称: ${s.majorGroupName || '[NULL]'}`);
        console.log(`   专业名称: ${s.majorName}`);
        console.log('');
      });
    }

    await AppDataSource.destroy();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkEnrollmentMajorGroup();
