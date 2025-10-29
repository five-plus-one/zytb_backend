/**
 * 标准化subject_type字段
 * 将"物理"改为"物理类"，"历史"改为"历史类"
 */

import { AppDataSource } from './src/config/database';

async function standardizeSubjectType() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    console.log('=== 开始标准化 subject_type 字段 ===\n');

    // 1. 检查当前值
    const current = await AppDataSource.query(`
      SELECT DISTINCT subject_type, COUNT(*) as count
      FROM enrollment_plans
      GROUP BY subject_type
    `);

    console.log('当前subject_type值:');
    current.forEach((r: any) => console.log(`  ${r.subject_type}: ${r.count}条`));

    // 2. 更新enrollment_plans表
    console.log('\n更新 enrollment_plans 表...');
    await AppDataSource.query(`
      UPDATE enrollment_plans
      SET subject_type = CASE
        WHEN subject_type = '物理' THEN '物理类'
        WHEN subject_type = '历史' THEN '历史类'
        ELSE subject_type
      END
      WHERE subject_type IN ('物理', '历史')
    `);
    console.log(`✓ enrollment_plans: 已更新`);

    // 3. 更新admission_scores表
    console.log('\n更新 admission_scores 表...');
    await AppDataSource.query(`
      UPDATE admission_scores
      SET subject_type = CASE
        WHEN subject_type = '物理' THEN '物理类'
        WHEN subject_type = '历史' THEN '历史类'
        ELSE subject_type
      END
      WHERE subject_type IN ('物理', '历史')
    `);
    console.log(`✓ admission_scores: 已更新`);

    // 4. 更新score_rankings表
    console.log('\n更新 score_rankings 表...');
    await AppDataSource.query(`
      UPDATE score_rankings
      SET subject_type = CASE
        WHEN subject_type = '物理' THEN '物理类'
        WHEN subject_type = '历史' THEN '历史类'
        ELSE subject_type
      END
      WHERE subject_type IN ('物理', '历史')
    `);
    console.log(`✓ score_rankings: 已更新`);

    // 5. 验证结果
    const after = await AppDataSource.query(`
      SELECT DISTINCT subject_type, COUNT(*) as count
      FROM enrollment_plans
      GROUP BY subject_type
    `);

    console.log('\n标准化后的subject_type值:');
    after.forEach((r: any) => console.log(`  ${r.subject_type}: ${r.count}条`));

    console.log('\n✅ subject_type字段标准化完成！');

    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

standardizeSubjectType();
