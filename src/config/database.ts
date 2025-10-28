import { DataSource } from 'typeorm';
import config from './index';

export const AppDataSource = new DataSource({
  ...config.database,
  entities: ['src/models/**/*.ts'],
  migrations: ['src/migrations/**/*.ts']
});

// 初始化数据库连接
export const initDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};
