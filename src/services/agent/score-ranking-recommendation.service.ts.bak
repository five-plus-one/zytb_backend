import { AppDataSource } from '../../config/database';
import { AgentPreference } from '../../models/AgentPreference';
import { College } from '../../models/College';
import { EnrollmentPlan } from '../../models/EnrollmentPlan';
import { AdmissionScore } from '../../models/AdmissionScore';
import { ScoreRanking } from '../../models/ScoreRanking';

/**
 * 基于分数排名的推荐引擎
 *
 * 核心逻辑:
 * 1. 根据用户分数计算对应的省内排名
 * 2. 查询近3年内,历史录取排名在用户排名上下范围内的所有院校专业组
 * 3. 根据用户偏好动态计算各维度得分(不是固定50%!)
 * 4. 按总分排序,选出top N
 * 5. 按冲稳保1:1:1比例分配
 */

interface Candidate {
  // 基础信息
  collegeCode: string;  // 院校代码
  collegeId: string;
  collegeName: string;
  majorGroupCode?: string;
  majorGroupName?: string;
  enrollmentPlanCount: number;

  // 专业组内的专业列表(最多6个)
  majors: Array<{
    majorCode: string;
    majorName: string;
    planCount: number;
    tuitionFee?: number;
    studyYears?: number;
    subjectRequirements?: string;
  }>;

  // 历史数据
  historicalMinScore: number;  // 历史最低分
  historicalMinRank?: number;   // 历史最低排名
  historicalAvgScore: number;   // 历史平均分
  year: number;                 // 数据年份

  // 分数差异
  userScoreDiff: number;        // 用户分数 - 历史最低分
  userRankDiff?: number;        // 用户排名 - 历史最低排名

  // 评分
  totalScore: number;
  dimensionScores: {
    collegeScore: number;  // 院校维度 (0-100)
    majorScore: number;    // 专业维度 (0-100)
    cityScore: number;     // 城市维度 (0-100)
    admissionScore: number; // 录取可能性得分 (0-100)
  };

  // 分类
  scoreCategory: 'bold' | 'moderate' | 'stable';
  admissionProbability: 'high' | 'medium' | 'low';

  // 推荐理由
  matchingReasons: string[];
  riskWarnings: string[];

  // 院校详情(后续补充)
  college?: College;
}

interface UserContext {
  userId: string;
  sessionId: string;
  examScore: number;
  province: string;
  subjectType: string;
  scoreRank?: number;  // 用户排名
  preferences: AgentPreference[];
}

export class ScoreRankingRecommendationService {

  /**
   * 主入口:生成推荐
   */
  async generateRecommendations(
    context: UserContext,
    targetCount: number = 60
  ): Promise<any[]> {
    console.log('🚀 === 基于分数排名的推荐引擎启动 ===');
    console.log(`📊 用户信息: 分数=${context.examScore}, 省份=${context.province}, 科类=${context.subjectType}`);

    // Step 1: 计算用户排名 (如果没有提供)
    let userRank = context.scoreRank;
    if (!userRank) {
      userRank = await this.calculateUserRank(context.examScore, context.province, context.subjectType);
      console.log(`📍 计算得到用户排名: ${userRank}`);
    }

    // Step 2: 根据排名范围,查询历年录取数据
    // 策略: 冲刺(排名-5000到排名)、适中(排名到排名+5000)、保底(排名+5000到排名+15000)
    const candidates = await this.fetchCandidatesByRanking(
      context.examScore,
      userRank,
      context.province,
      context.subjectType
    );

    console.log(`✅ 获取到 ${candidates.length} 个候选院校专业组`);

    if (candidates.length === 0) {
      console.warn('⚠️ 没有找到任何候选,尝试降级查询...');
      // 降级策略:直接用分数查询
      return await this.fallbackFetchByScore(context, targetCount);
    }

    // Step 3: 为每个候选计算得分
    await this.scoreAllCandidates(candidates, context);

    // Step 4: 根据分数差进行分类
    this.categorizeByScoreDiff(candidates, context.examScore);

    // Step 5: 按1:1:1比例选择
    const finalList = this.selectByRatio(candidates, targetCount);

    // Step 6: 补充院校详细信息
    await this.enrichCollegeDetails(finalList);

    console.log('✅ === 推荐生成完成 ===');
    console.log(`   冲刺型: ${finalList.filter(c => c.scoreCategory === 'bold').length} 个`);
    console.log(`   适中型: ${finalList.filter(c => c.scoreCategory === 'moderate').length} 个`);
    console.log(`   保底型: ${finalList.filter(c => c.scoreCategory === 'stable').length} 个`);

    return this.formatOutput(finalList);
  }

  /**
   * 计算用户排名
   */
  private async calculateUserRank(
    score: number,
    province: string,
    subjectType: string
  ): Promise<number> {
    const repo = AppDataSource.getRepository(ScoreRanking);

    // 查找最接近的分数对应的排名
    const ranking = await repo
      .createQueryBuilder('sr')
      .where('sr.province = :province', { province })
      .andWhere('sr.subjectType = :subjectType', { subjectType })
      .andWhere('sr.year = :year', { year: new Date().getFullYear() })
      .andWhere('sr.score <= :score', { score })
      .orderBy('sr.score', 'DESC')
      .limit(1)
      .getOne();

    if (ranking && ranking.rank !== undefined && ranking.rank !== null) {
      return ranking.rank;
    }

    if (ranking) {
      return 50000; // rank是null或undefined,返回默认值
    }

    // 如果没找到,估算排名 (假设每1分对应100名)
    console.warn(`⚠️ 未找到排名数据,使用估算值`);
    const baseRank = 50000; // 基础排名
    const scoreAboveBase = score - 500; // 500分以上
    return Math.max(100, baseRank - scoreAboveBase * 100);
  }

  /**
   * 根据排名范围查询候选
   * 核心改进:
   * 1. 以EnrollmentPlan(招生计划)为主查询
   * 2. 对每个招生计划,模糊匹配AdmissionScore(历史录取分数)
   * 3. 确保所有专业信息来自招生计划,不显示"未知"
   */
  private async fetchCandidatesByRanking(
    userScore: number,
    userRank: number,
    province: string,
    subjectType: string
  ): Promise<Candidate[]> {
    // 排名范围策略
    const rankRanges = {
      bold: { min: userRank - 5000, max: userRank },           // 冲刺: 比用户好5000名以内
      moderate: { min: userRank, max: userRank + 5000 },       // 适中: 比用户低5000名以内
      stable: { min: userRank + 5000, max: userRank + 15000 }  // 保底: 比用户低5000-15000名
    };

    console.log(`🔍 查询范围: 排名 ${rankRanges.bold.min} - ${rankRanges.stable.max}`);

    // 查询近3年数据
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3;

    // 规范化科类
    const normalizedSubjectType = subjectType.replace('类', '');

    // 步骤1: 从EnrollmentPlan查询所有招生计划(最新年份)
    const planRepo = AppDataSource.getRepository(EnrollmentPlan);

    const enrollmentPlans = await planRepo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province })
      .andWhere(
        '(plan.subjectType = :subjectType OR plan.subjectType = :normalizedSubjectType)',
        { subjectType, normalizedSubjectType }
      )
      .orderBy('plan.year', 'DESC')
      .addOrderBy('plan.collegeName', 'ASC')
      .addOrderBy('plan.majorGroupCode', 'ASC')
      .addOrderBy('plan.majorName', 'ASC')
      .getMany();

    console.log(`📦 从招生计划查询到 ${enrollmentPlans.length} 条记录`);

    if (enrollmentPlans.length === 0) {
      console.warn('⚠️ 没有找到符合条件的招生计划');
      return [];
    }

    // 步骤2: 按院校+专业组分组
    const groupedPlans = new Map<string, EnrollmentPlan[]>();

    for (const plan of enrollmentPlans) {
      // 使用院校代码+专业组代码作为key,确保精确分组
      const majorGroupKey = plan.majorGroupCode || plan.collegeMajorGroupCode || 'default';
      const key = `${plan.collegeCode}-${majorGroupKey}`;

      if (!groupedPlans.has(key)) {
        groupedPlans.set(key, []);
      }
      groupedPlans.get(key)!.push(plan);
    }

    console.log(`📊 分组后共 ${groupedPlans.size} 个院校专业组`);

    // 步骤3: 为每个院校专业组模糊匹配历年录取分数
    const scoreRepo = AppDataSource.getRepository(AdmissionScore);
    const candidates: Candidate[] = [];

    for (const [key, plans] of groupedPlans.entries()) {
      const firstPlan = plans[0];
      const collegeCode = firstPlan.collegeCode;
      const collegeName = firstPlan.collegeName;
      const majorGroupCode = firstPlan.majorGroupCode || firstPlan.collegeMajorGroupCode;
      const majorGroupName = firstPlan.majorGroupName;

      // 构建专业列表(最多6个) - 使用当前分组的plans
      const majors = plans.slice(0, 6).map(plan => ({
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        planCount: plan.planCount,
        tuitionFee: plan.tuition,
        studyYears: plan.studyYears,
        subjectRequirements: plan.subjectRequirements
      }));

      const totalPlanCount = majors.reduce((sum, m) => sum + m.planCount, 0);

      // 模糊匹配历年录取分数
      // 策略1: 精确匹配 - 院校名称 + 专业组
      let admissionScores = await scoreRepo
        .createQueryBuilder('score')
        .where('score.sourceProvince = :province', { province })
        .andWhere('score.collegeName = :collegeName', { collegeName })
        .andWhere('score.subjectType = :subjectType', { subjectType })
        .andWhere('score.year >= :startYear', { startYear })
        .andWhere('score.minScore IS NOT NULL')
        .andWhere('score.majorGroup = :majorGroup', { majorGroup: majorGroupCode })
        .orderBy('score.year', 'DESC')
        .limit(3)
        .getMany();

      // 策略2: 如果精确匹配失败,尝试模糊匹配 - 只按院校名称,找相近的专业组
      if (admissionScores.length === 0 && majorGroupCode) {
        admissionScores = await scoreRepo
          .createQueryBuilder('score')
          .where('score.sourceProvince = :province', { province })
          .andWhere('score.collegeName = :collegeName', { collegeName })
          .andWhere('score.subjectType = :subjectType', { subjectType })
          .andWhere('score.year >= :startYear', { startYear })
          .andWhere('score.minScore IS NOT NULL')
          .andWhere('score.majorGroup LIKE :pattern', { pattern: `%${majorGroupCode}%` })
          .orderBy('score.year', 'DESC')
          .limit(3)
          .getMany();
      }

      // 策略3: 如果还是失败,只按院校名称查询最近的录取分数
      if (admissionScores.length === 0) {
        admissionScores = await scoreRepo
          .createQueryBuilder('score')
          .where('score.sourceProvince = :province', { province })
          .andWhere('score.collegeName = :collegeName', { collegeName })
          .andWhere('score.subjectType = :subjectType', { subjectType })
          .andWhere('score.year >= :startYear', { startYear })
          .andWhere('score.minScore IS NOT NULL')
          .orderBy('score.year', 'DESC')
          .addOrderBy('score.minScore', 'ASC')
          .limit(3)
          .getMany();
      }

      console.log(`  ${collegeName} ${majorGroupCode || '(无专业组)'}: 匹配到 ${admissionScores.length} 条历年分数`);

      // 如果完全没有历年分数,跳过这个候选
      if (admissionScores.length === 0) {
        console.log(`  ⚠️ ${collegeName} 无历年分数数据,跳过`);
        continue;
      }

      // 使用最近一年的数据
      const latestScore = admissionScores[0];
      const avgScore = admissionScores.reduce((sum, s) => sum + (s.minScore || 0), 0) / admissionScores.length;

      // 计算分数和排名差异
      const scoreDiff = userScore - (latestScore.minScore || 0);
      const rankDiff = latestScore.minRank && userRank ? userRank - latestScore.minRank : undefined;

      // 判断是否在合理范围内
      const isInReasonableRange =
        (latestScore.minRank && userRank &&
         userRank >= rankRanges.bold.min && userRank <= rankRanges.stable.max) ||
        (scoreDiff >= -80 && scoreDiff <= 50);

      if (!isInReasonableRange) {
        console.log(`  ⏭️ ${collegeName} 分数/排名不在合理范围,跳过`);
        continue;
      }

      candidates.push({
        collegeCode: collegeCode,
        collegeId: collegeCode,
        collegeName: collegeName,
        majorGroupCode: majorGroupCode,
        majorGroupName: majorGroupName || '未命名专业组',
        enrollmentPlanCount: totalPlanCount,
        majors: majors, // 专业列表来自招生计划
        historicalMinScore: latestScore.minScore || 0,
        historicalMinRank: latestScore.minRank,
        historicalAvgScore: Math.round(avgScore),
        year: latestScore.year,
        userScoreDiff: scoreDiff,
        userRankDiff: rankDiff,
        totalScore: 0,
        dimensionScores: {
          collegeScore: 0,
          majorScore: 0,
          cityScore: 0,
          admissionScore: 0
        },
        scoreCategory: 'moderate',
        admissionProbability: 'medium',
        matchingReasons: [],
        riskWarnings: []
      });
    }

    console.log(`✅ 生成了 ${candidates.length} 个候选项(含完整招生简章信息)`);
    return candidates;
  }

  /**
   * 降级策略:直接用分数查询
   */
  private async fallbackFetchByScore(
    context: UserContext,
    targetCount: number
  ): Promise<any[]> {
    console.log('🔄 使用降级策略:直接从招生计划查询');

    const repo = AppDataSource.getRepository(EnrollmentPlan);
    const currentYear = new Date().getFullYear();

    const normalizedSubjectType = context.subjectType.replace('类', '');

    const plans = await repo
      .createQueryBuilder('plan')
      .where('plan.sourceProvince = :province', { province: context.province })
      .andWhere('plan.subjectType = :subjectType', { subjectType: normalizedSubjectType })
      .andWhere('plan.year = :year', { year: currentYear })
      .limit(targetCount * 2)
      .getMany();

    console.log(`📦 查询到 ${plans.length} 条招生计划`);

    // 简单转换为输出格式
    const results = [];
    for (const plan of plans.slice(0, targetCount)) {
      results.push({
        collegeId: plan.collegeId || 'unknown',
        collegeName: plan.collegeName,
        majorName: plan.majorName,
        majorGroupCode: plan.majorGroupCode,
        majorGroupName: plan.majorGroupName,
        totalScore: 50,
        scoreCategory: 'moderate',
        admissionProbability: 'medium',
        dimensionScores: {
          collegeScore: 50,
          majorScore: 50,
          cityScore: 50,
          admissionScore: 50
        },
        matchingReasons: ['基于招生计划的推荐'],
        riskWarnings: ['缺少历史数据,无法准确评估录取可能性']
      });
    }

    return results;
  }

  /**
   * 为所有候选计算得分
   */
  private async scoreAllCandidates(
    candidates: Candidate[],
    context: UserContext
  ): Promise<void> {
    console.log('📊 开始计算候选得分...');

    // 解析用户偏好
    const preferences = this.parsePreferences(context.preferences);
    const weights = preferences.weights;

    console.log(`⚖️  用户权重: 院校${weights.college}%, 专业${weights.major}%, 城市${weights.city}%`);

    for (const candidate of candidates) {
      // 1. 院校得分 (根据用户偏好动态计算)
      candidate.dimensionScores.collegeScore = await this.calculateCollegeScore(
        candidate.collegeName,
        preferences
      );

      // 2. 专业得分 (根据用户偏好动态计算)
      candidate.dimensionScores.majorScore = this.calculateMajorScore(
        candidate.majorGroupCode,
        candidate.majorGroupName,
        preferences
      );

      // 3. 城市得分 (根据用户偏好动态计算)
      candidate.dimensionScores.cityScore = await this.calculateCityScore(
        candidate.collegeName,
        preferences,
        context.province
      );

      // 4. 录取可能性得分 (基于分数差/排名差)
      candidate.dimensionScores.admissionScore = this.calculateAdmissionScore(
        candidate.userScoreDiff,
        candidate.userRankDiff
      );

      // 计算总分 (加权平均)
      candidate.totalScore =
        candidate.dimensionScores.collegeScore * (weights.college / 100) +
        candidate.dimensionScores.majorScore * (weights.major / 100) +
        candidate.dimensionScores.cityScore * (weights.city / 100) +
        candidate.dimensionScores.admissionScore * 0.1; // 录取可能性占10%
    }

    console.log('✅ 候选得分计算完成');
  }

  /**
   * 计算院校得分 (动态,根据用户偏好)
   * 改进: 即使没有明确偏好,也要根据客观实力产生差异化得分
   */
  private async calculateCollegeScore(
    collegeName: string,
    preferences: any
  ): Promise<number> {
    const repo = AppDataSource.getRepository(College);
    const college = await repo.findOne({ where: { name: collegeName } });

    if (!college) {
      return 50; // 未找到院校信息,返回中性分
    }

    let score = 0;

    // 根据用户偏好计算
    const collegePrefs = preferences.college || {};

    // 1. 院校层次得分(根据客观实力,不是固定分数)
    if (preferences.weights.college === 0) {
      // 用户完全不关心院校,给所有院校相同基础分
      score += 50;
    } else {
      // 根据院校实力动态打分
      let levelScore = 0;

      if (college.is985) {
        levelScore = 40;
        // 有明确985偏好,额外加分
        if (collegePrefs.level985) levelScore += 5;
      } else if (college.is211) {
        levelScore = 30;
        // 有明确211偏好,额外加分
        if (collegePrefs.level211) levelScore += 5;
      } else if (college.isDoubleFirstClass) {
        levelScore = 25;
        if (collegePrefs.levelDoubleFirst) levelScore += 5;
      } else {
        levelScore = 20;
      }

      score += levelScore;
    }

    // 2. 排名得分(差异化,前10名和200名差距明显)
    if (college.rank) {
      let rankScore = 0;
      if (college.rank <= 10) {
        rankScore = 30 + (10 - college.rank); // 1-10名: 31-40分
      } else if (college.rank <= 50) {
        rankScore = 25 + Math.floor((50 - college.rank) / 8); // 11-50名: 25-30分
      } else if (college.rank <= 100) {
        rankScore = 20 + Math.floor((100 - college.rank) / 10); // 51-100名: 20-25分
      } else if (college.rank <= 200) {
        rankScore = 15 + Math.floor((200 - college.rank) / 20); // 101-200名: 15-20分
      } else {
        rankScore = 10 + Math.floor((500 - Math.min(college.rank, 500)) / 50); // 200+名: 10-15分
      }
      score += rankScore;
    } else {
      // 没有排名的院校给较低分
      score += 8;
    }

    // 3. 学科实力(世界一流学科数量)
    if (college.worldClassDisciplines) {
      const count = college.worldClassDisciplines.split(',').length;
      score += Math.min(count * 2, 20);
    }

    // 4. 院校类型匹配
    if (collegePrefs.preferredTypes && college.type && collegePrefs.preferredTypes.includes(college.type)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * 计算专业得分 (动态,根据用户偏好)
   * 改进: 即使没有目标专业,也要根据专业热度、就业率等产生差异化得分
   */
  private calculateMajorScore(
    majorGroupCode?: string,
    majorGroupName?: string,
    preferences?: any
  ): number {
    const majorPrefs = preferences?.major || {};
    const targetMajors = majorPrefs.targetMajors || [];

    // 用户有明确目标专业
    if (targetMajors.length > 0) {
      let score = 30; // 基础分

      // 检查是否匹配用户目标专业
      const matchText = `${majorGroupCode || ''} ${majorGroupName || ''}`.toLowerCase();

      for (const target of targetMajors) {
        const targetLower = target.toLowerCase();

        // 精确匹配
        if (matchText === targetLower || matchText.includes(targetLower)) {
          score += 70;
          return Math.min(score, 100);
        }

        // 包含匹配
        if (targetLower.includes(matchText) || matchText.includes(targetLower.substring(0, 4))) {
          score += 50;
          return Math.min(score, 100);
        }

        // 相关专业匹配
        const relatedGroups = {
          '计算机': ['软件', '信息', '网络', '数据', '人工智能', '智能', '电子信息'],
          '电子': ['通信', '信息工程', '自动化', '电气'],
          '机械': ['机电', '智能制造', '机器人', '自动化'],
          '经济': ['金融', '财务', '会计', '贸易'],
          '医学': ['临床', '口腔', '药学', '护理'],
          '法学': ['法律', '知识产权'],
          '教育': ['师范', '学前']
        };

        for (const [key, related] of Object.entries(relatedGroups)) {
          if (targetLower.includes(key)) {
            if (related.some(r => matchText.includes(r))) {
              score += 40;
              return Math.min(score, 100);
            }
          }
        }
      }

      // 没有匹配到,低分
      return 30;
    }

    // 用户没有明确目标专业,根据专业热度和类型给差异化得分
    if (preferences?.weights?.major === 0) {
      // 用户完全不关心专业,所有专业给相同分数
      return 50;
    }

    // 根据专业关键词评估热度和就业前景
    const matchText = `${majorGroupCode || ''} ${majorGroupName || ''}`.toLowerCase();
    let score = 40; // 基础分

    // 热门专业加分
    const hotMajors = [
      '计算机', '软件', '人工智能', '数据', '信息', '电子', '通信',
      '金融', '经济', '会计', '临床医学', '口腔', '法学', '建筑'
    ];

    for (const hot of hotMajors) {
      if (matchText.includes(hot)) {
        score += 20;
        break;
      }
    }

    // 较热门专业
    const warmMajors = [
      '机械', '自动化', '电气', '土木', '化学', '生物', '材料',
      '管理', '工商', '市场', '外语', '新闻', '设计'
    ];

    for (const warm of warmMajors) {
      if (matchText.includes(warm)) {
        score += 10;
        break;
      }
    }

    // 冷门专业不扣分,保持基础分
    // 这样可以确保即使是相对冷门的专业,也有一定得分

    return Math.min(score, 100);
  }

  /**
   * 计算城市得分 (动态,根据用户偏好)
   * 改进: 即使没有明确目标城市,也要根据城市等级和地理位置产生差异化得分
   */
  private async calculateCityScore(
    collegeName: string,
    preferences: any,
    userProvince: string
  ): Promise<number> {
    const repo = AppDataSource.getRepository(College);
    const college = await repo.findOne({ where: { name: collegeName } });

    if (!college) {
      return 50; // 未找到院校信息,返回中性分
    }

    const cityPrefs = preferences?.city || {};
    const targetCities = cityPrefs.targetCities || [];

    // 用户完全不关心城市
    if (preferences?.weights?.city === 0) {
      return 50;
    }

    let score = 30; // 基础分

    // 1. 本省偏好
    if (cityPrefs.preferLocal) {
      if (college.province === userProvince) {
        score += 40; // 本省院校加分
      } else {
        score -= 15; // 不是本省,扣分
      }
    } else {
      // 没有本省偏好,本省院校略加分(方便)
      if (college.province === userProvince) {
        score += 5;
      }
    }

    // 2. 目标城市匹配(最高优先级)
    if (targetCities.length > 0) {
      const matched = targetCities.some((city: string) =>
        college.city.includes(city) || city.includes(college.city) ||
        college.province.includes(city) || city.includes(college.province)
      );

      if (matched) {
        score += 50; // 匹配目标城市,高分
      } else {
        score -= 10; // 不匹配目标城市,扣分
      }
    }

    // 3. 城市等级得分(差异化)
    const cityTiers: { [key: string]: number } = {
      // 一线城市
      '北京': 30,
      '上海': 30,
      '广州': 28,
      '深圳': 28,
      // 新一线城市
      '杭州': 25,
      '成都': 24,
      '南京': 24,
      '武汉': 23,
      '西安': 23,
      '重庆': 22,
      '苏州': 22,
      '天津': 21,
      '郑州': 20,
      '长沙': 20,
      '沈阳': 19,
      '青岛': 19,
      '宁波': 18,
      '东莞': 18,
      '大连': 17,
      '厦门': 17,
      '福州': 16,
      '济南': 16,
      // 二线城市
      '合肥': 15,
      '南昌': 14,
      '石家庄': 14,
      '贵阳': 13,
      '南宁': 13,
      '昆明': 13,
      '太原': 12,
      '兰州': 12,
      '哈尔滨': 12,
      '长春': 11,
      '乌鲁木齐': 11,
      '呼和浩特': 10,
      '银川': 10,
      '西宁': 10,
      '拉萨': 10,
      '海口': 10
    };

    const cityScore = cityTiers[college.city] || 8; // 其他城市默认8分
    score += cityScore;

    return Math.min(Math.max(score, 0), 100); // 确保在0-100范围内
  }

  /**
   * 计算录取可能性得分
   */
  private calculateAdmissionScore(scoreDiff: number, rankDiff?: number): number {
    // 优先使用排名差
    if (rankDiff !== undefined) {
      // 排名差越大(用户排名更靠前),录取可能性越高
      if (rankDiff >= 5000) return 95;
      if (rankDiff >= 3000) return 85;
      if (rankDiff >= 1000) return 75;
      if (rankDiff >= 0) return 60;
      if (rankDiff >= -2000) return 45;
      if (rankDiff >= -5000) return 30;
      return 15;
    }

    // 使用分数差
    if (scoreDiff >= 30) return 95;
    if (scoreDiff >= 20) return 85;
    if (scoreDiff >= 10) return 75;
    if (scoreDiff >= 0) return 60;
    if (scoreDiff >= -10) return 45;
    if (scoreDiff >= -20) return 30;
    return 15;
  }

  /**
   * 根据分数差进行分类
   */
  private categorizeByScoreDiff(candidates: Candidate[], userScore: number): void {
    for (const candidate of candidates) {
      const diff = candidate.userScoreDiff;

      if (diff < 0) {
        // 用户分数低于历史最低分
        candidate.scoreCategory = 'bold';
        candidate.admissionProbability = 'low';
      } else if (diff < 15) {
        // 用户分数略高于历史最低分
        candidate.scoreCategory = 'moderate';
        candidate.admissionProbability = 'medium';
      } else {
        // 用户分数明显高于历史最低分
        candidate.scoreCategory = 'stable';
        candidate.admissionProbability = 'high';
      }
    }
  }

  /**
   * 按1:1:1比例选择
   */
  private selectByRatio(candidates: Candidate[], targetCount: number): Candidate[] {
    // 按类别分组
    const bold = candidates.filter(c => c.scoreCategory === 'bold').sort((a, b) => b.totalScore - a.totalScore);
    const moderate = candidates.filter(c => c.scoreCategory === 'moderate').sort((a, b) => b.totalScore - a.totalScore);
    const stable = candidates.filter(c => c.scoreCategory === 'stable').sort((a, b) => b.totalScore - a.totalScore);

    console.log(`📋 候选分布: 冲刺${bold.length}个, 适中${moderate.length}个, 保底${stable.length}个`);

    // 每类应选数量
    const countPerCategory = Math.floor(targetCount / 3);
    const remainder = targetCount % 3;

    const result: Candidate[] = [];

    // 先按保底、适中、冲刺的顺序排列 (保底在前)
    result.push(...stable.slice(0, countPerCategory + (remainder > 0 ? 1 : 0)));
    result.push(...moderate.slice(0, countPerCategory + (remainder > 1 ? 1 : 0)));
    result.push(...bold.slice(0, countPerCategory));

    // 如果某类不足,从其他类补充
    if (result.length < targetCount) {
      const remaining = [
        ...stable.slice(countPerCategory + (remainder > 0 ? 1 : 0)),
        ...moderate.slice(countPerCategory + (remainder > 1 ? 1 : 0)),
        ...bold.slice(countPerCategory)
      ].sort((a, b) => b.totalScore - a.totalScore);

      result.push(...remaining.slice(0, targetCount - result.length));
    }

    return result.slice(0, targetCount);
  }

  /**
   * 补充院校详细信息
   */
  private async enrichCollegeDetails(candidates: Candidate[]): Promise<void> {
    const repo = AppDataSource.getRepository(College);

    for (const candidate of candidates) {
      const college = await repo.findOne({ where: { name: candidate.collegeName } });
      if (college) {
        candidate.collegeId = college.id;
        candidate.college = college;

        // 生成推荐理由
        const reasons: string[] = [];
        if (college.is985) reasons.push('985工程院校');
        if (college.is211) reasons.push('211工程院校');
        if (college.isDoubleFirstClass) reasons.push('双一流建设高校');
        if (candidate.admissionProbability === 'high') reasons.push('录取把握大');
        if (candidate.dimensionScores.majorScore >= 80) reasons.push('专业匹配度高');
        if (candidate.dimensionScores.cityScore >= 80) reasons.push('城市偏好匹配');

        candidate.matchingReasons = reasons;

        // 生成风险提示
        const warnings: string[] = [];
        if (candidate.admissionProbability === 'low') warnings.push('分数偏低,存在退档风险');
        if (candidate.userScoreDiff < -10) warnings.push(`分数低于历史线${Math.abs(candidate.userScoreDiff)}分`);

        candidate.riskWarnings = warnings;
      }
    }
  }

  /**
   * 格式化输出
   */
  private formatOutput(candidates: Candidate[]): any[] {
    return candidates.map((c, index) => ({
      rank: index + 1,
      collegeCode: c.collegeCode, // 院校代码
      collegeId: c.collegeId,
      collegeName: c.collegeName,
      majorGroupCode: c.majorGroupCode,
      majorGroupName: c.majorGroupName,
      majors: c.majors, // 专业组内的专业列表(最多6个)
      enrollmentPlanCount: c.enrollmentPlanCount, // 总招生计划数
      totalScore: c.totalScore,
      scoreCategory: c.scoreCategory,
      admissionProbability: c.admissionProbability,
      dimensionScores: c.dimensionScores,
      historicalMinScore: c.historicalMinScore,
      historicalMinRank: c.historicalMinRank,
      historicalAvgScore: c.historicalAvgScore,
      year: c.year, // 历史数据年份
      userScoreDiff: c.userScoreDiff,
      userRankDiff: c.userRankDiff,
      matchingReasons: c.matchingReasons,
      riskWarnings: c.riskWarnings,
      college: c.college ? {
        id: c.college.id,
        name: c.college.name,
        province: c.college.province,
        city: c.college.city,
        is985: c.college.is985,
        is211: c.college.is211,
        isDoubleFirstClass: c.college.isDoubleFirstClass,
        rank: c.college.rank
      } : null
    }));
  }

  /**
   * 解析用户偏好
   */
  private parsePreferences(preferences: AgentPreference[]): any {
    const result: any = {
      weights: { college: 33, major: 33, city: 33 }, // 默认均等
      college: {},
      major: {},
      city: {}
    };

    for (const pref of preferences) {
      let value = pref.value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // 保持字符串
        }
      }

      switch (pref.indicatorId) {
        case 'CORE_01': // 决策权重
          if (typeof value === 'object' && value !== null) {
            result.weights.college = value.college || 33;
            result.weights.major = value.major || 33;
            result.weights.city = value.city || 33;
          }
          break;

        case 'CORE_10': // 专业偏好
          result.major.targetMajors = Array.isArray(value) ? value : [];
          break;

        case 'CORE_20': // 城市偏好
          result.city.targetCities = Array.isArray(value) ? value : [];
          break;

        case '院校层次偏好':
          if (Array.isArray(value)) {
            result.college.level985 = value.includes('985');
            result.college.level211 = value.includes('211');
            result.college.levelDoubleFirst = value.includes('双一流');
          }
          break;

        case '院校类型偏好':
          result.college.preferredTypes = Array.isArray(value) ? value : [];
          break;

        case '距离家乡':
        case '本省优先':
          if (value === '本省优先' || (typeof value === 'string' && value.includes('本省'))) {
            result.city.preferLocal = true;
          }
          break;
      }
    }

    return result;
  }
}

export default new ScoreRankingRecommendationService();
