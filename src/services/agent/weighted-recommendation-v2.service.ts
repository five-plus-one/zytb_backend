import { AppDataSource } from '../../config/database';
import { AgentPreference } from '../../models/AgentPreference';
import { CoreCollege } from '../../models/core/CoreCollege';
import { CoreEnrollmentPlan } from '../../models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../../models/core/CoreAdmissionScore';
import { CoreMajor } from '../../models/core/CoreMajor';

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

interface Candidate {
  // 基础信息
  collegeId: string;
  collegeName: string;
  collegeCode?: string;
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

  /**
   * 主入口：生成推荐
   */
  async generateRecommendations(
    context: UserContext,
    targetCount: number = 60
  ): Promise<Candidate[]> {
    console.log('\n🚀 === 多维度加权推荐引擎 V2 启动 ===');
    console.log(`📊 用户: 分数=${context.examScore}, 位次=${context.scoreRank || '未知'}, 省份=${context.province}`);

    // Step 1: 提取用户偏好权重
    const weights = this.extractUserWeights(context.preferences);
    console.log(`⚖️  用户权重: 院校=${weights.college}%, 专业=${weights.major}%, 城市=${weights.city}%`);

    // Step 2: 计算用户位次（如果没有）
    let userRank = context.scoreRank;
    if (!userRank) {
      userRank = await this.calculateUserRank(context.examScore, context.province, context.subjectType);
      console.log(`📍 计算得到位次: ${userRank}`);
    }

    // Step 3: 多级候选池扩展
    const candidates = await this.buildCandidatePool(context, userRank);
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

    return balanced;
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
    userRank: number
  ): Promise<Candidate[]> {
    console.log('\n🔍 === 构建候选池（多级扩展）===');

    let candidates: Candidate[] = [];

    // Level 1: 精确匹配（位次 ± 动态范围）
    candidates = await this.fetchCandidatesLevel1(context, userRank);
    console.log(`  Level 1 (精确匹配): ${candidates.length} 个候选`);

    if (candidates.length >= 30) {
      return candidates;
    }

    // Level 2: 模糊匹配（忽略专业组精确匹配）
    const level2 = await this.fetchCandidatesLevel2(context, userRank);
    candidates = this.mergeCandidates(candidates, level2);
    console.log(`  Level 2 (模糊匹配): ${candidates.length} 个候选`);

    if (candidates.length >= 30) {
      return candidates;
    }

    // Level 3: 分数匹配（处理位次缺失情况）
    const level3 = await this.fetchCandidatesLevel3(context);
    candidates = this.mergeCandidates(candidates, level3);
    console.log(`  Level 3 (分数匹配): ${candidates.length} 个候选`);

    if (candidates.length >= 20) {
      return candidates;
    }

    // Level 4: 宽松匹配（扩大范围）
    const level4 = await this.fetchCandidatesLevel4(context, userRank);
    candidates = this.mergeCandidates(candidates, level4);
    console.log(`  Level 4 (宽松匹配): ${candidates.length} 个候选`);

    return candidates;
  }

  /**
   * Level 1: 精确匹配 - 使用动态位次区间
   */
  private async fetchCandidatesLevel1(
    context: UserContext,
    userRank: number
  ): Promise<Candidate[]> {
    // 动态计算位次区间（根据分数段调整）
    const rankRange = this.calculateDynamicRankRange(userRank, context.examScore);

    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    // 查询招生计划
    const plans = await planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${context.subjectType}%` })
      .andWhere('plan.year >= :year', { year: new Date().getFullYear() - 1 })
      .getMany();

    if (plans.length === 0) {
      return [];
    }

    const candidates: Candidate[] = [];

    // 按院校+专业组分组
    const grouped = this.groupPlansByCollegeMajorGroup(plans);

    for (const [key, groupPlans] of grouped.entries()) {
      const firstPlan = groupPlans[0];

      // 查询历史录取分数（精确匹配专业组）
      const scores = await scoreRepo
        .createQueryBuilder('score')
        .where('score.sourceProvince = :province', { province: context.province })
        .andWhere('score.collegeName = :collegeName', { collegeName: firstPlan.collegeName })
        .andWhere('score.subjectType = :subjectType', { subjectType: context.subjectType })
        .andWhere('score.majorGroup = :majorGroup', { majorGroup: firstPlan.majorGroupCode })
        .andWhere('score.minRank IS NOT NULL')
        .andWhere('score.minRank >= :minRank', { minRank: rankRange.min })
        .andWhere('score.minRank <= :maxRank', { maxRank: rankRange.max })
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
    userRank: number
  ): Promise<Candidate[]> {
    const rankRange = this.calculateDynamicRankRange(userRank, context.examScore);
    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    const plans = await planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${context.subjectType}%` })
      .getMany();

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
  private async fetchCandidatesLevel3(context: UserContext): Promise<Candidate[]> {
    const scoreRange = this.calculateScoreRange(context.examScore);
    const planRepo = AppDataSource.getRepository(CoreEnrollmentPlan);
    const scoreRepo = AppDataSource.getRepository(CoreAdmissionScore);

    const plans = await planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType LIKE :subjectType', { subjectType: `%${context.subjectType}%` })
      .getMany();

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
    userRank: number
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
      const plans = await planRepo
        .createQueryBuilder('plan')
        .where('plan.sourceProvince = :province', { province: context.province })
        .andWhere('plan.collegeName = :collegeName', { collegeName: score.collegeName })
        .limit(6)
        .getMany();

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
      majorGroupCode: firstPlan.majorGroupCode || undefined,
      majorGroupName: firstPlan.majorGroupName || undefined,
      province: firstPlan.collegeProvince || undefined,
      city: firstPlan.collegeCity || undefined,
      is985: firstPlan.collegeIs985 || false,
      is211: firstPlan.collegeIs211 || false,
      majors: plans.slice(0, 6).map(p => ({
        majorName: p.majorName || '未知专业',
        majorCode: p.majorCode || undefined,
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
    const repo = AppDataSource.getRepository(CoreCollege);
    return await repo.createQueryBuilder('college')
      .whereInIds(collegeIds)
      .getMany();
  }

  private scoreCollege(candidate: Candidate, college: CoreCollege | undefined, context: UserContext): number {
    let score = 50; // 基础分

    if (!college) return score;

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
    }

    return Math.min(100, score);
  }

  private async scoreMajor(candidate: Candidate, context: UserContext): Promise<number> {
    // 简化版：后续整合用户专业偏好
    return 60;
  }

  private scoreCity(candidate: Candidate, context: UserContext): number {
    // 简化版：后续整合用户城市偏好
    return 50;
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
    // 简化版：后续整合就业数据
    return 60;
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
    const high = candidates.filter(c => c.riskLevel === 'high').slice(0, Math.floor(targetCount * 0.3));
    const medium = candidates.filter(c => c.riskLevel === 'medium').slice(0, Math.floor(targetCount * 0.4));
    const low = candidates.filter(c => c.riskLevel === 'low').slice(0, Math.floor(targetCount * 0.3));

    return [...high, ...medium, ...low].slice(0, targetCount);
  }
}
