/**
 * 用户配置上下文管理器
 * 用于存储和获取用户的基本信息（省份、分数、位次等）
 * 避免AI每次都要传递这些参数
 */

export interface UserProfile {
  userId: string;
  year?: number;
  province?: string;
  subjectType?: string;
  score?: number;
  rank?: number;
  // 用户首选项
  preferredProvinces?: string[];  // 偏好省份
  preferredMajorCategories?: string[];  // 偏好专业类别
  // 更新时间
  updatedAt: Date;
}

/**
 * 用户配置管理器
 * 使用内存存储,会话级别的上下文
 */
export class UserProfileManager {
  private static instance: UserProfileManager;
  private profiles: Map<string, UserProfile> = new Map();

  private constructor() {
    // 定期清理过期的profile (超过1小时)
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [userId, profile] of this.profiles.entries()) {
        if (profile.updatedAt < oneHourAgo) {
          this.profiles.delete(userId);
        }
      }
    }, 10 * 60 * 1000); // 每10分钟清理一次
  }

  static getInstance(): UserProfileManager {
    if (!UserProfileManager.instance) {
      UserProfileManager.instance = new UserProfileManager();
    }
    return UserProfileManager.instance;
  }

  /**
   * 获取用户配置
   */
  getProfile(userId: string): UserProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * 更新用户配置（部分更新）
   */
  updateProfile(userId: string, updates: Partial<Omit<UserProfile, 'userId' | 'updatedAt'>>): UserProfile {
    const existing = this.profiles.get(userId) || {
      userId,
      updatedAt: new Date()
    };

    const updated: UserProfile = {
      ...existing,
      ...updates,
      userId,  // 确保userId不被覆盖
      updatedAt: new Date()
    };

    this.profiles.set(userId, updated);
    return updated;
  }

  /**
   * 设置完整的用户配置
   */
  setProfile(userId: string, profile: Omit<UserProfile, 'updatedAt'>): UserProfile {
    const fullProfile: UserProfile = {
      ...profile,
      userId,
      updatedAt: new Date()
    };

    this.profiles.set(userId, fullProfile);
    return fullProfile;
  }

  /**
   * 删除用户配置
   */
  deleteProfile(userId: string): boolean {
    return this.profiles.delete(userId);
  }

  /**
   * 从用户配置中获取查询参数
   * 如果用户有配置,优先使用配置;否则使用传入的参数
   */
  getQueryParams(userId: string, explicitParams: {
    year?: number;
    province?: string;
    subjectType?: string;
    score?: number;
    rank?: number;
  } = {}): {
    year: number;
    province: string;
    subjectType: string;
    score: number;
    rank?: number;
  } | null {
    const profile = this.getProfile(userId);

    // 合并profile和explicitParams (explicitParams优先)
    const year = explicitParams.year || profile?.year;
    const province = explicitParams.province || profile?.province;
    const subjectType = explicitParams.subjectType || profile?.subjectType;
    const score = explicitParams.score || profile?.score;
    const rank = explicitParams.rank || profile?.rank;

    // 检查必填字段
    if (!year || !province || !subjectType || !score) {
      return null;
    }

    return { year, province, subjectType, score, rank };
  }

  /**
   * 清空所有配置（用于测试）
   */
  clearAll(): void {
    this.profiles.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalProfiles: number;
    profilesWithScores: number;
  } {
    let profilesWithScores = 0;
    for (const profile of this.profiles.values()) {
      if (profile.score) {
        profilesWithScores++;
      }
    }

    return {
      totalProfiles: this.profiles.size,
      profilesWithScores
    };
  }
}
