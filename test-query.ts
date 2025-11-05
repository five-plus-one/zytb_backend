import { AppDataSource } from './src/config/database';
import { EnrollmentPlan } from './src/models/EnrollmentPlan';

async function test() {
  await AppDataSource.initialize();
  console.log('✅ 数据库连接成功');

  const repo = AppDataSource.getRepository(EnrollmentPlan);

  // 测试1: 查询所有2025年数据
  const count1 = await repo.createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .getCount();
  console.log('2025年总数据:', count1);

  // 测试2: 查询江苏省数据
  const count2 = await repo.createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :province', { province: '江苏' })
    .getCount();
  console.log('2025年江苏省数据:', count2);

  // 测试3: 获取几条数据看看
  const plans = await repo.createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :province', { province: '江苏' })
    .limit(2)
    .getMany();
  console.log('前2条数据:', plans.map(p => ({ college: p.collegeName, major: p.majorName })));

  await AppDataSource.destroy();
}

test().catch(console.error);
