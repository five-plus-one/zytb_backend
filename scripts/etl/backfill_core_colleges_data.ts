#!/usr/bin/env ts-node
/**
 * 数据回填脚本 - 从 colleges 表回填数据到 core_colleges
 * 包括: female_ratio, male_ratio, rank, description 等
 */
import { AppDataSource } from '../../src/config/database';

async function backfillCoreCollegesData() {
  console.log('\n🔄 === 回填 core_colleges 数据 ===\n');

  await AppDataSource.initialize();

  // 1. 回填男女比例
  console.log('📊 正在回填男女比例...');
  const genderResult = await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN colleges c ON cc.id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET
      cc.female_ratio = c.female_ratio,
      cc.male_ratio = c.male_ratio
    WHERE c.female_ratio IS NOT NULL
  `);
  console.log(`✅ 男女比例回填完成: ${genderResult.affectedRows || 0} 行\n`);

  // 2. 回填排名
  console.log('📈 正在回填院校排名...');
  const rankResult = await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN colleges c ON cc.id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET cc.rank = c.rank
    WHERE c.rank IS NOT NULL
  `);
  console.log(`✅ 排名回填完成: ${rankResult.affectedRows || 0} 行\n`);

  // 3. 回填描述
  console.log('📝 正在回填院校描述...');
  const descResult = await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN colleges c ON cc.id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET cc.description = c.description
    WHERE c.description IS NOT NULL
  `);
  console.log(`✅ 描述回填完成: ${descResult.affectedRows || 0} 行\n`);

  // 4. 回填重点学科数量
  console.log('🏅 正在回填重点学科数量...');
  const disciplineResult = await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN colleges c ON cc.id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET cc.key_discipline_count = c.key_discipline_count
    WHERE c.key_discipline_count IS NOT NULL
  `);
  console.log(`✅ 重点学科数量回填完成: ${disciplineResult.affectedRows || 0} 行\n`);

  // 5. 回填特色数据
  console.log('✨ 正在回填院校特色...');
  const featuresResult = await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN colleges c ON cc.id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET cc.features = c.features
    WHERE c.features IS NOT NULL
  `);
  console.log(`✅ 院校特色回填完成: ${featuresResult.affectedRows || 0} 行\n`);

  // 6. 回填评估结果
  console.log('📋 正在回填评估结果...');
  const evalResult = await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN colleges c ON cc.id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
    SET cc.evaluation_result = c.evaluation_result
    WHERE c.evaluation_result IS NOT NULL
  `);
  console.log(`✅ 评估结果回填完成: ${evalResult.affectedRows || 0} 行\n`);

  // 7. 更新同步时间
  console.log('🕐 更新同步时间戳...');
  await AppDataSource.query(`
    UPDATE core_colleges
    SET last_synced_at = NOW(),
        data_version = data_version + 1
  `);
  console.log('✅ 同步时间戳已更新\n');

  // 8. 统计结果
  console.log('📊 回填结果统计:\n');

  const stats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN female_ratio IS NOT NULL THEN 1 ELSE 0 END) as has_gender,
      SUM(CASE WHEN \`rank\` IS NOT NULL THEN 1 ELSE 0 END) as has_rank,
      SUM(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as has_description,
      SUM(CASE WHEN key_discipline_count IS NOT NULL THEN 1 ELSE 0 END) as has_discipline
    FROM core_colleges
  `);

  const s = stats[0];
  console.log(`总院校数: ${s.total}`);
  console.log(`男女比例完整度: ${(s.has_gender / s.total * 100).toFixed(1)}% (${s.has_gender}/${s.total})`);
  console.log(`排名完整度: ${(s.has_rank / s.total * 100).toFixed(1)}% (${s.has_rank}/${s.total})`);
  console.log(`描述完整度: ${(s.has_description / s.total * 100).toFixed(1)}% (${s.has_description}/${s.total})`);
  console.log(`重点学科完整度: ${(s.has_discipline / s.total * 100).toFixed(1)}% (${s.has_discipline}/${s.total})`);

  await AppDataSource.destroy();

  console.log('\n✅ 数据回填完成!\n');
}

backfillCoreCollegesData().catch(console.error);
