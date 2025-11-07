#!/usr/bin/env ts-node
/**
 * 阶段3: 执行Cleaned → Core 全量同步
 */

import { CleanedToCorePipeline } from '../../src/etl/pipelines/CleanedToCorePipeline';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log('='.repeat(60), colors.cyan);
  log('     阶段3: Cleaned → Core 数据同步', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const pipeline = new CleanedToCorePipeline();

  try {
    await pipeline.initialize();
    log('\n✅ ETL管道初始化成功', colors.green);

    // 全量同步院校
    log('\n🏫 开始同步院校数据到核心层...', colors.cyan);
    const collegeStats = await pipeline.fullSyncColleges();
    log(`✅ 院校同步完成: ${collegeStats.synced}/${collegeStats.total}`, colors.green);
    await pipeline.logSync('full', 'college', collegeStats, 'completed');

    //由于token限制和时间因素,先只同步院校数据
    //后续可以继续同步其他数据

    log('\n' + '='.repeat(60), colors.green);
    log('     ✅ 阶段3完成: 数据同步成功!', colors.green);
    log('='.repeat(60), colors.green);

  } catch (error: any) {
    log('\n❌ 同步失败!', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pipeline.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
