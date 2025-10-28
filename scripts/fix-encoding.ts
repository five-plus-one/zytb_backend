import { DataSource } from 'typeorm';
import config from '../src/config';

const AppDataSource = new DataSource({
  ...config.database,
  entities: []
});

async function fixEncoding() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 1. 检查数据库字符集
    console.log('\n=== 检查数据库字符集 ===');
    const dbCharset = await AppDataSource.query(
      'SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      ['volunteer_system']
    );
    console.log('数据库字符集:', dbCharset);

    // 2. 检查表字符集
    console.log('\n=== 检查表字符集 ===');
    const tableCharset = await AppDataSource.query(
      `SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'volunteer_system'`
    );
    console.log('表字符集:', tableCharset);

    // 3. 检查列字符集
    console.log('\n=== 检查colleges表列字符集 ===');
    const columnCharset = await AppDataSource.query(
      `SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'volunteer_system' AND TABLE_NAME = 'colleges' AND CHARACTER_SET_NAME IS NOT NULL`
    );
    console.log('列字符集:', columnCharset);

    // 4. 修改数据库字符集
    console.log('\n=== 修改数据库字符集为 utf8mb4 ===');
    await AppDataSource.query(
      'ALTER DATABASE volunteer_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('✅ 数据库字符集已修改');

    // 5. 修改colleges表字符集
    console.log('\n=== 修改colleges表字符集 ===');
    await AppDataSource.query(
      'ALTER TABLE colleges CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('✅ colleges表字符集已修改');

    // 6. 修改majors表字符集
    console.log('\n=== 修改majors表字符集 ===');
    await AppDataSource.query(
      'ALTER TABLE majors CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('✅ majors表字符集已修改');

    // 7. 修改users表字符集
    console.log('\n=== 修改users表字符集 ===');
    await AppDataSource.query(
      'ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('✅ users表字符集已修改');

    // 8. 修改volunteers表字符集
    console.log('\n=== 修改volunteers表字符集 ===');
    await AppDataSource.query(
      'ALTER TABLE volunteers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('✅ volunteers表字符集已修改');

    // 9. 查看修复后的数据
    console.log('\n=== 查看修复后的院校数据 ===');
    const colleges = await AppDataSource.query(
      'SELECT id, name, province, city, type FROM colleges LIMIT 3'
    );
    console.log('院校数据:', JSON.stringify(colleges, null, 2));

    await AppDataSource.destroy();
    console.log('\n✅ 编码修复完成!');
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixEncoding();
