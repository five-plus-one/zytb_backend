import { AppDataSource } from '../../config/database';
import { AgentPreference } from '../../models/AgentPreference';
import { CoreCollege } from '../../models/core/CoreCollege';
import { CoreEnrollmentPlan } from '../../models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../../models/core/CoreAdmissionScore';
import { CoreMajor } from '../../models/core/CoreMajor';
import { getRedisClient } from '../../config/redis';

/**
 * 智能多维度加权推荐引擎 V2
 *
 * 核心创新：
 * 1. 多级候选池扩展机制（确保至少有推荐结果）
 * 2. 位次+分数双轨匹配（处理位次缺失情况）
 * 3. 100指标体系加权评分
 * 4. 数据质量评分和置信度标记
 * 5. 用户偏好权重动态调整
 */

// ============ 核心数据结构 ============

interface UserContext {
  userId: string;
  sessionId: string;
  examScore: number;
  scoreRank?: number;
  province: string;
  subjectType: string;
  preferences: AgentPreference[];
}

interface UserWeights {
  // 核心权重 (来自 CORE_01, CORE_02, CORE_03)
  college: number;      // 院校权重 0-100
  major: number;        // 专业权重 0-100
  city: number;         // 城市权重 0-100
  employment: number;   // 就业权重 0-100
  furtherStudy: number; // 深造权重 0-100
  interest: number;     // 兴趣权重 0-100
  prospect: number;     // 前景权重 0-100
}

interface UserPreferenceFilters {
  targetRegions?: string[];  // 目标地域 (SEC_08)
  targetMajors?: string[];   // 目标专业 (SEC_09)
  targetColleges?: string[]; // 目标院校 (SEC_05)
  avoidRegions?: string[];   // 排除地域
  avoidMajors?: string[];    // 排除专业
}

interface Candidate {
  // 基础信息
  collegeId: string;
  collegeName: string;
  collegeCode?: string;
  collegeProvince?: string;
  collegeCity?: string;
  collegeIs985?: boolean;
  collegeIs211?: boolean;
  collegeIsDoubleFirstClass?: boolean;
  majorGroupCode?: string;
  majorGroupName?: string;

  // 院校详情
  province?: string;
  city?: string;
  is985?: boolean;
  is211?: boolean;
  postgraduateRate?: number;

  // 专业列表
  majors: Array<{
    majorName: string;
    majorCode?: string;
    majorCategory?: string;
    planCount: number;
    tuition?: number;
  }>;

  // 历史录取数据
  historicalMinScore?: number;
  historicalAvgScore?: number;
  historicalMinRank?: number;
  year?: number;

  // 匹配度评分 (0-100)
  scores: {
    collegeScore: number;     // 院校维度得分
    majorScore: number;       // 专业维度得分
    cityScore: number;        // 城市维度得分
    admissionScore: number;   // 录取可能性得分
    employmentScore: number;  // 就业前景得分
    campusLifeScore: number;  // 校园生活得分
    weightedTotal: number;    // 加权总分
  };

  // 数据质量
  dataQuality: {
    hasRankData: boolean;          // 是否有位次数据
    hasHistoricalData: boolean;    // 是否有历史数据
    matchLevel: 'exact' | 'fuzzy' | 'fallback'; // 匹配级别
    confidenceScore: number;       // 置信度 0-100
  };

  // 分类
  riskLevel: 'high' | 'medium' | 'low';  // 冲/稳/保
  admissionProbability: number;           // 录取概率 0-100

  // 推荐理由
  matchingReasons: string[];
  riskWarnings: string[];
}

// ============ 主推荐引擎 ============

export class WeightedRecommendationEngine {
  private redis = getRedisClient();
  private readonly CACHE_TTL = 3600; // 1小时缓存
  private readonly CACHE_KEY_PREFIX = 'rec:v2:';

  /**
   * 主入口：生成推荐
   */
  async generateRecommendations(
    context: UserContext,
    targetCount: number = 60
  ): Promise<Candidate[]> {
    console.log('\n🚀 === 多维度加权推荐引擎 V2 启动 ===');
    console.log(`📊 用户: 分数=${context.examScore}, 位次=${context.scoreRank || '未知'}, 省份=${context.province}`);

    // 尝试从缓存获取推荐结果
    const cacheKey = this.buildCacheKey(context, targetCount);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        console.log('✅ 从缓存加载推荐结果');
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('⚠️  Redis缓存读取失败，继续正常流程:', (error as Error).message);
    }

    // Step 1: 提取用户偏好权重
    const weights = this.extractUserWeights(context.preferences);
    console.log(`⚖️  用户权重: 院校=${weights.college}%, 专业=${weights.major}%, 城市=${weights.city}%`);

    // Step 1.5: 提取用户偏好过滤条件
    const filters = this.extractUserPreferenceFilters(context.preferences);
    if (filters.targetRegions && filters.targetRegions.length > 0) {
      console.log(`🎯 目标地域: ${filters.targetRegions.join(', ')}`);
    }
    if (filters.targetMajors && filters.targetMajors.length > 0) {
      console.log(`🎯 目标专业: ${filters.targetMajors.join(', ')}`);
    }
    if (filters.targetColleges && filters.targetColleges.length > 0) {
      console.log(`🎯 目标院校: ${filters.targetColleges.join(', ')}`);
    }

    // Step 2: 计算用户位次（如果没有）
    let userRank = context.scoreRank;
    if (!userRank) {
      userRank = await this.calculateUserRank(context.examScore, context.province, context.subjectType);
      console.log(`📍 计算得到位次: ${userRank}`);
    }

    // Step 3: 多级候选池扩展
    const candidates = await this.buildCandidatePool(context, userRank, filters);
    console.log(`📦 候选池大小: ${candidates.length}`);

    if (candidates.length === 0) {
      console.warn('⚠️ 未找到任何候选，返回空列表');
      return [];
    }

    // Step 4: 多维度加权评分
    const scoredCandidates = await this.scoreAndRankCandidates(candidates, context, weights);
    console.log(`✅ 评分完成: ${scoredCandidates.length} 个候选`);

    // Step 5: 按冲稳保分类并平衡
    const balanced = this.balanceRiskDistribution(scoredCandidates, targetCount);
    console.log(`🎯 最终推荐: ${balanced.length} 个 (冲/稳/保平衡)`);

    // 缓存推荐结果
    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(balanced));
      console.log(`💾 推荐结果已缓存 (TTL: ${this.CACHE_TTL}s)`);
    } catch (error) {
      console.warn('⚠️  Redis缓存写入失败:', (error as Error).message);
    }

    return balanced;
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(context: UserContext, targetCount: number): string {
    // 使用分数、省份、科类、位次作为缓存键
    // 注意：不包括preferences，因为偏好可能频繁变化
    const parts = [
      this.CACHE_KEY_PREFIX,
      context.province,
      context.subjectType,
      Math.floor(context.examScore / 10) * 10, // 10分为一个区间
      context.scoreRank ? Math.floor(context.scoreRank / 1000) * 1000 : 'norank', // 1000位次为一个区间
      targetCount
    ];
    return parts.join(':');
  }

  /**
   * 提取用户偏好权重
   */
  private extractUserWeights(preferences: AgentPreference[]): UserWeights {
    const weights: UserWeights = {
      college: 33,
      major: 34,
      city: 33,
      employment: 50,
      furtherStudy: 50,
      interest: 50,
      prospect: 50
    };

    // 从用户偏好中提取权重分配
    for (const pref of preferences) {
      if (pref.indicatorId === 'CORE_01') {
        // 院校-专业-城市权重分配
        try {
          const value = JSON.parse(pref.value);
          weights.college = value.college || 33;
          weights.major = value.major || 34;
          weights.city = value.city || 33;
        } catch (e) {}
      } else if (pref.indicatorId === 'CORE_02') {
        // 就业-深造权重
        try {
          const value = JSON.parse(pref.value);
          weights.employment = value.employment || 50;
          weights.furtherStudy = value.furtherStudy || 50;
        } catch (e) {}
      } else if (pref.indicatorId === 'CORE_03') {
        // 兴趣-前景权重
        try {
          const value = JSON.parse(pref.value);
          weights.interest = value.interest || 50;
          weights.prospect = value.prospect || 50;
        } catch (e) {}
      }
    }

    return weights;
  }

  /**
   * 提取用户偏好过滤条件（目标地域、专业等）
   */
  private extractUserPreferenceFilters(preferences: AgentPreference[]): UserPreferenceFilters {
    const filters: UserPreferenceFilters = {};

    for (const pref of preferences) {
      try {
        if (pref.indicatorId === 'SEC_08') {
          // 目标地域（省份或城市）
          const value = typeof pref.value === 'string' ? JSON.parse(pref.value) : pref.value;
          if (Array.isArray(value)) {
            filters.targetRegions = value;
          } else if (typeof value === 'string') {
            filters.targetRegions = [value];
          }
        } else if (pref.indicatorId === 'SEC_09') {
          // 目标专业
          const value = typeof pref.value === 'string' ? JSON.parse(pref.value) : pref.value;
          if (Array.isArray(value)) {
            filters.targetMajors = value;
          } else if (typeof value === 'string') {
            filters.targetMajors = [value];
          }
        } else if (pref.indicatorId === 'SEC_05') {
          // 目标院校
          const value = typeof pref.value === 'string' ? JSON.parse(pref.value) : pref.value;
          if (Array.isArray(value)) {
            filters.targetColleges = value;
          } else if (typeof value === 'string') {
            filters.targetColleges = [value];
          }
        }
      } catch (e) {
        console.warn(`解析偏好 ${pref.indicatorId} 失败:`, e);
      }
    }

    return filters;
  }

  /**
   * 应用用户偏好过滤到招生计划查询
   */
  private applyPreferenceFilters(
    query: any,
    filters: UserPreferenceFilters
  ): void {
    // 应用地域过滤
    if (filters.targetRegions && filters.targetRegions.length > 0) {
      query.andWhere(
        '(plan.collegeProvince IN (:...regions) OR plan.collegeCity IN (:...regions))',
        { regions: filters.targetRegions }
      );
    }

    // 应用专业过滤
    if (filters.targetMajors && filters.targetMajors.length > 0) {
      const majorConditions = filters.targetMajors.map((major, idx) =>
        `(plan.majorName LIKE :major${idx} OR plan.majorGroupName LIKE :major${idx})`
      ).join(' OR ');
      query.andWhere(`(${majorConditions})`);
      filters.targetMajors.forEach((major, idx) => {
        query.setParameter(`major${idx}`, `%${major}%`);
      });
    }

    // 应用院校过滤
    if (filters.targetColleges && filters.targetColleges.length > 0) {
      query.andWhere('plan.collegeName IN (:...colleges)', { colleges: filters.targetColleges });
    }
  }

  /**
   * 计算用户位次
   */
  private async calculateUserRank(score: number, province: string, subjectType: string): Promise<number> {
    const result = await AppDataSource.query(`
      SELECT \`rank\`
      FROM score_rankings
      WHERE province = ?
        AND subject_type = ?
        AND score <= ?
      ORDER BY score DESC
      LIMIT 1
    `, [province, subjectType, score]);

    if (result && result.length > 0 && result[0].rank) {
      return result[0].rank;
    }

    // 如果没有精确匹配，使用估算
    // 假设每分约200名的差距（江苏省中高分段经验值）
    const baseScore = 600;
    const baseRank = 10000;
    const estimatedRank = baseRank - (score - baseScore) * 200;
    return Math.max(1, estimatedRank);
  }

  /**
   * 多级候选池构建
   *
   * 策略：
   * Level 1: 精确匹配（院校+专业组+位次）
   * Level 2: 模糊匹配（院校+位次，忽略专业组）
   * Level 3: 分数匹配（院校+分数差，忽略位次）
   * Level 4: 宽松匹配（扩大位次/分数范围）
   */
  private async buildCandidatePool(
    context: UserContext,
    userRank: number,
    filters: UserPreferenceFilters
  ): Promise<Candidate[]> {
    console.log('\n🔍 === 构建候选池（多级扩展）===');

    let candidates: Candidate[] = [];

    // Level 1: 精确匹配（位次 ± 动态范围）
    candidates = await this.fetchCandidatesLevel1(context, userRank, filters);
    console.log(`  Level 1 (精确匹配): ${candidates.length} 个候选`);

    if (candidates.length >= 30) {
      return candidates;
    }

    // Level 2: 模糊匹配（忽略专业组精确匹配）
    const level2 = await this.fetchCandidatesLevel2(context, userRank, filters);
    candidates = this.mergeCandidates(candidates, level2);
    console.log(`  Level 2 (模糊匹配): ${candidates.length} 个候选`);

    if (candidates.length >= 30) {
      return candidates;
    }

    // Level 3: 分数匹配（处理位次缺失情况）
    const level3 = await this.fetchCandidatesLevel3(context, filters);
    candidates = this.mergeCandidates(candidates, level3);
    console.log(`  Level 3 (分数匹配): ${candidates.length} 个候选`);

    if (candidates.length >= 20) {
      return candidates;
    }

    // Level 4: 宽松匹配（扩大范围）
    const level4 = await this.fetchCandidatesLevel4(context, userRank, filters);
    candidates = this.mergeCandidates(candidates, level4);
    console.log(`  Level 4 (宽松匹配): ${candidates.length} 个候选`);

    return candidates;
  }

  /**
   * Level 1: 精确匹配 - 使用动态位次区间
   */
  private async fetchCandidatesLevel1(
    context: UserContext,
    userRank: number,
    filters: UserPreferenceFilters
  ): Promise<Candidate[]> {
    // 动态计算位次区间（根据分数段调整）
    const rankRange = this.calculateDynamicRankRange(userRank, context.examScore);

    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    // 查询招生计划 - 应用用户偏好过滤
    const planQuery = planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${context.subjectType}%` })
      .andWhere('plan.year >= :year', { year: new Date().getFullYear() - 1 });

    // 应用偏好过滤
    this.applyPreferenceFilters(planQuery, filters);

    const plans = await planQuery.getMany();

    if (plans.length === 0) {
      return [];
    }

    const candidates: Candidate[] = [];

    // 按院校+专业组分组
    const grouped = this.groupPlansByCollegeMajorGroup(plans);

    for (const [key, groupPlans] of grouped.entries()) {
      const firstPlan = groupPlans[0];

      // 查询历史录取分数（精确匹配专业组）
      const query = scoreRepo
        .createQueryBuilder('score')
        .where('score.sourceProvince = :province', { province: context.province })
        .andWhere('score.collegeName = :collegeName', { collegeName: firstPlan.collegeName })
        .andWhere('score.subjectType = :subjectType', { subjectType: context.subjectType })
        .andWhere('score.minRank IS NOT NULL')
        .andWhere('score.minRank >= :minRank', { minRank: rankRange.min })
        .andWhere('score.minRank <= :maxRank', { maxRank: rankRange.max });

      // 只有当 majorGroupCode 不为 null 时才添加专业组过滤
      if (firstPlan.majorGroupCode) {
        query.andWhere('score.majorGroup = :majorGroup', { majorGroup: firstPlan.majorGroupCode });
      }

      const scores = await query
        .orderBy('score.year', 'DESC')
        .limit(3)
        .getMany();

      if (scores.length > 0) {
        candidates.push(this.buildCandidate(groupPlans, scores[0], 'exact'));
      }
    }

    return candidates;
  }

  /**
   * 动态计算位次区间
   *
   * 高分段（排名<1000）: 使用排名的 ±300%（因为竞争激烈，位次波动大）
   * 中分段（1000-10000）: 使用排名的 ±50%
   * 低分段（>10000）: 使用固定值 ±5000
   */
  private calculateDynamicRankRange(userRank: number, userScore: number): { min: number; max: number } {
    let offset: number;

    if (userRank < 1000) {
      // 高分段：位次波动大，使用3倍范围
      offset = userRank * 3;
      console.log(`  📊 高分段策略: 排名${userRank} → 范围±${offset}`);
    } else if (userRank < 10000) {
      // 中分段：使用50%范围
      offset = userRank * 0.5;
      console.log(`  📊 中分段策略: 排名${userRank} → 范围±${offset}`);
    } else {
      // 低分段：固定5000
      offset = 5000;
      console.log(`  📊 低分段策略: 排名${userRank} → 范围±${offset}`);
    }

    return {
      min: Math.max(1, Math.round(userRank - offset)),
      max: Math.round(userRank + offset * 2) // 保底范围更大
    };
  }

  /**
   * Level 2: 模糊匹配 - 忽略专业组精确匹配
   */
  private async fetchCandidatesLevel2(
    context: UserContext,
    userRank: number,
    filters: UserPreferenceFilters
  ): Promise<Candidate[]> {
    const rankRange = this.calculateDynamicRankRange(userRank, context.examScore);
    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    const planQuery = planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${context.subjectType}%` });

    this.applyPreferenceFilters(planQuery, filters);
    const plans = await planQuery.getMany();

    const candidates: Candidate[] = [];
    const grouped = this.groupPlansByCollegeMajorGroup(plans);

    for (const [key, groupPlans] of grouped.entries()) {
      const firstPlan = groupPlans[0];

      // 模糊匹配：只按院校名称，不限制专业组
      const scores = await scoreRepo
        .createQueryBuilder('score')
        .where('score.sourceProvince = :province', { province: context.province })
        .andWhere('score.collegeName = :collegeName', { collegeName: firstPlan.collegeName })
        .andWhere('score.subjectType = :subjectType', { subjectType: context.subjectType })
        .andWhere('score.minRank IS NOT NULL')
        .andWhere('score.minRank >= :minRank', { minRank: rankRange.min })
        .andWhere('score.minRank <= :maxRank', { maxRank: rankRange.max })
        .orderBy('score.year', 'DESC')
        .limit(1)
        .getMany();

      if (scores.length > 0) {
        candidates.push(this.buildCandidate(groupPlans, scores[0], 'fuzzy'));
      }
    }

    return candidates;
  }

  /**
   * Level 3: 分数匹配 - 处理位次缺失情况
   */
  private async fetchCandidatesLevel3(context: UserContext, filters: UserPreferenceFilters): Promise<Candidate[]> {
    const scoreRange = this.calculateScoreRange(context.examScore);
    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    const planQuery = planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${context.subjectType}%` });

    this.applyPreferenceFilters(planQuery, filters);
    const plans = await planQuery.getMany();

    const candidates: Candidate[] = [];
    const grouped = this.groupPlansByCollegeMajorGroup(plans);

    for (const [key, groupPlans] of grouped.entries()) {
      const firstPlan = groupPlans[0];

      // 使用分数范围查询（兜底策略）
      const scores = await scoreRepo
        .createQueryBuilder('score')
        .where('score.sourceProvince = :province', { province: context.province })
        .andWhere('score.collegeName = :collegeName', { collegeName: firstPlan.collegeName })
        .andWhere('score.subjectType = :subjectType', { subjectType: context.subjectType })
        .andWhere('score.minScore IS NOT NULL')
        .andWhere('score.minScore >= :minScore', { minScore: scoreRange.min })
        .andWhere('score.minScore <= :maxScore', { maxScore: scoreRange.max })
        .orderBy('score.year', 'DESC')
        .limit(1)
        .getMany();

      if (scores.length > 0) {
        candidates.push(this.buildCandidate(groupPlans, scores[0], 'fallback'));
      }
    }

    return candidates;
  }

  /**
   * Level 4: 宽松匹配 - 扩大范围确保有结果
   */
  private async fetchCandidatesLevel4(
    context: UserContext,
    userRank: number,
    filters: UserPreferenceFilters
  ): Promise<Candidate[]> {
    // 扩大到3倍范围
    const wideRange = {
      min: Math.max(1, userRank - userRank * 2),
      max: userRank + userRank * 3
    };

    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    // 直接从录取分数表查询，不限制专业组
    const scores = await scoreRepo
      .createQueryBuilder('score')
      .where('score.sourceProvince = :province', { province: context.province })
      .andWhere('score.subjectType = :subjectType', { subjectType: context.subjectType })
      .andWhere('score.minRank >= :minRank', { minRank: wideRange.min })
      .andWhere('score.minRank <= :maxRank', { maxRank: wideRange.max })
      .orderBy('score.year', 'DESC')
      .limit(100)
      .getMany();

    // 为每个录取分数查找对应的招生计划
    const candidates: Candidate[] = [];
    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);

    for (const score of scores) {
      const planQuery = planRepo
        .createQueryBuilder('plan')
        .where('plan.sourceProvince = :province', { province: context.province })
        .andWhere('plan.collegeName = :collegeName', { collegeName: score.collegeName });

      this.applyPreferenceFilters(planQuery, filters);
      const plans = await planQuery.limit(6).getMany();

      if (plans.length > 0) {
        candidates.push(this.buildCandidate(plans, score, 'fallback'));
      }
    }

    return candidates;
  }

  /**
   * 计算分数范围
   */
  private calculateScoreRange(userScore: number): { min: number; max: number } {
    // 高分段分数变化敏感
    if (userScore >= 650) {
      return { min: userScore - 30, max: userScore + 10 };
    } else if (userScore >= 600) {
      return { min: userScore - 40, max: userScore + 20 };
    } else {
      return { min: userScore - 50, max: userScore + 30 };
    }
  }

  /**
   * 按院校+专业组分组
   */
  private groupPlansByCollegeMajorGroup(
    plans: CoreEnrollmentPlan[]
  ): Map<string, CoreEnrollmentPlan[]> {
    const grouped = new Map<string, CoreEnrollmentPlan[]>();

    for (const plan of plans) {
      const key = `${plan.collegeCode || plan.collegeName}-${plan.majorGroupCode || 'default'}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(plan);
    }

    return grouped;
  }

  /**
   * 构建候选对象
   */
  private buildCandidate(
    plans: CoreEnrollmentPlan[],
    admissionScore: CoreAdmissionScore,
    matchLevel: 'exact' | 'fuzzy' | 'fallback'
  ): Candidate {
    const firstPlan = plans[0];

    return {
      collegeId: firstPlan.collegeId,
      collegeName: firstPlan.collegeName,
      collegeCode: firstPlan.collegeCode || undefined,
      collegeProvince: firstPlan.collegeProvince || undefined,
      collegeCity: firstPlan.collegeCity || undefined,
      collegeIs985: firstPlan.collegeIs985 || false,
      collegeIs211: firstPlan.collegeIs211 || false,
      collegeIsDoubleFirstClass: firstPlan.collegeIsWorldClass || false,
      majorGroupCode: firstPlan.majorGroupCode || undefined,
      majorGroupName: firstPlan.majorGroupName || undefined,
      province: firstPlan.collegeProvince || undefined,
      city: firstPlan.collegeCity || undefined,
      is985: firstPlan.collegeIs985 || false,
      is211: firstPlan.collegeIs211 || false,
      majors: plans.slice(0, 6).map(p => ({
        majorName: p.majorName || '未知专业',
        majorCode: p.majorCode || undefined,
        majorCategory: p.majorCategory || undefined,
        planCount: p.planCount,
        tuition: p.tuition || undefined
      })),
      historicalMinScore: admissionScore.minScore || undefined,
      historicalAvgScore: admissionScore.avgScore || undefined,
      historicalMinRank: admissionScore.minRank || undefined,
      year: admissionScore.year,
      scores: {
        collegeScore: 0,
        majorScore: 0,
        cityScore: 0,
        admissionScore: 0,
        employmentScore: 0,
        campusLifeScore: 0,
        weightedTotal: 0
      },
      dataQuality: {
        hasRankData: !!admissionScore.minRank,
        hasHistoricalData: true,
        matchLevel: matchLevel,
        confidenceScore: matchLevel === 'exact' ? 100 : matchLevel === 'fuzzy' ? 80 : 60
      },
      riskLevel: 'medium',
      admissionProbability: 50,
      matchingReasons: [],
      riskWarnings: []
    };
  }

  /**
   * 合并候选列表（去重）
   */
  private mergeCandidates(existing: Candidate[], newCandidates: Candidate[]): Candidate[] {
    const existingKeys = new Set(
      existing.map(c => `${c.collegeName}-${c.majorGroupCode || 'default'}`)
    );

    const merged = [...existing];

    for (const candidate of newCandidates) {
      const key = `${candidate.collegeName}-${candidate.majorGroupCode || 'default'}`;
      if (!existingKeys.has(key)) {
        merged.push(candidate);
        existingKeys.add(key);
      }
    }

    return merged;
  }

  /**
   * 多维度评分和排序
   */
  private async scoreAndRankCandidates(
    candidates: Candidate[],
    context: UserContext,
    weights: UserWeights
  ): Promise<Candidate[]> {
    console.log('\n📊 === 多维度加权评分 ===');

    // 批量获取院校详情和专业详情
    const collegeIds = [...new Set(candidates.map(c => c.collegeId))];
    const colleges = await this.batchFetchColleges(collegeIds);
    const collegeMap = new Map(colleges.map(c => [c.id, c]));

    for (const candidate of candidates) {
      const college = collegeMap.get(candidate.collegeId);

      // 1. 院校维度评分 (0-100)
      candidate.scores.collegeScore = this.scoreCollege(candidate, college, context);

      // 2. 专业维度评分 (0-100)
      candidate.scores.majorScore = await this.scoreMajor(candidate, context);

      // 3. 城市维度评分 (0-100)
      candidate.scores.cityScore = this.scoreCity(candidate, context);

      // 4. 录取可能性评分 (0-100)
      candidate.scores.admissionScore = this.scoreAdmissionProbability(
        candidate,
        context.examScore,
        context.scoreRank
      );

      // 5. 就业前景评分 (0-100)
      candidate.scores.employmentScore = await this.scoreEmployment(candidate);

      // 6. 校园生活评分 (0-100)
      candidate.scores.campusLifeScore = this.scoreCampusLife(candidate, college);

      // 7. 加权总分计算
      candidate.scores.weightedTotal = this.calculateWeightedTotal(candidate.scores, weights);

      // 8. 确定录取概率和风险等级
      this.determineRiskLevel(candidate, context.examScore, context.scoreRank);

      // 9. 生成推荐理由
      this.generateMatchingReasons(candidate, college, weights);
    }

    // 按加权总分排序
    candidates.sort((a, b) => b.scores.weightedTotal - a.scores.weightedTotal);

    console.log(`  Top 5 候选:`);
    candidates.slice(0, 5).forEach((c, i) => {
      console.log(`    ${i + 1}. ${c.collegeName} - 总分:${c.scores.weightedTotal.toFixed(1)} (院校:${c.scores.collegeScore.toFixed(0)}, 专业:${c.scores.majorScore.toFixed(0)}, 录取:${c.scores.admissionScore.toFixed(0)})`);
    });

    return candidates;
  }

  // 待续...后续评分方法
  private async batchFetchColleges(collegeIds: string[]): Promise<CoreCollege[]> {
    if (collegeIds.length === 0) return [];

    const colleges: CoreCollege[] = [];
    const uncachedIds: string[] = [];

    // 先尝试从缓存获取
    for (const id of collegeIds) {
      const cacheKey = `college:${id}`;
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          colleges.push(JSON.parse(cached));
        } else {
          uncachedIds.push(id);
        }
      } catch (error) {
        uncachedIds.push(id);
      }
    }

    // 从数据库查询未缓存的院校
    if (uncachedIds.length > 0) {
      const repo = AppDataSource.getRepository(CoreCollege);
      const fetchedColleges = await repo.createQueryBuilder('college')
        .whereInIds(uncachedIds)
        .getMany();

      // 缓存新获取的院校数据 (24小时)
      for (const college of fetchedColleges) {
        try {
          await this.redis.setex(`college:${college.id}`, 86400, JSON.stringify(college));
        } catch (error) {
          // 缓存失败不影响主流程
        }
      }

      colleges.push(...fetchedColleges);
    }

    return colleges;
  }

  private scoreCollege(candidate: Candidate, college: CoreCollege | undefined, context: UserContext): number {
    let score = 50; // 基础分

    if (!college) return score;

    const preferences = context.preferences || [];

    // 985/211加分
    if (college.is985) score += 25;
    else if (college.is211) score += 15;
    else if (college.isDoubleFirstClass) score += 10;

    // 保研率加分
    if (college.postgraduateRate) {
      score += Math.min(15, college.postgraduateRate / 2);
    }

    // 排名加分
    if (college.rank && college.rank <= 50) {
      score += 10;
    } else if (college.rank && college.rank <= 100) {
      score += 5;
    }

    // CORE_12: 院校类型偏好 (综合/理工/师范/医药等)
    const collegeTypePref = preferences.find(p => p.indicatorId === 'CORE_12');
    if (collegeTypePref && collegeTypePref.value && college.type) {
      const preferredTypes = Array.isArray(collegeTypePref.value) ? collegeTypePref.value : [collegeTypePref.value];

      const typeMatch = preferredTypes.some(type =>
        college.type && college.type.includes(type)
      );

      if (typeMatch) {
        score += 10;
      }
    }

    // CORE_14: 院校规模偏好
    const collegeSizePref = preferences.find(p => p.indicatorId === 'CORE_14');
    if (collegeSizePref && collegeSizePref.value) {
      // TODO: 需要在 core_colleges 中添加学校规模字段
      // 暂时基于是否985/211判断
    }

    // CORE_16: 保研率重视程度
    const postgraduateRatePref = preferences.find(p => p.indicatorId === 'CORE_16');
    if (postgraduateRatePref && postgraduateRatePref.value === 'high' && college.postgraduateRate) {
      // 如果用户很重视保研率，且学校保研率高，额外加分
      if (college.postgraduateRate > 20) {
        score += 10;
      }
    }

    // SEC_04: 院校排名范围偏好
    const rankingPref = preferences.find(p => p.indicatorId === 'SEC_04');
    if (rankingPref && rankingPref.value && college.rank) {
      const preferredRange = rankingPref.value; // 如: "前50名", "前100名"
      if (preferredRange === '前50名' && college.rank <= 50) {
        score += 12;
      } else if (preferredRange === '前100名' && college.rank <= 100) {
        score += 8;
      }
    }

    // SEC_10: 男女比例偏好
    const genderRatioPref = preferences.find(p => p.indicatorId === 'SEC_10');
    if (genderRatioPref && genderRatioPref.value && college.femaleRatio && college.maleRatio) {
      const preferredRatio = genderRatioPref.value; // 如: "男女均衡", "偏女生多", "偏男生多"

      const femaleRatio = Number(college.femaleRatio);
      const maleRatio = Number(college.maleRatio);

      if (preferredRatio === '男女均衡' && Math.abs(femaleRatio - maleRatio) < 15) {
        score += 5;
      } else if (preferredRatio === '偏女生多' && femaleRatio > maleRatio + 10) {
        score += 5;
      } else if (preferredRatio === '偏男生多' && maleRatio > femaleRatio + 10) {
        score += 5;
      }
    }

    return Math.min(100, score);
  }

  private async scoreMajor(candidate: Candidate, context: UserContext): Promise<number> {
    let score = 50; // 基础分

    // 获取用户的专业偏好指标
    const preferences = context.preferences || [];
    const majorPrefs = preferences.filter(p =>
      p.indicatorId === 'CORE_09' || // 目标专业类别
      p.indicatorId === 'CORE_10' || // 具体目标专业
      p.indicatorId === 'CORE_11' || // 专业选择灵活度
      p.indicatorId === 'SEC_01' ||  // 专业兴趣领域
      p.indicatorId === 'SEC_02'     // 专业排斥领域
    );

    if (majorPrefs.length === 0) return score;

    // CORE_10: 检查是否匹配用户的目标专业
    const targetMajorPref = majorPrefs.find(p => p.indicatorId === 'CORE_10');
    if (targetMajorPref && targetMajorPref.value) {
      const targetMajors = Array.isArray(targetMajorPref.value) ? targetMajorPref.value : [targetMajorPref.value];
      const candidateMajorNames = candidate.majors.map(m => m.majorName);

      // 完全匹配目标专业
      const hasExactMatch = targetMajors.some(target =>
        candidateMajorNames.some(name => name.includes(target) || target.includes(name))
      );

      if (hasExactMatch) {
        score += 30; // 大幅加分
      }
    }

    // CORE_09: 检查专业类别匹配
    const majorCategoryPref = majorPrefs.find(p => p.indicatorId === 'CORE_09');
    if (majorCategoryPref && majorCategoryPref.value) {
      const preferredCategories = Array.isArray(majorCategoryPref.value) ? majorCategoryPref.value : [majorCategoryPref.value];
      const candidateMajorCategories = candidate.majors.map(m => m.majorCategory || '');

      const hasCategoryMatch = preferredCategories.some(cat =>
        candidateMajorCategories.some(candidateCat => candidateCat && candidateCat.includes(cat))
      );

      if (hasCategoryMatch) {
        score += 15;
      }
    }

    // SEC_02: 检查是否有排斥的专业
    const avoidMajorPref = majorPrefs.find(p => p.indicatorId === 'SEC_02');
    if (avoidMajorPref && avoidMajorPref.value) {
      const avoidMajors = Array.isArray(avoidMajorPref.value) ? avoidMajorPref.value : [avoidMajorPref.value];
      const candidateMajorNames = candidate.majors.map(m => m.majorName);

      const hasAvoidMatch = avoidMajors.some(avoid =>
        candidateMajorNames.some(name => name.includes(avoid) || avoid.includes(name))
      );

      if (hasAvoidMatch) {
        score -= 40; // 大幅减分
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreCity(candidate: Candidate, context: UserContext): number {
    let score = 50; // 基础分

    const preferences = context.preferences || [];

    // CORE_20: 目标城市偏好
    const targetCityPref = preferences.find(p => p.indicatorId === 'CORE_20');
    if (targetCityPref && targetCityPref.value) {
      const preferredCities = Array.isArray(targetCityPref.value) ? targetCityPref.value : [targetCityPref.value];

      // 完全匹配目标城市
      const cityMatch = preferredCities.some(city =>
        candidate.collegeCity && (candidate.collegeCity.includes(city) || city.includes(candidate.collegeCity))
      );

      if (cityMatch) {
        score += 35; // 大幅加分
      }
    }

    // CORE_21: 目标省份偏好
    const targetProvincePref = preferences.find(p => p.indicatorId === 'CORE_21');
    if (targetProvincePref && targetProvincePref.value) {
      const preferredProvinces = Array.isArray(targetProvincePref.value) ? targetProvincePref.value : [targetProvincePref.value];

      const provinceMatch = preferredProvinces.some(province =>
        candidate.collegeProvince && (candidate.collegeProvince.includes(province) || province.includes(candidate.collegeProvince))
      );

      if (provinceMatch) {
        score += 20;
      }
    }

    // SEC_14: 地域偏好（城市规模）
    const cityScalePref = preferences.find(p => p.indicatorId === 'SEC_14');
    if (cityScalePref && cityScalePref.value) {
      const preferredScale = cityScalePref.value; // '一线城市', '新一线', '二线', etc.

      // 简化版：根据已知城市判断规模
      const tier1Cities = ['北京', '上海', '广州', '深圳'];
      const newTier1Cities = ['成都', '杭州', '重庆', '武汉', '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛', '沈阳', '宁波', '昆明'];

      if (preferredScale === '一线城市' && candidate.collegeCity && tier1Cities.some(city => candidate.collegeCity!.includes(city))) {
        score += 15;
      } else if (preferredScale === '新一线城市' && candidate.collegeCity && newTier1Cities.some(city => candidate.collegeCity!.includes(city))) {
        score += 15;
      }
    }

    // SEC_15: 气候偏好
    const climatePref = preferences.find(p => p.indicatorId === 'SEC_15');
    if (climatePref && climatePref.value) {
      // 这里可以根据省份/城市映射气候类型，简化实现
      // TODO: 添加城市-气候映射表
    }

    // SEC_19: 地域排斥
    const avoidRegionPref = preferences.find(p => p.indicatorId === 'SEC_19');
    if (avoidRegionPref && avoidRegionPref.value) {
      const avoidRegions = Array.isArray(avoidRegionPref.value) ? avoidRegionPref.value : [avoidRegionPref.value];

      const hasAvoidMatch = avoidRegions.some(region =>
        (candidate.collegeProvince && candidate.collegeProvince.includes(region)) ||
        (candidate.collegeCity && candidate.collegeCity.includes(region))
      );

      if (hasAvoidMatch) {
        score -= 50; // 严重减分
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreAdmissionProbability(candidate: Candidate, userScore: number, userRank?: number): number {
    if (!candidate.historicalMinScore) return 50;

    const scoreDiff = userScore - candidate.historicalMinScore;

    // 分数高于历史最低分很多 = 录取概率高
    if (scoreDiff > 30) return 95;
    if (scoreDiff > 15) return 85;
    if (scoreDiff > 5) return 75;
    if (scoreDiff > -5) return 60;
    if (scoreDiff > -15) return 40;
    return 20;
  }

  private async scoreEmployment(candidate: Candidate): Promise<number> {
    let score = 50; // 基础分

    // 根据院校层次提供就业基础分
    if (candidate.collegeIs985) {
      score += 20; // 985院校就业优势明显
    } else if (candidate.collegeIs211) {
      score += 12;
    } else if (candidate.collegeIsDoubleFirstClass) {
      score += 8;
    }

    // TODO: 后续可以从 core_majors 表中获取专业的就业率数据
    // TODO: 可以整合 CORE_02 (就业-深造权重) 和 CORE_03 (兴趣-前景权重) 指标
    // TODO: 可以整合 SEC_06 (目标行业), SEC_07 (目标岗位) 等指标

    return Math.min(100, score);
  }

  private scoreCampusLife(candidate: Candidate, college: CoreCollege | undefined): number {
    if (!college) return 50;

    let score = 0;
    let count = 0;

    if (college.dormScore) { score += college.dormScore * 10; count++; }
    if (college.canteenScore) { score += college.canteenScore * 10; count++; }
    if (college.transportScore) { score += college.transportScore * 10; count++; }
    if (college.studyEnvironmentScore) { score += college.studyEnvironmentScore * 10; count++; }

    return count > 0 ? score / count : 50;
  }

  private calculateWeightedTotal(scores: any, weights: UserWeights): number {
    const totalWeight = weights.college + weights.major + weights.city;

    return (
      scores.collegeScore * (weights.college / totalWeight) +
      scores.majorScore * (weights.major / totalWeight) +
      scores.cityScore * (weights.city / totalWeight) +
      scores.admissionScore * 0.3 + // 录取概率固定权重
      scores.employmentScore * 0.1 +
      scores.campusLifeScore * 0.1
    );
  }

  private determineRiskLevel(candidate: Candidate, userScore: number, userRank?: number) {
    const prob = candidate.scores.admissionScore;

    if (prob >= 75) {
      candidate.riskLevel = 'low';
      candidate.admissionProbability = prob;
    } else if (prob >= 50) {
      candidate.riskLevel = 'medium';
      candidate.admissionProbability = prob;
    } else {
      candidate.riskLevel = 'high';
      candidate.admissionProbability = prob;
    }
  }

  private generateMatchingReasons(candidate: Candidate, college: CoreCollege | undefined, weights: UserWeights) {
    const reasons: string[] = [];

    if (college?.is985) reasons.push('985工程院校');
    if (college?.is211) reasons.push('211工程院校');
    if (candidate.scores.admissionScore > 80) reasons.push('录取概率较高');
    if (weights.city > 40 && candidate.city) reasons.push(`位于${candidate.city}`);

    candidate.matchingReasons = reasons;
  }

  private balanceRiskDistribution(candidates: Candidate[], targetCount: number): Candidate[] {
    const highAll = candidates.filter(c => c.riskLevel === 'high');
    const mediumAll = candidates.filter(c => c.riskLevel === 'medium');
    const lowAll = candidates.filter(c => c.riskLevel === 'low');

    console.log(`   ⚖️  风险分布统计: 冲=${highAll.length}, 稳=${mediumAll.length}, 保=${lowAll.length}`);

    const high = highAll.slice(0, Math.floor(targetCount * 0.3));
    const medium = mediumAll.slice(0, Math.floor(targetCount * 0.4));
    const low = lowAll.slice(0, Math.floor(targetCount * 0.3));

    console.log(`   🎯 按比例选取: 冲=${high.length}/${Math.floor(targetCount * 0.3)}, 稳=${medium.length}/${Math.floor(targetCount * 0.4)}, 保=${low.length}/${Math.floor(targetCount * 0.3)}`);

    return [...high, ...medium, ...low].slice(0, targetCount);
  }
}
