/**
 * 对话上下文管理器
 * 记住用户在对话过程中查询的信息,帮助AI做更智能的推断
 */

/**
 * 用户基本档案
 */
export interface UserProfile {
  // 基本信息
  score?: number; // 高考分数
  rank?: number; // 省排名/位次
  province?: string; // 省份
  category?: string; // 科类(物理类/历史类)
  year?: number; // 年份

  // 用户偏好
  preferences: {
    majors?: string[]; // 专业偏好(如:计算机科学与技术、软件工程)
    majorCategories?: string[]; // 专业大类(如:计算机类、电子信息类)
    locations?: string[]; // 地区偏好(如:江苏省内、北京)
    collegeTypes?: string[]; // 院校类型(如:985、211、双一流)
    excludeColleges?: string[]; // 排除的院校
  };
}

/**
 * 参数校验结果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  correctedParams?: any;
}

export interface QueryContext {
  // ===== 新增:用户档案信息 =====
  userProfile?: UserProfile;
  dataHash?: string; // 数据指纹,用于检测不一致

  // ===== 原有字段 =====
  // 最近查询的院校列表
  lastQueriedColleges?: Array<{
    collegeCode: string;
    collegeName: string;
    groups?: Array<{
      groupCode: string;
      groupName: string;
    }>;
  }>;

  // 最近查询的专业列表
  lastQueriedMajors?: Array<{
    majorCode: string;
    majorName: string;
    collegeName: string;
  }>;

  // 当前批次ID
  currentBatchId?: string;

  // 志愿表当前填到第几位
  volunteerTableNextPosition?: number;

  // 最近添加的院校/专业组
  recentlyAddedGroups?: Array<{
    collegeCode: string;
    collegeName: string;
    groupCode: string;
    groupOrder: number;
  }>;

  // 最后更新时间
  updatedAt: Date;
}

/**
 * 对话上下文管理器
 */
export class ConversationContextManager {
  private static instance: ConversationContextManager;
  private contexts: Map<string, QueryContext> = new Map();

  private constructor() {
    // 定期清理过期的context (超过30分钟)
    setInterval(() => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      for (const [sessionId, context] of this.contexts.entries()) {
        if (context.updatedAt < thirtyMinutesAgo) {
          this.contexts.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  static getInstance(): ConversationContextManager {
    if (!ConversationContextManager.instance) {
      ConversationContextManager.instance = new ConversationContextManager();
    }
    return ConversationContextManager.instance;
  }

  /**
   * 获取会话上下文
   */
  getContext(sessionId: string): QueryContext | null {
    return this.contexts.get(sessionId) || null;
  }

  /**
   * 更新会话上下文（部分更新）
   */
  updateContext(sessionId: string, updates: Partial<Omit<QueryContext, 'updatedAt'>>): QueryContext {
    const existing = this.contexts.get(sessionId) || {
      updatedAt: new Date()
    };

    const updated: QueryContext = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    this.contexts.set(sessionId, updated);
    return updated;
  }

  /**
   * 记录查询的院校
   */
  recordQueriedColleges(sessionId: string, colleges: Array<{
    collegeCode: string;
    collegeName: string;
    groups?: Array<{ groupCode: string; groupName: string }>;
  }>) {
    this.updateContext(sessionId, {
      lastQueriedColleges: colleges
    });
  }

  /**
   * 记录当前批次ID
   */
  recordCurrentBatch(sessionId: string, batchId: string) {
    this.updateContext(sessionId, {
      currentBatchId: batchId
    });
  }

  /**
   * 更新志愿表下一个位置
   */
  updateNextPosition(sessionId: string, position: number) {
    this.updateContext(sessionId, {
      volunteerTableNextPosition: position
    });
  }

  /**
   * 记录最近添加的专业组
   */
  recordAddedGroups(sessionId: string, groups: Array<{
    collegeCode: string;
    collegeName: string;
    groupCode: string;
    groupOrder: number;
  }>) {
    const context = this.getContext(sessionId);
    const existing = context?.recentlyAddedGroups || [];

    // 只保留最近10个
    const updated = [...groups, ...existing].slice(0, 10);

    this.updateContext(sessionId, {
      recentlyAddedGroups: updated
    });
  }

  /**
   * 获取最近查询的某个院校
   */
  findRecentCollege(sessionId: string, collegeName: string): {
    collegeCode: string;
    collegeName: string;
    groups?: Array<{ groupCode: string; groupName: string }>;
  } | null {
    const context = this.getContext(sessionId);
    if (!context?.lastQueriedColleges) return null;

    return context.lastQueriedColleges.find(
      c => c.collegeName.includes(collegeName) || collegeName.includes(c.collegeName)
    ) || null;
  }

  /**
   * 清除会话上下文
   */
  clearContext(sessionId: string): boolean {
    return this.contexts.delete(sessionId);
  }

  /**
   * 清空所有上下文（用于测试）
   */
  clearAll(): void {
    this.contexts.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalSessions: number;
    sessionsWithBatches: number;
    sessionsWithQueries: number;
  } {
    let sessionsWithBatches = 0;
    let sessionsWithQueries = 0;

    for (const context of this.contexts.values()) {
      if (context.currentBatchId) {
        sessionsWithBatches++;
      }
      if (context.lastQueriedColleges && context.lastQueriedColleges.length > 0) {
        sessionsWithQueries++;
      }
    }

    return {
      totalSessions: this.contexts.size,
      sessionsWithBatches,
      sessionsWithQueries
    };
  }

  // ===== 新增:用户档案管理方法 =====

  /**
   * 更新用户档案
   */
  updateUserProfile(sessionId: string, updates: Partial<UserProfile>): void {
    const context = this.getContext(sessionId) || { updatedAt: new Date() };

    const currentProfile = context.userProfile || { preferences: {} };

    // 深度合并用户档案
    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      preferences: {
        ...currentProfile.preferences,
        ...updates.preferences,
      },
    };

    // 计算数据哈希
    const dataHash = this.calculateHash(updatedProfile);

    this.updateContext(sessionId, {
      userProfile: updatedProfile,
      dataHash,
    });
  }

  /**
   * 获取用户档案
   */
  getUserProfile(sessionId: string): UserProfile | null {
    const context = this.getContext(sessionId);
    return context?.userProfile || null;
  }

  /**
   * 校验工具调用参数
   * 检查参数是否与用户档案一致
   */
  validateToolParams(
    sessionId: string,
    toolName: string,
    params: any,
  ): ValidationResult {
    const profile = this.getUserProfile(sessionId);
    if (!profile) {
      return { valid: true }; // 如果没有档案,不进行校验
    }

    // 校验分数一致性
    if (params.score !== undefined && profile.score !== undefined) {
      if (params.score !== profile.score) {
        return {
          valid: false,
          error: `⚠️ 分数不一致:用户提供的分数是 ${profile.score} 分,但工具调用时使用了 ${params.score} 分。已自动纠正。`,
          correctedParams: { ...params, score: profile.score },
        };
      }
    }

    // 校验位次一致性
    if (params.rank !== undefined && profile.rank !== undefined) {
      if (params.rank !== profile.rank) {
        return {
          valid: false,
          error: `⚠️ 位次不一致:用户的位次是 ${profile.rank},但工具调用时使用了 ${params.rank}。已自动纠正。`,
          correctedParams: { ...params, rank: profile.rank },
        };
      }
    }

    // 校验省份一致性
    if (params.province !== undefined && profile.province !== undefined) {
      if (params.province !== profile.province) {
        return {
          valid: false,
          error: `⚠️ 省份不一致:用户的省份是 ${profile.province},但工具调用时使用了 ${params.province}。已自动纠正。`,
          correctedParams: { ...params, province: profile.province },
        };
      }
    }

    return { valid: true };
  }

  /**
   * 自动补全工具参数
   * 根据用户档案和偏好自动填充缺失的参数
   */
  enrichToolParams(sessionId: string, toolName: string, params: any): any {
    const profile = this.getUserProfile(sessionId);
    if (!profile) {
      return params;
    }

    const enriched = { ...params };

    // 自动填充省份
    if (!enriched.province && profile.province) {
      enriched.province = profile.province;
    }

    // 自动填充科类
    if (!enriched.category && profile.category) {
      enriched.category = profile.category;
    }

    // 自动填充年份
    if (!enriched.year && profile.year) {
      enriched.year = profile.year;
    }

    // 根据工具类型自动填充专业偏好
    if (
      toolName === 'filter_majors' &&
      profile.preferences.majors &&
      profile.preferences.majors.length > 0
    ) {
      // 如果用户明确了专业方向,自动添加到筛选条件
      if (!enriched.majorName && !enriched.majorNames) {
        enriched.majorName = profile.preferences.majors.join(',');
      }
    }

    // 自动填充专业大类偏好
    if (
      toolName === 'filter_majors' &&
      profile.preferences.majorCategories &&
      profile.preferences.majorCategories.length > 0
    ) {
      if (!enriched.majorCategory) {
        enriched.majorCategory = profile.preferences.majorCategories[0];
      }
    }

    // 自动填充地区偏好
    if (
      (toolName === 'query_suitable_colleges' || toolName === 'filter_majors') &&
      profile.preferences.locations &&
      profile.preferences.locations.length > 0
    ) {
      if (!enriched.collegeProvince) {
        enriched.collegeProvince = profile.preferences.locations[0];
      }
    }

    // 自动填充批次ID
    const context = this.getContext(sessionId);
    if (!enriched.batchId && context?.currentBatchId) {
      enriched.batchId = context.currentBatchId;
    }

    return enriched;
  }

  /**
   * 从用户输入中提取偏好
   * 使用关键词匹配提取用户意图
   */
  extractPreferencesFromInput(sessionId: string, input: string): void {
    const profile = this.getUserProfile(sessionId) || { preferences: {} };

    // 提取专业偏好
    const majorKeywords = [
      { pattern: /计算机|软件|编程|代码|程序/i, categories: ['计算机类'], majors: ['计算机科学与技术', '软件工程'] },
      { pattern: /电子|通信|信息工程/i, categories: ['电子信息类'], majors: ['电子信息工程', '通信工程'] },
      { pattern: /机械|自动化/i, categories: ['机械类', '自动化类'], majors: ['机械工程', '自动化'] },
      { pattern: /医学|临床|口腔/i, categories: ['医学类'], majors: ['临床医学', '口腔医学'] },
      { pattern: /经济|金融|财会/i, categories: ['经济学类', '金融学类'], majors: ['经济学', '金融学'] },
    ];

    for (const keyword of majorKeywords) {
      if (keyword.pattern.test(input)) {
        profile.preferences.majorCategories = [
          ...(profile.preferences.majorCategories || []),
          ...keyword.categories,
        ];
        profile.preferences.majors = [
          ...(profile.preferences.majors || []),
          ...keyword.majors,
        ];
      }
    }

    // 提取地区偏好
    if (/省内|本省/i.test(input) && profile.province) {
      if (!profile.preferences.locations?.includes(profile.province)) {
        profile.preferences.locations = [
          ...(profile.preferences.locations || []),
          profile.province,
        ];
      }
    }

    // 提取院校类型偏好
    if (/985/i.test(input)) {
      if (!profile.preferences.collegeTypes?.includes('985')) {
        profile.preferences.collegeTypes = [
          ...(profile.preferences.collegeTypes || []),
          '985',
        ];
      }
    }
    if (/211/i.test(input)) {
      if (!profile.preferences.collegeTypes?.includes('211')) {
        profile.preferences.collegeTypes = [
          ...(profile.preferences.collegeTypes || []),
          '211',
        ];
      }
    }

    this.updateUserProfile(sessionId, profile);
  }

  /**
   * 获取状态快照
   */
  getStateSnapshot(sessionId: string): any {
    const context = this.getContext(sessionId);
    if (!context) return null;

    return {
      score: context.userProfile?.score,
      rank: context.userProfile?.rank,
      province: context.userProfile?.province,
      batchId: context.currentBatchId,
      preferences: context.userProfile?.preferences,
      dataHash: context.dataHash,
      lastUpdated: context.updatedAt,
    };
  }

  /**
   * 计算数据哈希
   */
  private calculateHash(profile: UserProfile): string {
    const str = JSON.stringify({
      score: profile.score,
      rank: profile.rank,
      province: profile.province,
      category: profile.category,
    });
    return Buffer.from(str).toString('base64');
  }
}
