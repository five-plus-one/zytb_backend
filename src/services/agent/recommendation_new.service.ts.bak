import { AppDataSource } from '../../config/database';
import { College } from '../../models/College';
import { Major } from '../../models/Major';
import { EnrollmentPlan } from '../../models/EnrollmentPlan';
import { AdmissionScore } from '../../models/AdmissionScore';
import { AgentPreference } from '../../models/AgentPreference';

/**
 * 智能推荐引擎 - 完全重写版本
 *
 * 核心流程:
 * 1. 根据分数拉取120个候选(院校+专业组)
 * 2. 根据用户指标计算评分
 * 3. 排序后输出top40
 */

interface UserPreferences {
  // 决策权重
  decisionWeights: {
    college: number;
    major: number;
    city: number;
    employment: number;
    furtherStudy: number;
    interest: number;
    prospect: number;
  };

  // 基本信息
  province: string;
  examScore: number;
  scoreRank?: number;
  subjectType: string;

  // 偏好指标
  preferences: AgentPreference[];
}

interface CandidateVolunteer {
  collegeId: string;
  collegeName: string;
  majorGroupCode?: string;
  majorGroupName?: string;
  majorsInGroup: string[];  // 该专业组内所有专业

  // 分数信息
  totalScore: number;
  dimensionScores: {
    collegeScore: number;
    majorScore: number;
    cityScore: number;
    admissionScore: number;
    adjustmentRiskPenalty: number;
  };

  // 历史数据
  historicalMinScore?: number;
  historicalAvgScore?: number;
  admissionProbability: 'high' | 'medium' | 'low' | 'unknown';

  // 推荐理由
  matchingReasons: string[];
  riskWarnings: string[];

  // 分类
  scoreCategory: 'bold' | 'moderate' | 'stable';
}

export class NewRecommendationEngine {
  /**
   * 主入口
   */
  async generateRecommendations(
    userPrefs: UserPreferences,
    targetCount: number = 40
  ): Promise<CandidateVolunteer[]> {
    console.log('🎯 开始生成志愿推荐...');
    console.log(`📊 用户分数: ${userPrefs.examScore}, 省份: ${userPrefs.province}, 科目: ${userPrefs.subjectType}`);

    // 步骤1: 根据分数拉取120个候选专业组
    const candidates = await this.fetchCandidatesByScore(userPrefs, 120);
    console.log(`✅ 获取到 ${candidates.length} 个候选专业组`);

    if (candidates.length === 0) {
      console.warn('⚠️  没有找到任何候选,请检查数据库');
      return [];
    }

    // 步骤2: 先进行分类(基于历史分数线)
    this.categorizeByScore(candidates, userPrefs.examScore);

    // 步骤3: 计算每个候选的评分
    console.log('📊 开始计算评分...');
    for (const candidate of candidates) {
      await this.calculateScore(candidate, userPrefs);
    }

    // 步骤4: 按1:1:1比例从各类别中选取
    const result = this.selectByRatio(candidates, targetCount);

    console.log('🎉 推荐生成完成!');
    console.log(`   - 冲刺型: ${result.filter(v => v.scoreCategory === 'bold').length} 个`);
    console.log(`   - 适中型: ${result.filter(v => v.scoreCategory === 'moderate').length} 个`);
    console.log(`   - 稳妥型: ${result.filter(v => v.scoreCategory === 'stable').length} 个`);

    return result;
  }

  /**
   * 按1:1:1比例从各类别中选取
   */
  private selectByRatio(candidates: CandidateVolunteer[], targetCount: number): CandidateVolunteer[] {
    // 按类别分组
    const boldCandidates = candidates.filter(c => c.scoreCategory === 'bold');
    const moderateCandidates = candidates.filter(c => c.scoreCategory === 'moderate');
    const stableCandidates = candidates.filter(c => c.scoreCategory === 'stable');

    // 每个类别按总分排序
    boldCandidates.sort((a, b) => b.totalScore - a.totalScore);
    moderateCandidates.sort((a, b) => b.totalScore - a.totalScore);
    stableCandidates.sort((a, b) => b.totalScore - a.totalScore);

    console.log(`📋 候选分类统计:`);
    console.log(`   - 冲刺型候选: ${boldCandidates.length} 个`);
    console.log(`   - 适中型候选: ${moderateCandidates.length} 个`);
    console.log(`   - 稳妥型候选: ${stableCandidates.length} 个`);

    // 计算每类应该取多少个 (1:1:1比例)
    const countPerCategory = Math.floor(targetCount / 3);
    const remainder = targetCount % 3;

    // 从每个类别中取出最优的
    const result: CandidateVolunteer[] = [];

    // 取冲刺型
    const boldCount = Math.min(countPerCategory + (remainder > 0 ? 1 : 0), boldCandidates.length);
    result.push(...boldCandidates.slice(0, boldCount));

    // 取适中型
    const moderateCount = Math.min(countPerCategory + (remainder > 1 ? 1 : 0), moderateCandidates.length);
    result.push(...moderateCandidates.slice(0, moderateCount));

    // 取稳妥型
    const stableCount = Math.min(countPerCategory, stableCandidates.length);
    result.push(...stableCandidates.slice(0, stableCount));

    // 如果某个类别不足,从其他类别补充
    const shortage = targetCount - result.length;
    if (shortage > 0) {
      console.log(`⚠️  某些类别候选不足,需要补充 ${shortage} 个`);

      // 收集剩余候选
      const remaining: CandidateVolunteer[] = [];
      remaining.push(...boldCandidates.slice(boldCount));
      remaining.push(...moderateCandidates.slice(moderateCount));
      remaining.push(...stableCandidates.slice(stableCount));

      // 按总分排序
      remaining.sort((a, b) => b.totalScore - a.totalScore);

      // 补充
      result.push(...remaining.slice(0, shortage));
    }

    // 最终按推荐顺序排序: 稳13个 -> 适中13个 -> 冲刺14个 (保底在前,冲刺在后)
    const finalResult: CandidateVolunteer[] = [];
    const stableList = result.filter(c => c.scoreCategory === 'stable');
    const moderateList = result.filter(c => c.scoreCategory === 'moderate');
    const boldList = result.filter(c => c.scoreCategory === 'bold');

    finalResult.push(...stableList);
    finalResult.push(...moderateList);
    finalResult.push(...boldList);

    return finalResult;
  }

  /**
   * 步骤1: 根据分数拉取候选专业组
   */
  private async fetchCandidatesByScore(
    userPrefs: UserPreferences,
    limit: number
  ): Promise<CandidateVolunteer[]> {
    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);
    const enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
    const collegeRepo = AppDataSource.getRepository(College);

    // 1. 从admission_scores表拉取近3年的录取数据
    // 分数范围策略:
    // - 冲刺型: 历史最低分在 [用户分数-10, 用户分数+50] 之间
    // - 适中型: 历史最低分在 [用户分数-30, 用户分数-10] 之间
    // - 稳妥型: 历史最低分在 [用户分数-80, 用户分数-30] 之间
    // 总范围: [用户分数-80, 用户分数+50]
    const historicalData = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('score.collegeName', 'collegeName')
      .addSelect('score.majorGroup', 'majorGroup')
      .addSelect('MIN(score.minScore)', 'minScore')
      .addSelect('AVG(score.minScore)', 'avgScore')
      .addSelect('MAX(score.year)', 'latestYear')
      .where('score.sourceProvince = :province', { province: userPrefs.province })
      .andWhere('score.subjectType = :subjectType', { subjectType: userPrefs.subjectType })
      .andWhere('score.year >= :startYear', { startYear: new Date().getFullYear() - 3 })
      .andWhere('score.minScore IS NOT NULL')
      .andWhere('score.minScore >= :minScore', { minScore: userPrefs.examScore - 80 })
      .andWhere('score.minScore <= :maxScore', { maxScore: userPrefs.examScore + 50 })
      .groupBy('score.collegeName, score.majorGroup')
      .orderBy('avgScore', 'DESC')
      .limit(limit * 3)  // 多拉一些,确保各类别都有足够候选
      .getRawMany();

    console.log(`  📌 从历史数据拉取到 ${historicalData.length} 条`);

    if (historicalData.length === 0) {
      // 如果没有历史数据,直接从enrollment_plans拉取当年招生计划
      console.log('  ⚠️  没有历史数据,使用当年招生计划');
      return await this.fetchFromEnrollmentPlans(userPrefs, limit);
    }

    // 2. 根据历史数据,查询当年的招生计划
    const candidates: CandidateVolunteer[] = [];

    for (const record of historicalData) {
      if (candidates.length >= limit) break;

      const collegeName = record.collegeName;
      const majorGroupCode = record.majorGroup;

      // 查询该院校+专业组的当年招生计划
      // 注意1: enrollment_plans表的subjectType是"物理"/"历史", 而admission_scores是"物理类"/"历史类"
      // 注意2: admission_scores的majorGroup是"（07）"格式，enrollment_plans的majorGroupCode是"07"格式
      const normalizedSubjectType = userPrefs.subjectType.replace('类', '');
      const normalizedMajorGroupCode = majorGroupCode ? majorGroupCode.replace(/[（）()]/g, '') : null;

      const plans = await enrollmentPlanRepo.find({
        where: {
          collegeName,
          majorGroupCode: normalizedMajorGroupCode || undefined,
          sourceProvince: userPrefs.province,
          subjectType: normalizedSubjectType,
          year: new Date().getFullYear()
        }
      });

      if (plans.length === 0) continue;

      // 查询院校详情
      const college = await collegeRepo.findOne({ where: { name: collegeName } });
      if (!college) continue;

      // 提取该专业组内所有专业
      const majorsInGroup = plans.map(p => p.majorName);

      candidates.push({
        collegeId: college.id,
        collegeName: college.name,
        majorGroupCode: majorGroupCode || plans[0].majorGroupCode || undefined,
        majorGroupName: plans[0].majorGroupName,
        majorsInGroup,
        totalScore: 0,
        dimensionScores: {
          collegeScore: 0,
          majorScore: 0,
          cityScore: 0,
          admissionScore: 0,
          adjustmentRiskPenalty: 0
        },
        historicalMinScore: record.minScore,
        historicalAvgScore: record.avgScore,
        admissionProbability: 'unknown',
        matchingReasons: [],
        riskWarnings: [],
        scoreCategory: 'moderate'
      });
    }

    console.log(`  ✅ 构建了 ${candidates.length} 个候选志愿`);
    return candidates;
  }

  /**
   * 保底方案: 从当年招生计划直接拉取
   */
  private async fetchFromEnrollmentPlans(
    userPrefs: UserPreferences,
    limit: number
  ): Promise<CandidateVolunteer[]> {
    const enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
    const collegeRepo = AppDataSource.getRepository(College);

    // 注意: enrollment_plans表的subjectType是"物理"/"历史", 而admission_scores是"物理类"/"历史类"
    const normalizedSubjectType = userPrefs.subjectType.replace('类', '');

    const plans = await enrollmentPlanRepo
      .createQueryBuilder('plan')
      .select('plan.collegeName', 'collegeName')
      .addSelect('plan.majorGroupCode', 'majorGroupCode')
      .addSelect('plan.majorGroupName', 'majorGroupName')
      .where('plan.sourceProvince = :province', { province: userPrefs.province })
      .andWhere('plan.subjectType = :subjectType', { subjectType: normalizedSubjectType })
      .andWhere('plan.year = :year', { year: new Date().getFullYear() })
      .groupBy('plan.collegeName, plan.majorGroupCode')
      .limit(limit)
      .getRawMany();

    const candidates: CandidateVolunteer[] = [];

    for (const plan of plans) {
      const college = await collegeRepo.findOne({ where: { name: plan.collegeName } });
      if (!college) continue;

      // 查询该专业组内所有专业
      const groupPlans = await enrollmentPlanRepo.find({
        where: {
          collegeName: plan.collegeName,
          majorGroupCode: plan.majorGroupCode,
          sourceProvince: userPrefs.province,
          subjectType: normalizedSubjectType,
          year: new Date().getFullYear()
        }
      });

      candidates.push({
        collegeId: college.id,
        collegeName: college.name,
        majorGroupCode: plan.majorGroupCode,
        majorGroupName: plan.majorGroupName,
        majorsInGroup: groupPlans.map(p => p.majorName),
        totalScore: 0,
        dimensionScores: {
          collegeScore: 0,
          majorScore: 0,
          cityScore: 0,
          admissionScore: 0,
          adjustmentRiskPenalty: 0
        },
        admissionProbability: 'unknown',
        matchingReasons: [],
        riskWarnings: [],
        scoreCategory: 'moderate'
      });
    }

    return candidates;
  }

  /**
   * 步骤2: 计算评分
   */
  private async calculateScore(
    candidate: CandidateVolunteer,
    userPrefs: UserPreferences
  ): Promise<void> {
    const weights = userPrefs.decisionWeights;
    const prefs = this.parsePreferences(userPrefs.preferences);

    const collegeRepo = AppDataSource.getRepository(College);
    const college = await collegeRepo.findOne({ where: { name: candidate.collegeName } });

    if (!college) {
      candidate.totalScore = 0;
      return;
    }

    // 1. 院校维度得分
    const collegeScore = this.calculateCollegeScore(college, prefs);

    // 2. 专业维度得分
    const majorScore = await this.calculateMajorGroupScore(candidate.majorsInGroup, prefs);

    // 3. 城市维度得分
    const cityScore = this.calculateCityScore(college, prefs);

    // 4. 历史分数适配度得分
    const admissionScore = this.calculateAdmissionScore(candidate, userPrefs.examScore);

    // 5. 专业组调剂风险惩罚
    const adjustmentRiskPenalty = this.calculateAdjustmentRisk(candidate.majorsInGroup, prefs);

    // 保存各维度得分
    candidate.dimensionScores = {
      collegeScore,
      majorScore,
      cityScore,
      admissionScore,
      adjustmentRiskPenalty
    };

    // 加权总分
    candidate.totalScore =
      collegeScore * (weights.college / 100) +
      majorScore * (weights.major / 100) +
      cityScore * (weights.city / 100) +
      admissionScore * 0.3 +
      adjustmentRiskPenalty;

    // 生成推荐理由
    this.generateReasons(candidate, college, prefs);
  }

  /**
   * 计算院校得分
   */
  private calculateCollegeScore(college: College, prefs: any): number {
    let score = 50; // 基础分

    // 985/211/双一流加分
    if (college.is985) score += 30;
    else if (college.is211) score += 25;
    else if (college.isDoubleFirstClass) score += 20;

    // 排名加分
    if (college.rank) {
      const rankScore = Math.max(0, 20 - college.rank / 10);
      score += rankScore;
    }

    // 保研率加分
    if (college.postgraduateRate) {
      score += (college.postgraduateRate / 100) * 20;
    }

    return Math.min(score, 100);
  }

  /**
   * 计算专业组得分
   */
  private async calculateMajorGroupScore(majors: string[], prefs: any): Promise<number> {
    if (!prefs.targetMajors || prefs.targetMajors.length === 0) {
      return 50; // 用户没有明确偏好,返回中等分
    }

    // 计算匹配度
    const matchCount = majors.filter(m => prefs.targetMajors.includes(m)).length;
    const matchRatio = matchCount / majors.length;

    return 50 + matchRatio * 50; // 50-100分
  }

  /**
   * 计算城市得分
   */
  private calculateCityScore(college: College, prefs: any): number {
    let score = 50;

    if (prefs.targetCities) {
      if (prefs.targetCities.includes(college.province) || prefs.targetCities.includes(college.city)) {
        score += 50;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * 计算历史分数适配度得分
   */
  private calculateAdmissionScore(candidate: CandidateVolunteer, userScore: number): number {
    if (!candidate.historicalMinScore) {
      return 50; // 没有历史数据,返回中等分
    }

    const scoreDiff = userScore - candidate.historicalMinScore;

    // 根据分差判断录取概率
    let probability: 'high' | 'medium' | 'low';
    let score: number;

    if (scoreDiff >= 30) {
      probability = 'high';
      score = 90;
    } else if (scoreDiff >= 15) {
      probability = 'high';
      score = 80;
    } else if (scoreDiff >= 5) {
      probability = 'medium';
      score = 65;
    } else if (scoreDiff >= -5) {
      probability = 'medium';
      score = 50;
    } else if (scoreDiff >= -15) {
      probability = 'low';
      score = 30;
    } else {
      probability = 'low';
      score = 15;
    }

    candidate.admissionProbability = probability;
    return score;
  }

  /**
   * 计算专业组调剂风险惩罚
   */
  private calculateAdjustmentRisk(majorsInGroup: string[], prefs: any): number {
    if (majorsInGroup.length <= 1) {
      return 0; // 只有1个专业,无调剂风险
    }

    if (!prefs.targetMajors || prefs.targetMajors.length === 0) {
      return 0; // 用户没有明确偏好,不惩罚
    }

    // 计算不匹配的专业数量
    const unmatchedCount = majorsInGroup.filter(m => !prefs.targetMajors.includes(m)).length;
    const unmatchedRatio = unmatchedCount / majorsInGroup.length;

    // 风险越高,惩罚越大(负分)
    if (unmatchedRatio > 0.7) {
      return -30; // 高风险
    } else if (unmatchedRatio > 0.4) {
      return -15; // 中风险
    } else {
      return -5; // 低风险
    }
  }

  /**
   * 生成推荐理由
   */
  private generateReasons(candidate: CandidateVolunteer, college: College, prefs: any): void {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 院校特色
    if (college.is985) reasons.push('985工程院校');
    if (college.is211) reasons.push('211工程院校');
    if (college.isDoubleFirstClass) reasons.push('双一流建设高校');

    // 分数匹配
    if (candidate.admissionProbability === 'high') {
      reasons.push('历年分数线较低,录取把握大');
    } else if (candidate.admissionProbability === 'low') {
      warnings.push('分数偏低,存在退档风险');
    }

    // 专业组调剂风险
    const riskPenalty = candidate.dimensionScores.adjustmentRiskPenalty;
    if (riskPenalty <= -20) {
      warnings.push(`专业组内${candidate.majorsInGroup.length}个专业,多数不匹配,调剂风险高`);
    }

    candidate.matchingReasons = reasons;
    candidate.riskWarnings = warnings;
  }

  /**
   * 分类: 冲稳保 (基于分数差百分位数)
   *
   * 新策略: 基于所有候选的分数差分布,动态划分三个等级
   * - 冲刺型(bold): 分数差最小的33% (录取有风险,需要冲一冲)
   * - 适中型(moderate): 分数差中等的34% (比较稳妥)
   * - 稳妥型(stable): 分数差最大的33% (保底,录取把握大)
   */
  private categorizeByScore(candidates: CandidateVolunteer[], userScore: number): void {
    // 计算所有候选的分数差
    const candidatesWithDiff = candidates
      .filter(c => c.historicalMinScore !== undefined)
      .map(c => ({
        candidate: c,
        diff: userScore - c.historicalMinScore!
      }));

    // 按分数差排序(从小到大)
    candidatesWithDiff.sort((a, b) => a.diff - b.diff);

    const total = candidatesWithDiff.length;
    const boldThreshold = Math.floor(total / 3);  // 前33%
    const moderateThreshold = Math.floor(total * 2 / 3);  // 前66%

    // 根据百分位划分
    candidatesWithDiff.forEach((item, index) => {
      if (index < boldThreshold) {
        // 前33%: 分数差最小,属于冲刺型
        item.candidate.scoreCategory = 'bold';
        item.candidate.admissionProbability = 'low';
      } else if (index < moderateThreshold) {
        // 中间34%: 分数差中等,属于适中型
        item.candidate.scoreCategory = 'moderate';
        item.candidate.admissionProbability = 'medium';
      } else {
        // 后33%: 分数差最大,属于稳妥型
        item.candidate.scoreCategory = 'stable';
        item.candidate.admissionProbability = 'high';
      }
    });

    // 没有历史分数的设为适中型
    candidates
      .filter(c => c.historicalMinScore === undefined)
      .forEach(c => {
        c.scoreCategory = 'moderate';
        c.admissionProbability = 'medium';
      });
  }

  /**
   * 解析用户偏好
   */
  private parsePreferences(preferences: AgentPreference[]): any {
    const prefs: any = {};

    for (const pref of preferences) {
      let value = pref.value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          continue;
        }
      }

      switch (pref.indicatorId) {
        case 'CORE_10':
          prefs.targetMajors = Array.isArray(value) ? value : [];
          break;
        case 'CORE_20':
          prefs.targetCities = Array.isArray(value) ? value : [];
          break;
      }
    }

    return prefs;
  }
}
