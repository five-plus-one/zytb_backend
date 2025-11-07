import { AppDataSource } from '../../config/database';
import { College } from '../../models/College';
import { Major } from '../../models/Major';
import { EnrollmentPlan } from '../../models/EnrollmentPlan';
import { AdmissionScore } from '../../models/AdmissionScore';
import { AgentPreference } from '../../models/AgentPreference';
import { In, Not, IsNull } from 'typeorm';

/**
 * 智能体推荐引擎 - 数学模型计算服务
 *
 * 核心功能:
 * 1. 基于用户偏好指标进行多维度加权计算
 * 2. 分析历史分数适配度
 * 3. 评估专业组内调剂风险
 * 4. 生成科学的志愿推荐列表
 */

interface UserPreferences {
  // 决策权重 (来自CORE_01, CORE_02, CORE_03)
  decisionWeights: {
    college: number;      // 院校权重
    major: number;        // 专业权重
    city: number;         // 城市权重
    employment: number;   // 就业权重
    furtherStudy: number; // 深造权重
    interest: number;     // 兴趣权重
    prospect: number;     // 前景权重
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
  majorId?: string;
  majorName?: string;
  majorGroupCode?: string;
  majorGroupName?: string;

  // 分数信息
  totalScore: number;
  dimensionScores: Record<string, number>;

  // 历史数据
  admissionProbability: any;
  majorAdjustmentRisk?: any;

  // 推荐理由
  matchingReasons: string[];
  riskWarnings: string[];

  // 其他
  scoreCategory: 'bold' | 'moderate' | 'stable';
}

export class RecommendationEngine {
  /**
   * 主入口: 生成志愿推荐
   * 使用梯度筛选策略,确保返回足够的志愿
   */
  async generateRecommendations(
    userPrefs: UserPreferences,
    targetCount: number = 40  // 确保返回40条志愿
  ): Promise<CandidateVolunteer[]> {
    console.log('🎯 开始生成志愿推荐...');
    console.log('用户分数:', userPrefs.examScore, '省份:', userPrefs.province);

    // 使用梯度筛选策略,确保有足够的候选
    const candidateVolunteers: CandidateVolunteer[] = [];

    // 步骤1: 多轮次梯度筛选,确保有足够的候选志愿
    let currentRange = { min: -30, max: 50 }; // 初始分数范围: 分数线-30 ~ +50
    let round = 1;
    const maxRounds = 5; // 最多5轮扩大范围

    while (candidateVolunteers.length < targetCount * 2 && round <= maxRounds) {
      console.log(`\n📍 第${round}轮筛选 (分数范围: ${userPrefs.examScore + currentRange.min} ~ ${userPrefs.examScore + currentRange.max})`);

      // 筛选候选院校
      const candidateColleges = await this.filterCandidateCollegesWithRange(
        userPrefs,
        currentRange.min,
        currentRange.max
      );
      console.log(`  ✅ 筛选出 ${candidateColleges.length} 所候选院校`);

      // 为每个院校匹配专业
      for (const college of candidateColleges) {
        const volunteers = await this.matchMajorsForCollege(college, userPrefs);
        // 将Partial类型转换为完整类型,添加必需字段
        const completeVolunteers: CandidateVolunteer[] = volunteers.map(v => ({
          ...v,
          collegeId: v.collegeId || college.id,
          collegeName: v.collegeName || college.name,
          totalScore: 0,
          dimensionScores: v.dimensionScores || {},
          matchingReasons: v.matchingReasons || [],
          riskWarnings: v.riskWarnings || []
        })) as CandidateVolunteer[];

        candidateVolunteers.push(...completeVolunteers);
      }

      console.log(`  ✅ 当前累计 ${candidateVolunteers.length} 个候选志愿`);

      // 如果候选数量足够,退出循环
      if (candidateVolunteers.length >= targetCount * 2) {
        break;
      }

      // 扩大筛选范围
      currentRange.min -= 30;
      currentRange.max += 30;
      round++;
    }

    // 如果经过多轮筛选仍然不足,使用保底策略
    if (candidateVolunteers.length < targetCount) {
      console.log(`\n⚠️  候选志愿不足,启动保底策略...`);
      const fallbackVolunteers = await this.getFallbackVolunteers(userPrefs, targetCount - candidateVolunteers.length);
      candidateVolunteers.push(...fallbackVolunteers);
    }

    console.log(`\n✅ 总共生成 ${candidateVolunteers.length} 个院校-专业组合`);

    // 步骤2: 计算每个组合的匹配分数
    console.log('\n📊 开始计算匹配分数...');
    for (const volunteer of candidateVolunteers) {
      await this.calculateVolunteerScore(volunteer, userPrefs);
    }

    // 步骤3: 按总分从高到低排序
    console.log('\n🔢 按评分排序...');
    candidateVolunteers.sort((a, b) => b.totalScore - a.totalScore);

    // 步骤4: 取前targetCount个
    const topVolunteers = candidateVolunteers.slice(0, targetCount);
    console.log(`✅ 选取评分最高的 ${topVolunteers.length} 个志愿`);

    // 步骤5: 分类(冲刺/适中/稳妥)
    this.categorizeVolunteers(topVolunteers, userPrefs.examScore);

    console.log('🎉 推荐生成完成!');
    console.log(`   - 冲刺型: ${topVolunteers.filter(v => v.scoreCategory === 'bold').length} 个`);
    console.log(`   - 适中型: ${topVolunteers.filter(v => v.scoreCategory === 'moderate').length} 个`);
    console.log(`   - 稳妥型: ${topVolunteers.filter(v => v.scoreCategory === 'stable').length} 个`);

    return topVolunteers;
  }

  /**
   * 步骤1: 筛选候选院校 (带分数范围)
   */
  private async filterCandidateCollegesWithRange(
    userPrefs: UserPreferences,
    minScoreOffset: number,
    maxScoreOffset: number
  ): Promise<College[]> {
    const collegeRepo = AppDataSource.getRepository(College);
    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

    // 1. 根据历史分数线初步筛选院校
    const historicalScores = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('DISTINCT score.collegeName', 'collegeName')
      .addSelect('MIN(score.minScore)', 'minScore')
      .addSelect('AVG(score.minScore)', 'avgScore')
      .where('score.sourceProvince = :province', { province: userPrefs.province })
      .andWhere('score.subjectType = :subjectType', { subjectType: userPrefs.subjectType })
      .andWhere('score.year >= :startYear', { startYear: new Date().getFullYear() - 3 }) // 近3年
      .groupBy('score.collegeName')
      .having('MIN(score.minScore) <= :maxScore', { maxScore: userPrefs.examScore + maxScoreOffset })
      .andHaving('MIN(score.minScore) >= :minScore', { minScore: userPrefs.examScore + minScoreOffset })
      .getRawMany();

    const collegeNames = historicalScores.map(s => s.collegeName);

    if (collegeNames.length === 0) {
      console.warn(`  ⚠️  该分数范围未找到院校`);
      return [];
    }

    // 2. 获取院校详细信息
    let query = collegeRepo.createQueryBuilder('college')
      .where('college.name IN (:...names)', { names: collegeNames });

    // 3. 根据用户偏好进行筛选 (仅第一轮应用严格筛选)
    const prefs = this.parsePreferences(userPrefs.preferences);

    // 院校层次筛选
    if (prefs.collegeLevels && prefs.collegeLevels.length > 0 && minScoreOffset >= -30) {
      const conditions = [];
      if (prefs.collegeLevels.includes('985工程')) conditions.push('college.is985 = true');
      if (prefs.collegeLevels.includes('211工程')) conditions.push('college.is211 = true');
      if (prefs.collegeLevels.includes('双一流')) conditions.push('college.isDoubleFirstClass = true');

      if (conditions.length > 0) {
        query = query.andWhere(`(${conditions.join(' OR ')})`);
      }
    }

    // 院校类型筛选
    if (prefs.collegeTypes && prefs.collegeTypes.length > 0 && minScoreOffset >= -30) {
      query = query.andWhere('college.type IN (:...types)', { types: prefs.collegeTypes });
    }

    // 地域筛选 (保留在所有轮次)
    if (prefs.targetCities && prefs.targetCities.length > 0) {
      query = query.andWhere('(college.province IN (:...cities) OR college.city IN (:...cities))',
        { cities: prefs.targetCities });
    }

    const colleges = await query.getMany();
    return colleges;
  }

  /**
   * 步骤1: 筛选候选院校 (旧方法,保留用于兼容)
   */
  private async filterCandidateColleges(userPrefs: UserPreferences): Promise<College[]> {
    const collegeRepo = AppDataSource.getRepository(College);
    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

    // 1. 根据历史分数线初步筛选院校
    const historicalScores = await admissionScoreRepo
      .createQueryBuilder('score')
      .select('DISTINCT score.collegeName', 'collegeName')
      .addSelect('MIN(score.minScore)', 'minScore')
      .addSelect('AVG(score.minScore)', 'avgScore')
      .where('score.sourceProvince = :province', { province: userPrefs.province })
      .andWhere('score.subjectType = :subjectType', { subjectType: userPrefs.subjectType })
      .andWhere('score.year >= :startYear', { startYear: new Date().getFullYear() - 3 }) // 近3年
      .groupBy('score.collegeName')
      .having('MIN(score.minScore) <= :userScore + 50', { userScore: userPrefs.examScore }) // 用户分数+50分以内
      .andHaving('MIN(score.minScore) >= :userScore - 80', { userScore: userPrefs.examScore }) // 用户分数-80分以上
      .getRawMany();

    const collegeNames = historicalScores.map(s => s.collegeName);

    if (collegeNames.length === 0) {
      console.warn('⚠️  未找到符合分数范围的院校，扩大搜索范围...');
      // 如果没有匹配的，则放宽条件
      return await collegeRepo.find({ take: 100 });
    }

    // 2. 获取院校详细信息
    let query = collegeRepo.createQueryBuilder('college')
      .where('college.name IN (:...names)', { names: collegeNames });

    // 3. 根据用户偏好进行筛选
    const prefs = this.parsePreferences(userPrefs.preferences);

    // 院校层次筛选
    if (prefs.collegeLevels && prefs.collegeLevels.length > 0) {
      const conditions = [];
      if (prefs.collegeLevels.includes('985工程')) conditions.push('college.is985 = true');
      if (prefs.collegeLevels.includes('211工程')) conditions.push('college.is211 = true');
      if (prefs.collegeLevels.includes('双一流')) conditions.push('college.isDoubleFirstClass = true');

      if (conditions.length > 0) {
        query = query.andWhere(`(${conditions.join(' OR ')})`);
      }
    }

    // 院校类型筛选
    if (prefs.collegeTypes && prefs.collegeTypes.length > 0) {
      query = query.andWhere('college.type IN (:...types)', { types: prefs.collegeTypes });
    }

    // 地域筛选
    if (prefs.targetCities && prefs.targetCities.length > 0) {
      query = query.andWhere('(college.province IN (:...cities) OR college.city IN (:...cities))',
        { cities: prefs.targetCities });
    }

    const colleges = await query.getMany();
    return colleges;
  }

  /**
   * 步骤2: 为院校匹配专业
   */
  private async matchMajorsForCollege(
    college: College,
    userPrefs: UserPreferences
  ): Promise<Partial<CandidateVolunteer>[]> {
    const enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
    const prefs = this.parsePreferences(userPrefs.preferences);

    // 查询该院校在用户省份的招生计划
    let query = enrollmentPlanRepo
      .createQueryBuilder('plan')
      .where('plan.collegeName = :collegeName', { collegeName: college.name })
      .andWhere('plan.sourceProvince = :province', { province: userPrefs.province })
      .andWhere('plan.subjectType = :subjectType', { subjectType: userPrefs.subjectType })
      .andWhere('plan.year = :year', { year: new Date().getFullYear() }); // 当年招生计划

    // 专业筛选
    if (prefs.targetMajors && prefs.targetMajors.length > 0) {
      query = query.andWhere('plan.majorName IN (:...majors)', { majors: prefs.targetMajors });
    }

    const plans = await query.getMany();

    // 按专业组分组
    const groupedPlans = this.groupByMajorGroup(plans);

    const volunteers: Partial<CandidateVolunteer>[] = [];
    for (const [groupCode, groupPlans] of Object.entries(groupedPlans)) {
      // 对于每个专业组,创建一个候选志愿
      const firstPlan = groupPlans[0];
      volunteers.push({
        collegeId: college.id,
        collegeName: college.name,
        majorGroupCode: groupCode || undefined,
        majorGroupName: firstPlan.majorGroupName || undefined,
        majorName: firstPlan.majorName, // 主推专业
        matchingReasons: [],
        riskWarnings: [],
        dimensionScores: {}
      });
    }

    return volunteers;
  }

  /**
   * 按专业组分组
   */
  private groupByMajorGroup(plans: EnrollmentPlan[]): Record<string, EnrollmentPlan[]> {
    const groups: Record<string, EnrollmentPlan[]> = {};

    for (const plan of plans) {
      const key = plan.majorGroupCode || plan.majorCode || 'default';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(plan);
    }

    return groups;
  }

  /**
   * 步骤3: 计算志愿匹配分数 (核心算法)
   */
  private async calculateVolunteerScore(
    volunteer: Partial<CandidateVolunteer>,
    userPrefs: UserPreferences
  ): Promise<void> {
    // Ensure required fields are present
    if (!volunteer.collegeName) {
      throw new Error('College name is required for score calculation');
    }

    const weights = userPrefs.decisionWeights;
    const prefs = this.parsePreferences(userPrefs.preferences);

    // 获取院校和专业详细信息
    const college = await AppDataSource.getRepository(College)
      .findOne({ where: { name: volunteer.collegeName } });

    if (!college) return;

    // === 1. 院校维度得分 ===
    const collegeScore = this.calculateCollegeScore(college, prefs, weights);

    // === 2. 专业维度得分 ===
    const majorScore = await this.calculateMajorScore(
      volunteer.majorName || '',
      prefs,
      weights
    );

    // === 3. 城市维度得分 ===
    const cityScore = this.calculateCityScore(college, prefs, weights);

    // === 4. 就业深造维度得分 ===
    const careerScore = this.calculateCareerScore(college, prefs, weights);

    // === 5. 历史分数适配度得分 ===
    const admissionAnalysis = await this.analyzeAdmissionProbability(
      volunteer.collegeName,
      volunteer.majorGroupCode || '',
      userPrefs
    );
    const admissionScore = admissionAnalysis.score;

    // === 6. 专业组调剂风险评估 ===
    const adjustmentRisk = await this.assessMajorAdjustmentRisk(
      volunteer.collegeName,
      volunteer.majorGroupCode || '',
      prefs.targetMajors || [],
      userPrefs
    );
    const riskPenalty = this.calculateRiskPenalty(adjustmentRisk);

    // 汇总各维度得分
    volunteer.dimensionScores = {
      collegeScore,
      majorScore,
      cityScore,
      careerScore,
      admissionScore,
      riskPenalty
    };

    // === 加权计算总分 ===
    volunteer.totalScore =
      collegeScore * (weights.college / 100) +
      majorScore * (weights.major / 100) +
      cityScore * (weights.city / 100) +
      careerScore * ((weights.employment + weights.furtherStudy) / 200) +
      admissionScore * 0.2 +  // 历史适配度占20%
      riskPenalty;  // 风险惩罚(负分)

    // 保存分析结果
    volunteer.admissionProbability = admissionAnalysis;
    volunteer.majorAdjustmentRisk = adjustmentRisk;

    // 生成推荐理由
    this.generateMatchingReasons(volunteer, college, prefs);
  }

  /**
   * 计算院校维度得分
   */
  private calculateCollegeScore(
    college: College,
    prefs: any,
    weights: any
  ): number {
    let score = 0;
    const maxScore = 100;

    // 1. 院校层次匹配
    if (prefs.collegeLevels) {
      if (prefs.collegeLevels.includes('985工程') && college.is985) score += 30;
      else if (prefs.collegeLevels.includes('211工程') && college.is211) score += 25;
      else if (prefs.collegeLevels.includes('双一流') && college.isDoubleFirstClass) score += 20;
      else score += 10;
    }

    // 2. 院校类型匹配
    if (prefs.collegeTypes && prefs.collegeTypes.includes(college.type)) {
      score += 20;
    }

    // 3. 学校排名
    if (college.rank && college.rank > 0) {
      // 排名越靠前得分越高
      const rankScore = Math.max(0, 30 - (college.rank / 10));
      score += rankScore;
    }

    // 4. 保研率 (如果用户重视深造)
    if (prefs.furtherStudyWeight > 50 && college.postgraduateRate) {
      score += college.postgraduateRate * 0.2; // 最高20分
    }

    // 5. 学术氛围 (如果用户重视)
    if (prefs.academicAtmosphere >= 4) {
      score += 10;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 计算专业维度得分
   */
  private async calculateMajorScore(
    majorName: string,
    prefs: any,
    weights: any
  ): Promise<number> {
    const majorRepo = AppDataSource.getRepository(Major);
    let score = 0;
    const maxScore = 100;

    const major = await majorRepo.findOne({ where: { name: majorName } });
    if (!major) return 50; // 找不到专业信息,返回中等分数

    // 1. 专业兴趣匹配
    if (prefs.targetMajors && prefs.targetMajors.includes(majorName)) {
      score += 40; // 完全匹配,高分
    } else if (prefs.majorCategories) {
      // 专业大类匹配
      if (prefs.majorCategories.includes(major.category)) {
        score += 25;
      }
    }

    // 2. 就业前景
    if (major.employmentRate) {
      score += major.employmentRate * 0.3; // 最高30分
    }

    // 3. 薪资水平 (如果用户重视)
    if (prefs.expectedSalary && major.avgSalary) {
      const salaryMatch = Math.min(major.avgSalary / prefs.expectedSalary, 1);
      score += salaryMatch * 20; // 最高20分
    }

    // 4. 专业热度 (根据用户对冷热门的偏好)
    if (major.isHot) {
      if (prefs.majorHotness === '热门优先') score += 10;
      else if (prefs.majorHotness === '偏好冷门') score -= 10;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 计算城市维度得分
   */
  private calculateCityScore(
    college: College,
    prefs: any,
    weights: any
  ): number {
    let score = 0;
    const maxScore = 100;

    // 1. 目标城市匹配
    if (prefs.targetCities) {
      if (prefs.targetCities.includes(college.province) ||
          prefs.targetCities.includes(college.city)) {
        score += 50;
      }
    }

    // 2. 城市级别匹配
    const cityLevel = this.getCityLevel(college.city);
    if (prefs.cityLevel) {
      if (prefs.cityLevel === cityLevel) score += 30;
      else if (Math.abs(this.cityLevelToNumber(prefs.cityLevel) - this.cityLevelToNumber(cityLevel)) === 1) {
        score += 15; // 差一级,给一半分
      }
    }

    // 3. 距离家乡
    if (prefs.distanceFromHome === '省内' && college.province === prefs.province) {
      score += 20;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 计算就业深造维度得分
   */
  private calculateCareerScore(
    college: College,
    prefs: any,
    weights: any
  ): number {
    let score = 0;
    const maxScore = 100;

    // 1. 就业率
    // (这里简化处理,实际应该查询专业的就业数据)
    score += 40;

    // 2. 保研率
    if (college.postgraduateRate) {
      const furtherStudyRatio = weights.furtherStudy / 100;
      score += college.postgraduateRate * furtherStudyRatio * 60;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 历史分数适配度分析 (核心功能1)
   */
  private async analyzeAdmissionProbability(
    collegeName: string,
    majorGroupCode: string | undefined,
    userPrefs: UserPreferences
  ): Promise<any> {
    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

    // 查询近3年的录取分数线
    let query = admissionScoreRepo
      .createQueryBuilder('score')
      .where('score.collegeName = :collegeName', { collegeName })
      .andWhere('score.sourceProvince = :province', { province: userPrefs.province })
      .andWhere('score.subjectType = :subjectType', { subjectType: userPrefs.subjectType })
      .andWhere('score.year >= :startYear', { startYear: new Date().getFullYear() - 3 });

    if (majorGroupCode) {
      query = query.andWhere('score.majorGroup = :groupCode', { groupCode: majorGroupCode });
    }

    const historicalScores = await query.getMany();

    if (historicalScores.length === 0) {
      return {
        probability: 'unknown',
        score: 50, // 无数据,返回中等分数
        years: 0
      };
    }

    // 计算统计数据
    const minScores = historicalScores.map(s => s.minScore).filter((score): score is number => score !== undefined && score !== null);

    if (minScores.length === 0) {
      return {
        probability: 'unknown',
        score: 50,
        years: 0
      };
    }

    const historicalMinScore = Math.min(...minScores);
    const historicalAvgScore = minScores.reduce((a, b) => a + b, 0) / minScores.length;
    const scoreDifference = userPrefs.examScore - historicalMinScore;

    // 分析趋势
    const sortedScores = historicalScores.sort((a, b) => (a.year || 0) - (b.year || 0));
    const trend = this.analyzeTrend(minScores);

    // 确定录取概率
    let probability: string;
    let probabilityScore: number;

    if (scoreDifference >= 30) {
      probability = 'high';
      probabilityScore = 90;
    } else if (scoreDifference >= 15) {
      probability = 'high';
      probabilityScore = 80;
    } else if (scoreDifference >= 5) {
      probability = 'medium';
      probabilityScore = 65;
    } else if (scoreDifference >= -5) {
      probability = 'medium';
      probabilityScore = 50;
    } else if (scoreDifference >= -15) {
      probability = 'low';
      probabilityScore = 30;
    } else {
      probability = 'low';
      probabilityScore = 15;
    }

    // 趋势调整
    if (trend === 'rising' && scoreDifference < 20) {
      probabilityScore -= 10; // 分数线上升趋势,降低录取概率
    } else if (trend === 'falling' && scoreDifference < 20) {
      probabilityScore += 5; // 分数线下降趋势,提高录取概率
    }

    return {
      probability,
      score: probabilityScore,
      historicalMinScore,
      historicalAvgScore,
      scoreDifference,
      years: historicalScores.length,
      trend
    };
  }

  /**
   * 专业组调剂风险评估 (核心功能2)
   */
  private async assessMajorAdjustmentRisk(
    collegeName: string,
    majorGroupCode: string | undefined,
    targetMajors: string[],
    userPrefs: UserPreferences
  ): Promise<any> {
    if (!majorGroupCode) {
      return {
        riskLevel: 'none',
        riskScore: 0
      };
    }

    const enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);

    // 查询该专业组内的所有专业
    const majorsInGroup = await enrollmentPlanRepo.find({
      where: {
        collegeName,
        majorGroupCode,
        sourceProvince: userPrefs.province,
        subjectType: userPrefs.subjectType,
        year: new Date().getFullYear()
      }
    });

    if (majorsInGroup.length <= 1) {
      return {
        riskLevel: 'none',
        majorsInGroup: majorsInGroup.length,
        riskScore: 0
      };
    }

    // 分析哪些专业匹配,哪些不匹配
    const matchedMajors: string[] = [];
    const unmatchedMajors: string[] = [];

    for (const plan of majorsInGroup) {
      if (targetMajors.includes(plan.majorName)) {
        matchedMajors.push(plan.majorName);
      } else {
        unmatchedMajors.push(plan.majorName);
      }
    }

    // 计算调剂概率和风险等级
    const unmatchedRatio = unmatchedMajors.length / majorsInGroup.length;
    let riskLevel: string;
    let adjustmentProbability: number;

    if (matchedMajors.length === 0) {
      // 专业组内没有匹配的专业 -> 高风险
      riskLevel = 'high';
      adjustmentProbability = 0.9;
    } else if (unmatchedRatio > 0.6) {
      // 超过60%是不匹配的专业 -> 高风险
      riskLevel = 'high';
      adjustmentProbability = unmatchedRatio * 0.7;
    } else if (unmatchedRatio > 0.3) {
      // 30%-60%不匹配 -> 中等风险
      riskLevel = 'medium';
      adjustmentProbability = unmatchedRatio * 0.5;
    } else {
      // 不匹配比例小于30% -> 低风险
      riskLevel = 'low';
      adjustmentProbability = unmatchedRatio * 0.3;
    }

    const riskDescription = this.generateRiskDescription(
      riskLevel,
      majorsInGroup.length,
      matchedMajors.length,
      unmatchedMajors
    );

    return {
      riskLevel,
      riskScore: adjustmentProbability * 100, // 转为0-100分
      majorsInGroup: majorsInGroup.length,
      matchedMajors: matchedMajors.length,
      unmatchedMajors,
      adjustmentProbability,
      riskDescription
    };
  }

  /**
   * 计算风险惩罚分数
   */
  private calculateRiskPenalty(adjustmentRisk: any): number {
    if (!adjustmentRisk || adjustmentRisk.riskLevel === 'none') {
      return 0;
    }

    // 根据风险等级给予不同程度的惩罚
    const penalties = {
      'low': -5,
      'medium': -15,
      'high': -30
    };

    return penalties[adjustmentRisk.riskLevel as keyof typeof penalties] || 0;
  }

  /**
   * 步骤4: 分类志愿(冲刺/适中/稳妥)
   */
  private categorizeVolunteers(volunteers: Partial<CandidateVolunteer>[], userScore: number): void {
    for (const volunteer of volunteers) {
      const admission = volunteer.admissionProbability;

      if (!admission) {
        volunteer.scoreCategory = 'moderate';
        continue;
      }

      const scoreDiff = admission.scoreDifference;

      if (scoreDiff < 10) {
        volunteer.scoreCategory = 'bold'; // 冲刺
      } else if (scoreDiff < 25) {
        volunteer.scoreCategory = 'moderate'; // 适中
      } else {
        volunteer.scoreCategory = 'stable'; // 稳妥
      }
    }
  }

  /**
   * 生成推荐理由
   */
  private generateMatchingReasons(
    volunteer: Partial<CandidateVolunteer>,
    college: College,
    prefs: any
  ): void {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 院校匹配理由
    if (college.is985) reasons.push('985工程院校,综合实力强');
    if (college.is211) reasons.push('211工程院校,国家重点建设');
    if (college.isDoubleFirstClass) reasons.push('双一流建设高校');

    // 分数匹配
    const admission = volunteer.admissionProbability;
    if (admission) {
      if (admission.probability === 'high') {
        reasons.push(`历年录取线${admission.scoreDifference}分以下,录取把握大`);
      } else if (admission.probability === 'medium') {
        reasons.push(`分数处于历年录取线附近,有录取可能`);
      } else {
        warnings.push(`分数低于历年录取线,存在退档风险`);
      }
    }

    // 专业调剂风险
    const risk = volunteer.majorAdjustmentRisk;
    if (risk && risk.riskLevel !== 'none') {
      if (risk.riskLevel === 'high') {
        warnings.push(risk.riskDescription);
      } else if (risk.riskLevel === 'medium') {
        warnings.push(`专业组内有${risk.unmatchedMajors.length}个不匹配专业,存在调剂风险`);
      }
    }

    // 保研率
    if (college.postgraduateRate && college.postgraduateRate > 20) {
      reasons.push(`保研率${college.postgraduateRate.toFixed(1)}%,深造机会多`);
    }

    volunteer.matchingReasons = reasons;
    volunteer.riskWarnings = warnings;
  }

  // ========== 辅助方法 ==========

  /**
   * 保底策略: 当筛选结果不足时,获取通用推荐
   */
  private async getFallbackVolunteers(
    userPrefs: UserPreferences,
    neededCount: number
  ): Promise<CandidateVolunteer[]> {
    console.log(`  🆘 执行保底策略,需要补充 ${neededCount} 个志愿`);

    const collegeRepo = AppDataSource.getRepository(College);
    const enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);

    // 策略1: 获取该省份招生的所有院校 (不限分数)
    const allColleges = await collegeRepo
      .createQueryBuilder('college')
      .limit(100)
      .getMany();

    const volunteers: CandidateVolunteer[] = [];

    for (const college of allColleges) {
      if (volunteers.length >= neededCount) break;

      // 获取该院校在该省的招生计划
      const plans = await enrollmentPlanRepo.find({
        where: {
          collegeName: college.name,
          sourceProvince: userPrefs.province,
          subjectType: userPrefs.subjectType,
          year: new Date().getFullYear()
        },
        take: 5 // 每个院校取5个专业
      });

      // 按专业组分组
      const groupedPlans = this.groupByMajorGroup(plans);

      for (const [groupCode, groupPlans] of Object.entries(groupedPlans)) {
        if (volunteers.length >= neededCount) break;

        const firstPlan = groupPlans[0];
        volunteers.push({
          collegeId: college.id,
          collegeName: college.name,
          majorGroupCode: groupCode || undefined,
          majorGroupName: firstPlan.majorGroupName || undefined,
          majorName: firstPlan.majorName,
          totalScore: 0,
          dimensionScores: {},
          matchingReasons: ['保底推荐'],
          riskWarnings: [],
          scoreCategory: 'stable',
          admissionProbability: undefined,
          majorAdjustmentRisk: undefined
        });
      }
    }

    console.log(`  ✅ 保底策略补充了 ${volunteers.length} 个志愿`);
    return volunteers;
  }

  /**
   * 解析用户偏好
   */
  private parsePreferences(preferences: AgentPreference[]): any {
    const prefs: any = {};

    for (const pref of preferences) {
      // 解析value,如果是字符串则JSON.parse
      let value = pref.value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Failed to parse preference value for ${pref.indicatorId}:`, value);
          continue;
        }
      }

      switch (pref.indicatorId) {
        case 'CORE_09':
          prefs.majorCategories = Array.isArray(value) ? value : [];
          break;
        case 'CORE_10':
          prefs.targetMajors = Array.isArray(value) ? value : [];
          break;
        case 'CORE_15':
          prefs.collegeLevels = Array.isArray(value) ? value : [];
          break;
        case 'CORE_16':
          prefs.collegeTypes = Array.isArray(value) ? value : [];
          break;
        case 'CORE_20':
          prefs.targetCities = Array.isArray(value) ? value : [];
          break;
        case 'CORE_21':
          prefs.cityLevel = value;
          break;
        case 'CORE_22':
          prefs.distanceFromHome = value;
          break;
        case 'CORE_25':
          prefs.expectedSalary = (value && typeof value === 'object') ? (value.min || 0) : 0;
          break;
        case 'CORE_12':
          prefs.majorHotness = value;
          break;
        case 'CORE_18':
          prefs.academicAtmosphere = value;
          break;
        // ... 可以添加更多指标解析
      }
    }

    return prefs;
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(scores: number[]): string {
    if (scores.length < 2) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgSecond - avgFirst > 5) return 'rising';
    if (avgFirst - avgSecond > 5) return 'falling';
    return 'stable';
  }

  /**
   * 获取城市级别
   */
  private getCityLevel(city: string): string {
    const tier1 = ['北京', '上海', '广州', '深圳'];
    const newTier1 = ['成都', '杭州', '重庆', '西安', '苏州', '武汉', '南京', '天津', '郑州', '长沙', '东莞', '沈阳', '青岛', '合肥', '佛山'];

    if (tier1.includes(city)) return '一线城市';
    if (newTier1.includes(city)) return '新一线城市';
    return '二线城市';
  }

  /**
   * 城市级别转数字
   */
  private cityLevelToNumber(level: string): number {
    const map: Record<string, number> = {
      '一线城市': 1,
      '新一线城市': 2,
      '二线城市': 3,
      '三线及以下': 4
    };
    return map[level] || 3;
  }

  /**
   * 生成风险描述
   */
  private generateRiskDescription(
    riskLevel: string,
    totalMajors: number,
    matchedCount: number,
    unmatchedMajors: string[]
  ): string {
    if (riskLevel === 'high') {
      return `⚠️ 高风险: 该专业组共${totalMajors}个专业,仅${matchedCount}个符合你的偏好,` +
             `可能被调剂至${unmatchedMajors.slice(0, 3).join('、')}等专业`;
    } else if (riskLevel === 'medium') {
      return `⚠️ 中等风险: 专业组内${totalMajors}个专业中有${unmatchedMajors.length}个不太匹配`;
    } else {
      return '✅ 低风险: 专业组内大部分专业符合偏好';
    }
  }
}
