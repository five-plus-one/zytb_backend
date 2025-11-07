import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';

/**
 * 清理数据库中的无效冲稳保值
 * 将 "null", null, undefined 统一改为 "未知"
 */
async function cleanInvalidCategories() {
  console.log('🧹 开始清理无效的冲稳保分类...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const queryRunner = AppDataSource.createQueryRunner();

    // 查询需要清理的记录
    console.log('🔍 查找需要清理的记录...');
    const invalidRecords = await queryRunner.query(`
      SELECT id, collegeName, groupCode, admit_probability
      FROM volunteer_groups
      WHERE admit_probability IS NULL
         OR admit_probability = 'null'
         OR admit_probability = ''
         OR admit_probability = 'undefined'
    `);

    console.log(`找到 ${invalidRecords.length} 条需要清理的记录\n`);

    if (invalidRecords.length === 0) {
      console.log('✅ 没有需要清理的记录');
      await queryRunner.release();
      return;
    }

    // 显示前10条
    console.log('前10条记录示例：');
    invalidRecords.slice(0, 10).forEach((record: any, index: number) => {
      console.log(`  ${index + 1}. ${record.collegeName} - ${record.groupCode}: "${record.admit_probability}"`);
    });
    console.log('');

    // 执行清理
    console.log('📝 开始清理...');
    const result = await queryRunner.query(`
      UPDATE volunteer_groups
      SET admit_probability = '未知'
      WHERE admit_probability IS NULL
         OR admit_probability = 'null'
         OR admit_probability = ''
         OR admit_probability = 'undefined'
    `);

    console.log(`✅ 清理完成，更新了 ${result.affectedRows || invalidRecords.length} 条记录\n`);

    // 验证结果
    const remaining = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM volunteer_groups
      WHERE admit_probability IS NULL
         OR admit_probability = 'null'
         OR admit_probability = ''
         OR admit_probability = 'undefined'
    `);

    if (remaining[0].count === 0) {
      console.log('✅ 验证通过：所有无效值已清理');
    } else {
      console.log(`⚠️  仍有 ${remaining[0].count} 条记录存在无效值`);
    }

    await queryRunner.release();

  } catch (error: any) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ 数据库连接已关闭');
  }
}

cleanInvalidCategories()
  .then(() => {
    console.log('\n✅ 清理完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  });
