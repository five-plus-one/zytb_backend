#!/usr/bin/env ts-node
/**
 * 清空推荐引擎Redis缓存
 * 使用场景：修复推荐逻辑后需要清空旧缓存
 */
import { getRedisClient } from '../../src/config/redis';

async function clearCache() {
  console.log('\n🧹 === 清空推荐引擎缓存 ===\n');

  const redis = getRedisClient();

  try {
    // 获取所有推荐缓存键
    const keys = await redis.keys('rec:v2:*');

    console.log(`找到 ${keys.length} 个缓存键\n`);

    if (keys.length === 0) {
      console.log('✅ 没有缓存需要清理');
      return;
    }

    // 显示前10个键
    console.log('前10个缓存键:');
    keys.slice(0, 10).forEach((key, i) => {
      console.log(`  ${i + 1}. ${key}`);
    });
    if (keys.length > 10) {
      console.log(`  ... 还有 ${keys.length - 10} 个键\n`);
    }

    // 删除所有缓存
    console.log(`\n开始删除 ${keys.length} 个缓存键...`);

    let deleted = 0;
    for (const key of keys) {
      await redis.del(key);
      deleted++;
      if (deleted % 100 === 0) {
        console.log(`  已删除 ${deleted}/${keys.length}`);
      }
    }

    console.log(`\n✅ 成功删除 ${deleted} 个缓存键`);
    console.log('\n💡 下次查询推荐时将重新计算，不再使用旧缓存\n');

  } catch (error) {
    console.error('❌ 清理缓存失败:', error);
  } finally {
    await redis.quit();
  }
}

clearCache().catch(console.error);
