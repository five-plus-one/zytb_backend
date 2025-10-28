import { AppDataSource, initDatabase } from '../src/config/database';

async function syncDatabase() {
  try {
    console.log('开始同步数据库表结构...');

    // 初始化数据库连接
    await initDatabase();

    // 手动同步表结构
    await AppDataSource.synchronize();

    console.log('✅ 数据库表结构同步成功!');

    // 关闭连接
    await AppDataSource.destroy();

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 数据库表结构同步失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncDatabase();
