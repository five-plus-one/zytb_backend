#!/usr/bin/env ts-node
/**
 * 验证核心层数据统计
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function checkCoreLayerStats() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n📊 核心运算层数据统计:\n');

  // 院校统计
  const [colleges]: any = await conn.query(`
    SELECT COUNT(*) as total,
           AVG(hot_level) as avg_hot_level,
           COUNT(CASE WHEN difficulty_level = 'very_hard' THEN 1 END) as very_hard_count,
           COUNT(CASE WHEN difficulty_level = 'hard' THEN 1 END) as hard_count,
           COUNT(CASE WHEN difficulty_level = 'medium' THEN 1 END) as medium_count,
           COUNT(CASE WHEN difficulty_level = 'easy' THEN 1 END) as easy_count,
           COUNT(CASE WHEN avg_admission_score_recent_year IS NOT NULL THEN 1 END) as has_scores
    FROM core_colleges
  `);

  console.log('🏫 Core Colleges:');
  console.log(`  总数: ${colleges[0].total}`);
  console.log(`  平均热度指数: ${Math.round(colleges[0].avg_hot_level)}/100`);
  console.log(`  有近年分数的院校: ${colleges[0].has_scores}`);
  console.log('  难度分布:');
  console.log(`    极难 (very_hard): ${colleges[0].very_hard_count}`);
  console.log(`    困难 (hard): ${colleges[0].hard_count}`);
  console.log(`    中等 (medium): ${colleges[0].medium_count}`);
  console.log(`    简单 (easy): ${colleges[0].easy_count}`);

  // 录取分数统计
  const [scores]: any = await conn.query(`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN college_is_985 = TRUE THEN 1 END) as count_985,
           COUNT(CASE WHEN college_is_211 = TRUE THEN 1 END) as count_211
    FROM core_admission_scores
  `);

  console.log('\n📈 Core Admission Scores:');
  console.log(`  总记录数: ${scores[0].total}`);
  console.log(`  985院校分数记录: ${scores[0].count_985}`);
  console.log(`  211院校分数记录: ${scores[0].count_211}`);

  // 样本数据
  const [samples]: any = await conn.query(`
    SELECT name, province, hot_level, difficulty_level,
           avg_admission_score_recent_year, min_rank_recent_year
    FROM core_colleges
    WHERE avg_admission_score_recent_year IS NOT NULL
    ORDER BY hot_level DESC
    LIMIT 5
  `);

  console.log('\n🔥 热度最高的5所院校:');
  samples.forEach((s: any, i: number) => {
    console.log(`  ${i + 1}. ${s.name} (${s.province})`);
    console.log(`     热度: ${s.hot_level}/100 | 难度: ${s.difficulty_level}`);
    console.log(`     近年均分: ${s.avg_admission_score_recent_year || 'N/A'} | 最低位次: ${s.min_rank_recent_year || 'N/A'}`);
  });

  await conn.end();
  console.log('\n✅ 统计完成!\n');
}

checkCoreLayerStats().catch(console.error);
