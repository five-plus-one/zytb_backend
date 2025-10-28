import { AppDataSource } from './src/config/database';
import { AgentSession } from './src/models/AgentSession';

async function checkSession() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const sessionRepo = AppDataSource.getRepository(AgentSession);

    const session = await sessionRepo.findOne({
      where: { id: '099ff94c-e859-44c9-839a-6501a44dc6ec' }
    });

    if (!session) {
      console.log('❌ Session不存在!');
    } else {
      console.log('📊 Session信息:');
      console.log(`   ID: ${session.id}`);
      console.log(`   用户ID: ${session.userId}`);
      console.log(`   省份: ${session.province}`);
      console.log(`   分数: ${session.examScore}`);
      console.log(`   排名: ${session.scoreRank}`);
      console.log(`   科目类型: ${session.subjectType}`);
      console.log(`   阶段: ${session.stage}`);
      console.log(`   状态: ${session.status}`);
    }

    await AppDataSource.destroy();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkSession();
