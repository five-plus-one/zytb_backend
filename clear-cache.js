const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0
});

async function clearCache() {
  try {
    console.log('🗑️  开始清除缓存...');

    // 删除所有推荐缓存
    const recKeys = await redis.keys('rec:*');
    if (recKeys.length > 0) {
      await redis.del(...recKeys);
      console.log(`✅ 已删除 ${recKeys.length} 个推荐缓存`);
    } else {
      console.log('ℹ️  没有找到推荐缓存');
    }

    // 删除所有用户偏好缓存
    const prefKeys = await redis.keys('user_preferences:*');
    if (prefKeys.length > 0) {
      await redis.del(...prefKeys);
      console.log(`✅ 已删除 ${prefKeys.length} 个偏好缓存`);
    } else {
      console.log('ℹ️  没有找到偏好缓存');
    }

    // 删除所有嵌入向量缓存
    const embKeys = await redis.keys('user_embedding:*');
    if (embKeys.length > 0) {
      await redis.del(...embKeys);
      console.log(`✅ 已删除 ${embKeys.length} 个嵌入向量缓存`);
    } else {
      console.log('ℹ️  没有找到嵌入向量缓存');
    }

    console.log('✨ 缓存清除完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 清除缓存失败:', error);
    process.exit(1);
  }
}

clearCache();
