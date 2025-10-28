import { AgentPreference } from '../../models/AgentPreference';
import { EmbeddingService } from '../embedding.service';
import cacheService from '../cache.service';
import crypto from 'crypto';

/**
 * 用户偏好嵌入向量生成服务
 * 将用户的100个偏好指标转换为语义嵌入向量，用于智能匹配
 */

interface UserPreferenceProfile {
  // 核心决策权重
  decisionWeights: {
    college: number;
    major: number;
    city: number;
    employment: number;
    furtherStudy: number;
    interest: number;
    prospect: number;
  };

  // 性格与思维
  personality?: {
    mbti?: string;
    thinkingStyle?: string;
    workPreference?: string;
  };

  // 专业倾向
  majorPreferences?: {
    preferredMajors?: string[];
    excludedMajors?: string[];
    majorCategories?: string[];
    skills?: string[];
    interests?: string[];
  };

  // 院校偏好
  collegePreferences?: {
    schoolLevels?: string[];  // 985/211/双一流
    preferredProvinces?: string[];
    excludedCities?: string[];
    campusEnvironment?: string[];
  };

  // 就业与发展
  careerGoals?: {
    targetIndustries?: string[];
    targetPositions?: string[];
    salaryExpectation?: number;
    workLocation?: string[];
  };

  // 学习与生活
  lifestyle?: {
    studyIntensity?: string;
    campusActivities?: string[];
    socialPreference?: string;
  };

  // 家庭与经济
  familyFactors?: {
    tuitionBudget?: number;
    distanceFromHome?: string;
    parentExpectations?: string[];
  };

  // 其他重要指标
  other?: Record<string, any>;
}

export class PreferenceEmbeddingService {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * 为用户偏好生成嵌入向量（带缓存）
   */
  async generateUserEmbedding(
    userId: string,
    sessionId: string,
    preferences: AgentPreference[]
  ): Promise<number[]> {
    // 生成偏好哈希
    const preferencesHash = this.generatePreferencesHash(preferences);

    // 尝试从缓存获取
    const cached = await cacheService.getUserEmbedding(userId, sessionId, preferencesHash);
    if (cached && cached.length > 0) {
      console.log('✅ 使用缓存的用户嵌入向量');
      return cached;
    }

    console.log('🔄 生成新的用户嵌入向量...');

    // 构建用户画像
    const profile = this.buildUserProfile(preferences);

    // 生成描述性文本
    const embeddingText = this.generateEmbeddingText(profile);

    // 生成嵌入向量
    const embedding = await this.embeddingService.generateEmbedding(embeddingText);

    // 缓存结果
    if (embedding && embedding.length > 0) {
      await cacheService.cacheUserEmbedding(userId, sessionId, embedding, preferencesHash);
    }

    return embedding;
  }

  /**
   * 生成偏好哈希（用于缓存验证）
   */
  private generatePreferencesHash(preferences: AgentPreference[]): string {
    const sortedPrefs = preferences
      .sort((a, b) => a.indicatorId.localeCompare(b.indicatorId))
      .map(p => ({ id: p.indicatorId, value: p.value, version: p.version }));

    return crypto
      .createHash('md5')
      .update(JSON.stringify(sortedPrefs))
      .digest('hex');
  }

  /**
   * 从偏好指标构建用户画像
   */
  private buildUserProfile(preferences: AgentPreference[]): UserPreferenceProfile {
    const profile: UserPreferenceProfile = {
      decisionWeights: {
        college: 33,
        major: 34,
        city: 33,
        employment: 50,
        furtherStudy: 50,
        interest: 50,
        prospect: 50
      }
    };

    for (const pref of preferences) {
      try {
        switch (pref.indicatorId) {
          // 决策权重
          case 'CORE_01': // 院校-专业-城市权重
            if (pref.value && typeof pref.value === 'object') {
              profile.decisionWeights.college = pref.value.college || 33;
              profile.decisionWeights.major = pref.value.major || 34;
              profile.decisionWeights.city = pref.value.city || 33;
            }
            break;

          case 'CORE_02': // 就业-深造权重
            if (pref.value && typeof pref.value === 'object') {
              profile.decisionWeights.employment = pref.value.employment || 50;
              profile.decisionWeights.furtherStudy = pref.value.furtherStudy || 50;
            }
            break;

          case 'CORE_03': // 兴趣-前景权重
            if (pref.value && typeof pref.value === 'object') {
              profile.decisionWeights.interest = pref.value.interest || 50;
              profile.decisionWeights.prospect = pref.value.prospect || 50;
            }
            break;

          // 性格与思维
          case 'CORE_04': // MBTI
            if (!profile.personality) profile.personality = {};
            profile.personality.mbti = pref.value;
            break;

          case 'CORE_05': // 思维模式
            if (!profile.personality) profile.personality = {};
            profile.personality.thinkingStyle = pref.value;
            break;

          case 'CORE_06': // 工作偏好
            if (!profile.personality) profile.personality = {};
            profile.personality.workPreference = pref.value;
            break;

          // 专业偏好
          default:
            if (pref.category === '专业偏好') {
              if (!profile.majorPreferences) profile.majorPreferences = {};
              this.addToCategory(profile.majorPreferences, pref);
            } else if (pref.category === '院校偏好') {
              if (!profile.collegePreferences) profile.collegePreferences = {};
              this.addToCategory(profile.collegePreferences, pref);
            } else if (pref.category === '就业发展') {
              if (!profile.careerGoals) profile.careerGoals = {};
              this.addToCategory(profile.careerGoals, pref);
            } else if (pref.category === '学习生活') {
              if (!profile.lifestyle) profile.lifestyle = {};
              this.addToCategory(profile.lifestyle, pref);
            } else if (pref.category === '家庭经济') {
              if (!profile.familyFactors) profile.familyFactors = {};
              this.addToCategory(profile.familyFactors, pref);
            } else {
              if (!profile.other) profile.other = {};
              profile.other[pref.indicatorName] = pref.value;
            }
        }
      } catch (error: any) {
        console.error(`Error processing preference ${pref.indicatorId}:`, error.message);
      }
    }

    return profile;
  }

  /**
   * 添加偏好到分类
   */
  private addToCategory(category: Record<string, any>, pref: AgentPreference) {
    const key = this.camelCase(pref.indicatorName);
    category[key] = pref.value;
  }

  /**
   * 转换为驼峰命名
   */
  private camelCase(str: string): string {
    return str
      .replace(/[^\w\s]/g, '')
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/\s/g, '')
      .replace(/^(.)/, c => c.toLowerCase());
  }

  /**
   * 生成嵌入文本
   * 将用户画像转换为自然语言描述
   */
  private generateEmbeddingText(profile: UserPreferenceProfile): string {
    const sections: string[] = [];

    // 1. 决策权重描述
    sections.push('用户决策偏好：');
    const weights = profile.decisionWeights;
    if (weights.college > 40) {
      sections.push('非常看重院校品牌和声誉');
    } else if (weights.college < 25) {
      sections.push('对院校品牌不太在意');
    }

    if (weights.major > 40) {
      sections.push('专业选择是首要考虑因素');
    } else if (weights.major < 25) {
      sections.push('对专业不太挑剔');
    }

    if (weights.city > 40) {
      sections.push('城市地理位置非常重要');
    }

    if (weights.employment > 60) {
      sections.push('倾向毕业后直接就业');
    } else if (weights.furtherStudy > 60) {
      sections.push('计划继续深造读研');
    }

    if (weights.interest > 60) {
      sections.push('更看重个人兴趣和热爱');
    } else if (weights.prospect > 60) {
      sections.push('更看重就业前景和收入');
    }

    // 2. 性格特征
    if (profile.personality) {
      sections.push('\n性格特征：');
      if (profile.personality.mbti) {
        sections.push(`MBTI类型：${profile.personality.mbti}`);
      }
      if (profile.personality.thinkingStyle) {
        sections.push(`思维方式：${profile.personality.thinkingStyle}`);
      }
      if (profile.personality.workPreference) {
        sections.push(`工作偏好：${profile.personality.workPreference}`);
      }
    }

    // 3. 专业倾向
    if (profile.majorPreferences) {
      sections.push('\n专业倾向：');
      const mp = profile.majorPreferences;

      if (mp.preferredMajors && mp.preferredMajors.length > 0) {
        sections.push(`偏好专业：${mp.preferredMajors.join('、')}`);
      }

      if (mp.majorCategories && mp.majorCategories.length > 0) {
        sections.push(`专业类别偏好：${mp.majorCategories.join('、')}`);
      }

      if (mp.skills && mp.skills.length > 0) {
        sections.push(`擅长技能：${mp.skills.join('、')}`);
      }

      if (mp.interests && mp.interests.length > 0) {
        sections.push(`兴趣爱好：${mp.interests.join('、')}`);
      }

      if (mp.excludedMajors && mp.excludedMajors.length > 0) {
        sections.push(`排除专业：${mp.excludedMajors.join('、')}`);
      }
    }

    // 4. 院校偏好
    if (profile.collegePreferences) {
      sections.push('\n院校偏好：');
      const cp = profile.collegePreferences;

      if (cp.schoolLevels && cp.schoolLevels.length > 0) {
        sections.push(`院校层次：${cp.schoolLevels.join('、')}`);
      }

      if (cp.preferredProvinces && cp.preferredProvinces.length > 0) {
        sections.push(`地域偏好：${cp.preferredProvinces.join('、')}`);
      }

      if (cp.excludedCities && cp.excludedCities.length > 0) {
        sections.push(`排除城市：${cp.excludedCities.join('、')}`);
      }

      if (cp.campusEnvironment && cp.campusEnvironment.length > 0) {
        sections.push(`校园环境：${cp.campusEnvironment.join('、')}`);
      }
    }

    // 5. 就业目标
    if (profile.careerGoals) {
      sections.push('\n就业目标：');
      const cg = profile.careerGoals;

      if (cg.targetIndustries && cg.targetIndustries.length > 0) {
        sections.push(`目标行业：${cg.targetIndustries.join('、')}`);
      }

      if (cg.targetPositions && cg.targetPositions.length > 0) {
        sections.push(`目标岗位：${cg.targetPositions.join('、')}`);
      }

      if (cg.salaryExpectation) {
        sections.push(`薪资期望：${cg.salaryExpectation}元/月以上`);
      }

      if (cg.workLocation && cg.workLocation.length > 0) {
        sections.push(`工作地点：${cg.workLocation.join('、')}`);
      }
    }

    // 6. 学习与生活
    if (profile.lifestyle) {
      sections.push('\n学习生活：');
      const ls = profile.lifestyle;

      if (ls.studyIntensity) {
        sections.push(`学习强度偏好：${ls.studyIntensity}`);
      }

      if (ls.campusActivities && ls.campusActivities.length > 0) {
        sections.push(`校园活动：${ls.campusActivities.join('、')}`);
      }

      if (ls.socialPreference) {
        sections.push(`社交偏好：${ls.socialPreference}`);
      }
    }

    // 7. 家庭与经济
    if (profile.familyFactors) {
      sections.push('\n家庭经济：');
      const ff = profile.familyFactors;

      if (ff.tuitionBudget) {
        sections.push(`学费预算：每年${ff.tuitionBudget}元以内`);
      }

      if (ff.distanceFromHome) {
        sections.push(`距离家乡：${ff.distanceFromHome}`);
      }

      if (ff.parentExpectations && ff.parentExpectations.length > 0) {
        sections.push(`家长期望：${ff.parentExpectations.join('、')}`);
      }
    }

    return sections.join('\n');
  }

  /**
   * 批量检查偏好变化
   */
  async hasPreferencesChanged(
    userId: string,
    sessionId: string,
    currentPreferences: AgentPreference[]
  ): Promise<boolean> {
    const cached = await cacheService.getUserPreferences(userId, sessionId);
    if (!cached) return true;

    const currentHash = this.generatePreferencesHash(currentPreferences);
    return cached.hash !== currentHash;
  }
}

export default new PreferenceEmbeddingService();
