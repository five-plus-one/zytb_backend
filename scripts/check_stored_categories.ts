import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { VolunteerGroup } from '../src/models/VolunteerNew';

async function checkStoredCategories() {
  console.log('🔍 检查数据库中存储的冲稳保分类...\n');

  try {
    await AppDataSource.initialize();

    const groupRepo = AppDataSource.getRepository(VolunteerGroup);

    const allGroups = await groupRepo.find({
      take: 20,
      order: { createdAt: 'DESC' }
    });

    console.log(`找到 ${allGroups.length} 个最新的志愿组：\n`);

    allGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.collegeName} - ${group.groupCode}`);
      console.log(`   admit_probability: "${group.admitProbability}"`);
      console.log(`   created_at: ${group.createdAt}`);
      console.log('');
    });

    // 统计
    const stats = {
      冲: allGroups.filter(g => g.admitProbability === '冲').length,
      稳: allGroups.filter(g => g.admitProbability === '稳').length,
      保: allGroups.filter(g => g.admitProbability === '保').length,
      未知: allGroups.filter(g => !g.admitProbability || g.admitProbability === '未知').length,
      其他: allGroups.filter(g => g.admitProbability && !['冲', '稳', '保', '未知'].includes(g.admitProbability)).length
    };

    console.log('📊 统计结果：');
    console.log(`   冲: ${stats.冲}`);
    console.log(`   稳: ${stats.稳}`);
    console.log(`   保: ${stats.保}`);
    console.log(`   未知: ${stats.未知}`);
    console.log(`   其他值: ${stats.其他}`);

  } catch (error: any) {
    console.error('❌ 检查失败:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

checkStoredCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
