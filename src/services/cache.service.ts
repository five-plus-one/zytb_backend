import getRedisClient from '../config/redis';
import crypto from 'crypto';

/**
 * Redis 缓存服务
 * 统一管理所有缓存操作，支持自动过期和版本控制
 */

export enum CachePrefix {
  USER_PREFERENCES = 'pref',        // 用户偏好
  USER_EMBEDDING = 'emb_user',      // 用户偏好嵌入向量
  MAJOR_EMBEDDING = 'emb_major',    // 专业嵌入向量
  COLLEGE_EMBEDDING = 'emb_college', // 院校嵌入向量
  RECOMMENDATIONS = 'rec',          // 推荐结果
  MATCH_SCORES = 'match',          // 匹配分数
  USER_PROFILE = 'profile'         // 用户画像
}

export interface CacheOptions {
  ttl?: number;  // 过期时间(秒)，默认3600秒(1小时)
  prefix?: CachePrefix;
}

export class CacheService {
  private redis = getRedisClient();
  private readonly DEFAULT_TTL = 3600; // 默认1小时

  /**
   * 生成缓存键
   */
  private generateKey(prefix: CachePrefix, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * 生成数据哈希（用于版本控制）
   */
  private generateHash(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * 设置缓存
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error: any) {
      console.error(`[Cache] Set error for key ${key}:`, error.message);
    }
  }

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error: any) {
      console.error(`[Cache] Get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error: any) {
      console.error(`[Cache] Delete error for key ${key}:`, error.message);
    }
  }

  /**
   * 批量删除（支持模式匹配）
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error: any) {
      console.error(`[Cache] Delete pattern error for ${pattern}:`, error.message);
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: any) {
      console.error(`[Cache] Exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * 缓存用户偏好（带版本控制）
   */
  async cacheUserPreferences(
    userId: string,
    sessionId: string,
    preferences: any[]
  ): Promise<void> {
    const key = this.generateKey(CachePrefix.USER_PREFERENCES, userId, sessionId);
    const hash = this.generateHash(preferences);
    const value = { data: preferences, hash, cachedAt: new Date().toISOString() };
    await this.set(key, value, { ttl: 7200 }); // 2小时
  }

  /**
   * 获取用户偏好缓存
   */
  async getUserPreferences(
    userId: string,
    sessionId: string
  ): Promise<{ data: any[]; hash: string } | null> {
    const key = this.generateKey(CachePrefix.USER_PREFERENCES, userId, sessionId);
    return await this.get(key);
  }

  /**
   * 检查用户偏好是否有变化
   */
  async hasPreferencesChanged(
    userId: string,
    sessionId: string,
    currentPreferences: any[]
  ): Promise<boolean> {
    const cached = await this.getUserPreferences(userId, sessionId);
    if (!cached) return true;

    const currentHash = this.generateHash(currentPreferences);
    return cached.hash !== currentHash;
  }

  /**
   * 缓存用户嵌入向量
   */
  async cacheUserEmbedding(
    userId: string,
    sessionId: string,
    embedding: number[],
    preferencesHash: string
  ): Promise<void> {
    const key = this.generateKey(CachePrefix.USER_EMBEDDING, userId, sessionId);
    const value = {
      embedding,
      preferencesHash,
      cachedAt: new Date().toISOString()
    };
    await this.set(key, value, { ttl: 7200 }); // 2小时
  }

  /**
   * 获取用户嵌入向量（验证hash）
   */
  async getUserEmbedding(
    userId: string,
    sessionId: string,
    preferencesHash: string
  ): Promise<number[] | null> {
    const key = this.generateKey(CachePrefix.USER_EMBEDDING, userId, sessionId);
    const cached = await this.get<{ embedding: number[]; preferencesHash: string }>(key);

    if (!cached) return null;
    if (cached.preferencesHash !== preferencesHash) {
      // 偏好已变化，删除过期缓存
      await this.del(key);
      return null;
    }

    return cached.embedding;
  }

  /**
   * 缓存专业嵌入向量
   */
  async cacheMajorEmbedding(majorId: string, embedding: number[]): Promise<void> {
    const key = this.generateKey(CachePrefix.MAJOR_EMBEDDING, majorId);
    await this.set(key, embedding, { ttl: 86400 }); // 24小时
  }

  /**
   * 获取专业嵌入向量
   */
  async getMajorEmbedding(majorId: string): Promise<number[] | null> {
    const key = this.generateKey(CachePrefix.MAJOR_EMBEDDING, majorId);
    return await this.get(key);
  }

  /**
   * 批量缓存专业嵌入向量
   */
  async batchCacheMajorEmbeddings(embeddings: Map<string, number[]>): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const [majorId, embedding] of embeddings) {
      const key = this.generateKey(CachePrefix.MAJOR_EMBEDDING, majorId);
      pipeline.setex(key, 86400, JSON.stringify(embedding));
    }

    await pipeline.exec();
  }

  /**
   * 缓存推荐结果
   */
  async cacheRecommendations(
    userId: string,
    sessionId: string,
    recommendations: any[],
    context: {
      score: number;
      province: string;
      preferencesHash: string;
    }
  ): Promise<void> {
    const key = this.generateKey(CachePrefix.RECOMMENDATIONS, userId, sessionId);
    const value = {
      recommendations,
      context,
      cachedAt: new Date().toISOString()
    };
    await this.set(key, value, { ttl: 3600 }); // 1小时
  }

  /**
   * 获取推荐结果（验证上下文）
   */
  async getRecommendations(
    userId: string,
    sessionId: string,
    currentContext: {
      score: number;
      province: string;
      preferencesHash: string;
    }
  ): Promise<any[] | null> {
    const key = this.generateKey(CachePrefix.RECOMMENDATIONS, userId, sessionId);
    const cached = await this.get<{
      recommendations: any[];
      context: {
        score: number;
        province: string;
        preferencesHash: string;
      };
    }>(key);

    if (!cached) return null;

    // 验证上下文是否匹配
    if (
      cached.context.score !== currentContext.score ||
      cached.context.province !== currentContext.province ||
      cached.context.preferencesHash !== currentContext.preferencesHash
    ) {
      // 上下文不匹配，删除过期缓存
      await this.del(key);
      return null;
    }

    // 如果缓存的推荐为空，删除缓存并返回null触发重新生成
    if (!cached.recommendations || cached.recommendations.length === 0) {
      console.warn('[Cache] 发现空推荐缓存，删除并触发重新生成');
      await this.del(key);
      return null;
    }

    return cached.recommendations;
  }

  /**
   * 清除用户所有缓存
   */
  async clearUserCache(userId: string, sessionId?: string): Promise<void> {
    const patterns = [
      this.generateKey(CachePrefix.USER_PREFERENCES, userId, sessionId || '*'),
      this.generateKey(CachePrefix.USER_EMBEDDING, userId, sessionId || '*'),
      this.generateKey(CachePrefix.RECOMMENDATIONS, userId, sessionId || '*'),
      this.generateKey(CachePrefix.MATCH_SCORES, userId, sessionId || '*')
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const dbSize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      return {
        totalKeys: dbSize,
        memoryUsage
      };
    } catch (error: any) {
      console.error('[Cache] Stats error:', error.message);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown'
      };
    }
  }
}

// 单例导出
export default new CacheService();
