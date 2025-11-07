#!/usr/bin/env ts-node
/**
 * 同步录取分数和校园生活数据到核心层
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { CleanedToCorePipeline } from '../../src/etl/pipelines/CleanedToCorePipeline';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function main() {
  const pipeline = new CleanedToCorePipeline();

  try {
    console.log('\x1b[36m============================================================\x1b[0m');
    console.log('\x1b[36m     阶段3: 录取分数 & 校园生活 数据同步\x1b[0m');
    console.log('\x1b[36m============================================================\x1b[0m');

    await pipeline.initialize();
    console.log('\x1b[32m\n✅ ETL管道初始化成功\x1b[0m');

    // 同步录取分数
    console.log('\x1b[36m\n📊 开始同步录取分数数据到核心层...\x1b[0m');
    const scoresStats = await pipeline.fullSyncAdmissionScores();

    await pipeline.logSync('full', 'admission_score', scoresStats,
      scoresStats.failed === 0 ? 'completed' : 'completed_with_errors');

    console.log('\x1b[32m✅ 录取分数同步完成: ' + scoresStats.synced + '/' + scoresStats.total + '\x1b[0m');

    // 同步校园生活
    console.log('\x1b[36m\n🏫 开始同步校园生活数据到核心层...\x1b[0m');
    const campusLifeStats = await pipeline.fullSyncCampusLife();

    await pipeline.logSync('full', 'campus_life', campusLifeStats,
      campusLifeStats.failed === 0 ? 'completed' : 'completed_with_errors');

    console.log('\x1b[32m✅ 校园生活同步完成: ' + campusLifeStats.synced + '/' + campusLifeStats.total + '\x1b[0m');

    await pipeline.close();

    console.log('\x1b[32m\n============================================================\x1b[0m');
    console.log('\x1b[32m     ✅ 阶段3完成: 录取分数 & 校园生活同步成功!\x1b[0m');
    console.log('\x1b[32m============================================================\x1b[0m');
    console.log('\n📊 同步统计:');
    console.log(`  录取分数: ${scoresStats.synced}/${scoresStats.total} (失败: ${scoresStats.failed})`);
    console.log(`  校园生活: ${campusLifeStats.synced}/${campusLifeStats.total} (失败: ${campusLifeStats.failed})`);

  } catch (error) {
    console.error('\x1b[31m❌ 同步失败:\x1b[0m', error);
    await pipeline.close();
    process.exit(1);
  }
}

main();
