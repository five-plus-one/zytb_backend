import { AppDataSource } from '../../config/database';
import { AgentPreference } from '../../models/AgentPreference';
import { Major } from '../../models/Major';
import { College } from '../../models/College';
import { EnrollmentPlan } from '../../models/EnrollmentPlan';
import { AdmissionScore } from '../../models/AdmissionScore';
import { EmbeddingService } from '../embedding.service';
import preferenceEmbeddingService from './preference-embedding.service';
import cacheService from '../cache.service';
import { RecommendationEngine } from './recommendation.service';
import { Not, IsNull, In } from 'typeorm';

/**
 * 基于嵌入向量的增强推荐服务
 *
 * 核心特性：
 * 1. 使用语义嵌入理解用户偏好
 * 2. 多维度智能匹配（院校+专业+城市）
 * 3. 完整的缓存机制
 * 4. 结合传统推荐算法的优势
 */

interface EnhancedRecommendation {
  collegeId: string;
  collegeName: string;
  majorId?: string;
  majorName?: string;
  majorGroupCode?: string;
  majorGroupName?: string;

  // 综合评分
  totalScore: number;
  scoreCategory: 'bold' | 'moderate' | 'stable';

  // 各维度得分
  dimensionScores: {
    // 传统维度
    collegeScore: number;
    majorScore: number;
    cityScore: number;
    employmentScore: number;
    costScore: number;

    // 嵌入向量匹配分数
    embeddingMatchScore: number;      // 语义匹配度
    personalityFitScore: number;      // 性格匹配度
    careerAlignmentScore: number;     // 职业目标匹配度

    [key: string]: number;
  };

  // 历史数据分析
  admissionProbability: any;
  majorAdjustmentRisk?: any;

  // 推荐理由
  matchingReasons: string[];
  riskWarnings: string[];

  // 权重
  weights: Record<string, number>;
}

export class EmbeddingEnhancedRecommendationService {
  private embeddingService: EmbeddingService;
  private traditionalEngine: RecommendationEngine;
  private majorRepository = AppDataSource.getRepository(Major);
  private collegeRepository = AppDataSource.getRepository(College);

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.traditionalEngine = new RecommendationEngine();
  }

  /**
   * 生成增强推荐（主入口）
   */
  async generateEnhancedRecommendations(
    userId: string,
    sessionId: string,
    preferences: AgentPreference[],
    userInfo: {
      examScore: number;
      province: string;
      scoreRank?: number;
      subjectType: string;
    },
    count: number = 40
  ): Promise<EnhancedRecommendation[]> {
    console.log('🚀 开始生成增强推荐...');
    console.log(`用户: ${userId}, 分数: ${userInfo.examScore}, 省份: ${userInfo.province}`);

    // **紧急修复：直接从对话历史提取专业意向**
    await this.extractMajorIntentFromConversation(sessionId, preferences);

    // Step 1: 检查缓存
    const preferencesHash = this.generatePreferencesHash(preferences);
    const cacheContext = {
      score: userInfo.examScore,
      province: userInfo.province,
      preferencesHash
    };

    const cachedRecommendations = await cacheService.getRecommendations(
      userId,
      sessionId,
      cacheContext
    );

    // ⚠️ [调试模式] 临时禁用缓存，确保使用最新逻辑
    const useCache = false;  // 设置为true恢复缓存
    if (cachedRecommendations && useCache) {
      console.log('✅ 使用缓存的推荐结果');
      return cachedRecommendations;
    }

    // 清除旧缓存
    console.log('⚠️  [调试模式] 缓存已禁用，强制重新计算');
    const cachePattern = `rec:${userId}:*`;
    try {
      const redis = cacheService['redis'];  // 访问内部redis实例
      if (redis) {
        const keys = await redis.keys(cachePattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`🗑️  已删除 ${keys.length} 个旧缓存`);
        }
      }
    } catch (err) {
      console.warn('清除缓存失败:', err);
    }

    console.log('🔄 生成新的推荐结果...');

    // Step 2: 生成用户偏好嵌入向量
    const userEmbedding = await preferenceEmbeddingService.generateUserEmbedding(
      userId,
      sessionId,
      preferences
    );

    if (!userEmbedding || userEmbedding.length === 0) {
      console.warn('⚠️  无法生成嵌入向量，使用传统推荐算法');
      return await this.fallbackToTraditionalRecommendation(preferences, userInfo);
    }

    // Step 3: 获取候选院校和专业
    const candidates = await this.getCandidates(userInfo);
    console.log(`📋 获取到 ${candidates.length} 个候选院校专业组合`);

    // Step 4: 为每个候选计算匹配度
    const scoredCandidates = await this.scoreAndRankCandidates(
      candidates,
      userEmbedding,
      preferences,
      userInfo
    );

    console.log(`📊 完成 ${scoredCandidates.length} 个候选的评分`);

    // Step 5: 筛选并排序
    const finalRecommendations = this.selectFinalRecommendations(
      scoredCandidates,
      userInfo.examScore,
      count || 40 // 使用传入的数量参数
    );

    // Step 6: 缓存结果（只缓存非空结果）
    if (finalRecommendations && finalRecommendations.length > 0) {
      await cacheService.cacheRecommendations(
        userId,
        sessionId,
        finalRecommendations,
        cacheContext
      );
    }

    console.log(`✅ 生成 ${finalRecommendations.length} 条推荐`);

    return finalRecommendations;
  }

  /**
   * 从对话历史中提取专业意向（紧急修复）
   * 直接分析对话内容，提取计算机、电子等专业关键词
   */
  private async extractMajorIntentFromConversation(
    sessionId: string,
    preferences: AgentPreference[]
  ): Promise<void> {
    try {
      const AgentMessage = AppDataSource.getRepository('AgentMessage');
      const messages = await AgentMessage.find({
        where: { sessionId },
        order: { createdAt: 'DESC' },
        take: 30
      }) as any[];

      // 专业关键词列表
      const majorKeywords = {
        '计算机': ['计算机', '软件', '程序', '编程', 'CS', 'IT'],
        '电子信息': ['电子', '通信', '信息工程', '电信'],
        '自动化': ['自动化', '机器人', '控制'],
        '机械': ['机械', '机电'],
        '土木': ['土木', '建筑工程'],
        '医学': ['医学', '临床', '护理'],
        '经济': ['经济', '金融', '财务'],
        '管理': ['管理', '工商', '行政']
      };

      const found: string[] = [];

      // 分析对话内容
      for (const msg of messages) {
        const content = (msg.content || '').toLowerCase();

        for (const [category, keywords] of Object.entries(majorKeywords)) {
          if (keywords.some(kw => content.includes(kw.toLowerCase()))) {
            found.push(category);
            break;
          }
        }
      }

      if (found.length > 0) {
        const uniqueFound = [...new Set(found)];
        console.log(`🎯 [对话分析] 从对话中提取到专业意向: ${uniqueFound.join(', ')}`);

        // 临时添加到preferences数组中（不保存到数据库，只用于本次推荐）
        preferences.push({
          indicatorId: 'TEMP_MAJOR_INTENT',
          indicatorName: '临时专业意向（从对话提取）',
          value: uniqueFound,
          confidence: 0.8
        } as any);
      } else {
        console.log('⚠️  [对话分析] 未从对话中提取到明确的专业意向');
      }
    } catch (error) {
      console.error('[对话分析] 提取失败:', error);
    }
  }

  /**
   * 获取候选院校专业组合
   */
  private async getCandidates(userInfo: {
    examScore: number;
    province: string;
    subjectType: string;
  }): Promise<any[]> {
    // 分数范围：-50 到 +80
    const minScore = userInfo.examScore - 50;
    const maxScore = userInfo.examScore + 80;

    console.log(`🔍 查询招生计划: 省份=${userInfo.province}, 科类=${userInfo.subjectType}, 年份=${new Date().getFullYear()}`);

    // 准备兼容的查询条件
    // 科类：支持 "物理"、"物理类"、"历史"、"历史类"
    const subjectTypes = [
      userInfo.subjectType,
      userInfo.subjectType.replace('类', ''),  // 移除'类'
      userInfo.subjectType.includes('类') ? userInfo.subjectType : userInfo.subjectType + '类'  // 添加'类'
    ];

    // 省份：支持 "江苏"、"江苏省"
    const provinces = [
      userInfo.province,
      userInfo.province.replace('省', ''),  // 移除'省'
      userInfo.province.includes('省') ? userInfo.province : userInfo.province + '省'  // 添加'省'
    ];

    // 查询最新可用年份（可能数据库中只有2024年数据）
    const latestYearResult = await AppDataSource.getRepository(EnrollmentPlan)
      .createQueryBuilder('ep')
      .select('MAX(ep.year)', 'maxYear')
      .where('ep.sourceProvince IN (:...provinces)', { provinces })
      .andWhere('ep.subjectType IN (:...subjectTypes)', { subjectTypes })
      .getRawOne();

    const targetYear = latestYearResult?.maxYear || new Date().getFullYear();

    if (targetYear !== new Date().getFullYear()) {
      console.log(`⚠️  未找到${new Date().getFullYear()}年数据，使用${targetYear}年数据`);
    }

    // 查询招生计划（兼容多种格式）
    const enrollmentPlans = await AppDataSource.getRepository(EnrollmentPlan)
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.college', 'college')  // 改用LEFT JOIN，即使college_id为NULL也能返回
      .where('ep.sourceProvince IN (:...provinces)', { provinces })
      .andWhere('ep.subjectType IN (:...subjectTypes)', { subjectTypes })
      .andWhere('ep.year = :year', { year: targetYear })
      .limit(500)  // 限制最多500条，避免性能问题
      .getMany();

    console.log(`📦 找到 ${enrollmentPlans.length} 条招生计划`);

    if (enrollmentPlans.length === 0) {
      console.error('❌ 数据库查询返回0条，请检查：');
      console.error(`   1. enrollment_plans表是否有数据？`);
      console.error(`   2. 查询条件: 省份 IN [${provinces.join(', ')}]`);
      console.error(`   3. 查询条件: 科类 IN [${subjectTypes.join(', ')}]`);
      console.error(`   4. 查询条件: 年份 = ${targetYear}`);
      console.error(`   提示: 请执行 SELECT DISTINCT source_province, subject_type, year FROM enrollment_plans LIMIT 10;`);
    } else {
      // 检查college关联情况
      const withoutCollege = enrollmentPlans.filter(p => !p.college).length;
      if (withoutCollege > 0) {
        console.warn(`⚠️  有 ${withoutCollege} 条记录的college_id未关联，将使用college_name`);
      }
    }

    // 获取历史分数
    const candidates = [];

    for (const plan of enrollmentPlans) {
      // 使用college?.name或collegeName
      const collegeName = plan.college?.name || plan.collegeName;

      // 查询历史录取分数（使用模糊匹配）
      const admissionScores = await this.findHistoricalScores(
        collegeName,
        plan.majorName,
        plan.majorGroupName,
        plan.majorGroupCode,
        userInfo.province,
        userInfo.subjectType
      );

      // 计算平均分数（如果有历史数据）
      let avgScore = userInfo.examScore; // 默认使用用户分数
      if (admissionScores.length > 0) {
        avgScore =
          admissionScores.reduce((sum, s) => sum + (s.minScore || 0), 0) /
          admissionScores.length;
      }

      // 筛选在范围内的候选（放宽要求，即使没有历史数据也包含）
      if (admissionScores.length === 0 || (avgScore >= minScore && avgScore <= maxScore)) {
        candidates.push({
          enrollmentPlan: plan,
          admissionScores,
          avgHistoricalScore: avgScore
        });
      }
    }

    return candidates;
  }

  /**
   * 为候选计算匹配度并排序
   */
  private async scoreAndRankCandidates(
    candidates: any[],
    userEmbedding: number[],
    preferences: AgentPreference[],
    userInfo: any
  ): Promise<EnhancedRecommendation[]> {
    const results: EnhancedRecommendation[] = [];

    // 提取决策权重
    const weights = this.extractDecisionWeights(preferences);

    // **新增：检查是否有明确的专业偏好需要过滤**
    const targetMajorKeywords = this.extractTargetMajorKeywords(preferences);
    if (targetMajorKeywords.length > 0) {
      console.log(`🎯 [专业过滤] 用户偏好专业关键词: ${targetMajorKeywords.join(', ')}`);

      // 过滤候选：只保留匹配的专业
      const filteredCandidates = candidates.filter(c => {
        const majorName = c.enrollmentPlan.majorName || '';
        const groupName = c.enrollmentPlan.majorGroupName || '';
        const searchText = (majorName + ' ' + groupName).toLowerCase();

        return targetMajorKeywords.some(keyword =>
          searchText.includes(keyword.toLowerCase())
        );
      });

      console.log(`🎯 [专业过滤] 过滤前: ${candidates.length}, 过滤后: ${filteredCandidates.length}`);

      if (filteredCandidates.length > 0) {
        candidates = filteredCandidates;
      } else {
        console.warn('⚠️  [专业过滤] 过滤后没有候选，使用全部候选');
      }
    }

    for (const candidate of candidates) {
      try {
        const recommendation = await this.scoreCandidate(
          candidate,
          userEmbedding,
          preferences,
          userInfo,
          weights
        );

        if (recommendation) {
          results.push(recommendation);
        }
      } catch (error: any) {
        console.error('Error scoring candidate:', error.message);
      }
    }

    // 按总分排序
    return results.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 为单个候选计算匹配度
   */
  private async scoreCandidate(
    candidate: any,
    userEmbedding: number[],
    preferences: AgentPreference[],
    userInfo: any,
    weights: Record<string, number>
  ): Promise<EnhancedRecommendation | null> {
    const plan = candidate.enrollmentPlan;
    const college = plan.college;

    // 如果college为NULL，尝试从colleges表查找（支持模糊匹配）
    let collegeInfo = college;
    if (!college && plan.collegeName) {
      // 先尝试精确匹配
      let foundCollege = await this.collegeRepository.findOne({
        where: { name: plan.collegeName }
      });

      // 如果精确匹配失败，尝试模糊匹配
      if (!foundCollege) {
        // 清理院校名称（去掉括号内容、空格等）
        const cleanName = plan.collegeName.replace(/[（(].*?[)）]/g, '').trim();

        // 使用LIKE查询模糊匹配
        const colleges = await this.collegeRepository
          .createQueryBuilder('college')
          .where('college.name LIKE :name', { name: `%${cleanName}%` })
          .orWhere('college.name LIKE :exactName', { exactName: `${cleanName}%` })
          .limit(1)
          .getMany();

        if (colleges.length > 0) {
          foundCollege = colleges[0];
        }
      }

      collegeInfo = foundCollege || {
        id: plan.collegeId || 'unknown',
        name: plan.collegeName || '未知院校',
        province: null,
        city: null,
        is985: false,
        is211: false,
        isDoubleFirstClass: false,
        rank: null,
        type: null,
        worldClassDisciplines: null,
        isNationalKey: false
      } as any;
    } else if (!college) {
      collegeInfo = {
        id: plan.collegeId || 'unknown',
        name: plan.collegeName || '未知院校',
        province: null,
        city: null,
        is985: false,
        is211: false,
        isDoubleFirstClass: false,
        rank: null,
        type: null,
        worldClassDisciplines: null,
        isNationalKey: false
      } as any;
    }

    // 获取专业信息（支持多种匹配方式）
    let major: Major | null = null;
    let majorEmbedding: number[] | null = null;

    // 策略1: 如果有专业代码，通过代码精确匹配
    if (plan.majorCode) {
      major = await this.majorRepository.findOne({
        where: { code: plan.majorCode },
        relations: ['advantageColleges']
      });
    }

    // 策略2: 如果策略1失败，通过专业名称精确匹配
    if (!major && plan.majorName) {
      major = await this.majorRepository.findOne({
        where: { name: plan.majorName },
        relations: ['advantageColleges']
      });
    }

    // 策略3: 如果策略2失败，通过专业名称模糊匹配
    if (!major && plan.majorName) {
      const cleanMajorName = plan.majorName.replace(/[（(].*?[)）]/g, '').trim();
      const majors = await this.majorRepository
        .createQueryBuilder('major')
        .leftJoinAndSelect('major.advantageColleges', 'advantageColleges')
        .where('major.name LIKE :name', { name: `%${cleanMajorName}%` })
        .limit(1)
        .getMany();

      if (majors.length > 0) {
        major = majors[0];
      }
    }

    // 策略4: 如果以上都失败，尝试通过专业类别找到最匹配的专业
    if (!major && plan.majorGroupCode) {
      // 尝试找到专业组中最匹配的专业
      const majorsInGroup = await this.majorRepository.find({
        where: { category: plan.majorGroupName || plan.majorGroupCode },
        relations: ['advantageColleges']
      });

      if (majorsInGroup.length > 0) {
        // 如果有用户嵌入向量，计算每个专业的匹配度
        let bestMatch: { major: Major; score: number } | null = null;

        for (const m of majorsInGroup) {
          if (!m.embeddingVector || m.embeddingVector.length === 0) {
            // 没有嵌入向量的专业，如果名称匹配就使用
            if (plan.majorName && m.name && m.name.includes(plan.majorName)) {
              bestMatch = { major: m, score: 0.9 };
              break;
            }
            continue;
          }

          const matchScore = this.embeddingService.cosineSimilarity(
            userEmbedding,
            m.embeddingVector
          );

          if (!bestMatch || matchScore > bestMatch.score) {
            bestMatch = { major: m, score: matchScore };
          }
        }

        if (bestMatch) {
          major = bestMatch.major;
        }
      }
    }

    // 获取专业嵌入向量
    if (major && major.embeddingVector) {
      majorEmbedding = major.embeddingVector;
    }

    // 输出调试信息
    console.log('[评分调试] =====================================');
    console.log(`[评分调试] 院校: ${collegeInfo.name}`);
    console.log(`[评分调试] 专业: ${plan.majorName}`);
    console.log(`[评分调试] 找到Major对象: ${major ? '是' : '否'} ${major ? `(${major.name})` : ''}`);
    console.log(`[评分调试] 院校信息:`);
    console.log(`  - 城市: ${collegeInfo.city || 'NULL'}`);
    console.log(`  - 省份: ${collegeInfo.province || 'NULL'}`);
    console.log(`  - 985: ${collegeInfo.is985}`);
    console.log(`  - 211: ${collegeInfo.is211}`);
    console.log(`  - 双一流: ${collegeInfo.isDoubleFirstClass}`);
    console.log(`  - 排名: ${collegeInfo.rank || 'NULL'}`);


    // 计算各维度得分
    const dimensionScores = {
      collegeScore: 0,
      majorScore: 0,
      cityScore: 0,
      employmentScore: 0,
      costScore: 0,
      embeddingMatchScore: 0,
      personalityFitScore: 0,
      careerAlignmentScore: 0
    };

    // 1. 嵌入向量匹配分数（核心）
    if (majorEmbedding) {
      dimensionScores.embeddingMatchScore =
        this.embeddingService.cosineSimilarity(userEmbedding, majorEmbedding) * 100;
    }

    // 2. 院校维度得分
    dimensionScores.collegeScore = this.calculateCollegeScore(collegeInfo, preferences);

    // 3. 专业维度得分（即使没有major对象，也基于专业名称计算基础分）
    dimensionScores.majorScore = this.calculateMajorScore(
      major,
      plan.majorName,
      plan.majorGroupName,
      preferences
    );

    // 4. 城市维度得分
    dimensionScores.cityScore = this.calculateCityScore(collegeInfo, preferences, userInfo);

    // 5. 就业维度得分（即使没有major对象，也给基础分）
    dimensionScores.employmentScore = this.calculateEmploymentScore(major, preferences);

    // 6. 成本维度得分
    dimensionScores.costScore = this.calculateCostScore(collegeInfo, preferences);

    // 7. 性格匹配度
    if (major) {
      dimensionScores.personalityFitScore = this.calculatePersonalityFit(
        major,
        preferences
      );
    } else {
      // 没有major对象时，基于专业名称简单判断
      dimensionScores.personalityFitScore = this.calculatePersonalityFitByName(
        plan.majorName || plan.majorGroupName || '',
        preferences
      );
    }

    // 8. 职业目标匹配度
    if (major) {
      dimensionScores.careerAlignmentScore = this.calculateCareerAlignment(
        major,
        preferences
      );
    } else {
      // 给一个中等分数
      dimensionScores.careerAlignmentScore = 50;
    }

    // 输出评分结果
    console.log(`[评分调试] 各维度得分:`);
    console.log(`  - 院校得分: ${dimensionScores.collegeScore.toFixed(2)}`);
    console.log(`  - 专业得分: ${dimensionScores.majorScore.toFixed(2)}`);
    console.log(`  - 城市得分: ${dimensionScores.cityScore.toFixed(2)}`);
    console.log(`  - 就业得分: ${dimensionScores.employmentScore.toFixed(2)}`);
    console.log(`  - 成本得分: ${dimensionScores.costScore.toFixed(2)}`);
    console.log(`  - 性格匹配: ${dimensionScores.personalityFitScore.toFixed(2)}`);
    console.log(`  - 职业匹配: ${dimensionScores.careerAlignmentScore.toFixed(2)}`);
    console.log(`  - 嵌入匹配: ${dimensionScores.embeddingMatchScore.toFixed(2)}`);


    // 计算总分（加权）
    // 使用用户定义的权重分配（CORE_01: college%, major%, city%）
    // 所有维度得分都已经是0-100的标准分数
    const totalScore =
      dimensionScores.collegeScore * (weights.college / 100) +
      dimensionScores.majorScore * (weights.major / 100) +
      dimensionScores.cityScore * (weights.city / 100);

    console.log(`[评分调试] 权重分配: 院校${weights.college}%, 专业${weights.major}%, 城市${weights.city}%`);
    console.log(`[评分调试] 加权计算: ${dimensionScores.collegeScore.toFixed(2)} × ${weights.college}% + ${dimensionScores.majorScore.toFixed(2)} × ${weights.major}% + ${dimensionScores.cityScore.toFixed(2)} × ${weights.city}% = ${totalScore.toFixed(2)}`);

    // 分析录取概率
    const admissionProbability = this.analyzeAdmissionProbability(
      candidate.admissionScores,
      userInfo.examScore
    );

    // 确定分数类别
    const scoreCategory = this.determineScoreCategory(
      userInfo.examScore,
      candidate.avgHistoricalScore
    );

    // 生成推荐理由
    const matchingReasons = this.generateMatchingReasons(
      collegeInfo,
      major,
      dimensionScores,
      weights
    );

    const result = {
      collegeId: collegeInfo.id,
      collegeName: collegeInfo.name,
      majorId: major?.id,
      majorName: major?.name || plan.majorName || plan.majorGroupName,  // 使用实际专业名称
      majorGroupCode: plan.majorGroupCode,
      majorGroupName: plan.majorGroupName,
      totalScore,
      scoreCategory,
      dimensionScores,
      admissionProbability,
      matchingReasons,
      riskWarnings: [],
      weights
    };

    console.log(`[返回数据] majorName: "${result.majorName}"`);

    return result;
  }

  /**
   * 计算院校得分
   */
  private calculateCollegeScore(college: any, preferences: AgentPreference[]): number {
    let score = 0;
    let totalWeight = 0;

    // 1. 院校层次评分 (权重: 40)
    const schoolLevelPref = this.findPreference(preferences, '院校层次偏好');
    const preferredLevels = schoolLevelPref?.value || [];

    let levelScore = 30; // 基础分
    if (college.is985 && preferredLevels.includes('985')) levelScore = 100;
    else if (college.is985) levelScore = 95;
    else if (college.is211 && preferredLevels.includes('211')) levelScore = 90;
    else if (college.is211) levelScore = 85;
    else if (college.isDoubleFirstClass && preferredLevels.includes('双一流')) levelScore = 85;
    else if (college.isDoubleFirstClass) levelScore = 80;
    else if (college.isNationalKey) levelScore = 70;
    else if (preferredLevels.length === 0) levelScore = 60; // 没偏好，普通本科给60分

    score += levelScore * 0.4;
    totalWeight += 0.4;

    // 2. 院校排名评分 (权重: 25)
    if (college.rank) {
      let rankScore = 0;
      if (college.rank <= 10) rankScore = 100;
      else if (college.rank <= 30) rankScore = 95;
      else if (college.rank <= 50) rankScore = 90;
      else if (college.rank <= 100) rankScore = 85;
      else if (college.rank <= 200) rankScore = 75;
      else if (college.rank <= 300) rankScore = 65;
      else rankScore = 50;

      score += rankScore * 0.25;
      totalWeight += 0.25;
    }

    // 3. 学科实力评分 (权重: 20)
    if (college.worldClassDisciplines) {
      const disciplineCount = college.worldClassDisciplines.split(/[,，、]/).length;
      let disciplineScore = Math.min(50 + disciplineCount * 5, 100);
      score += disciplineScore * 0.2;
      totalWeight += 0.2;
    }

    // 4. 院校类型匹配 (权重: 15)
    const collegeTypePref = this.findPreference(preferences, '院校类型偏好');
    const preferredTypes = collegeTypePref?.value || [];

    let typeScore = 70; // 默认分
    if (preferredTypes.includes(college.type)) {
      typeScore = 100;
    } else if (preferredTypes.length === 0) {
      typeScore = 80; // 无偏好
    }

    score += typeScore * 0.15;
    totalWeight += 0.15;

    return totalWeight > 0 ? Math.min(score / totalWeight, 100) : 50;
  }

  /**
   * 计算城市得分（考虑地域偏好）
   * 返回 0-100 的匹配度分数
   */
  private calculateCityScore(college: any, preferences: AgentPreference[], userInfo: any): number {
    let score = 50; // 基础分
    let matchBonus = 0;

    const collegeCity = college.city || '';
    const collegeProvince = college.province || '';
    const userProvince = userInfo.province || '';

    console.log(`  📌 [城市评分] 院校: ${collegeCity}(${collegeProvince}), 用户省份: ${userProvince}`);

    // 1. 省份偏好（最高优先级）
    // 从对话中提取（如"最好不出省"、"本省优先"）
    const distancePref = this.findPreference(preferences, '距离家乡');
    const inSameProvince = collegeProvince === userProvince;

    if (distancePref?.value === '本省优先' || this.hasLocalPreference(preferences)) {
      if (inSameProvince) {
        matchBonus += 40;
        console.log(`    ✅ 本省院校: +40分`);
      } else {
        matchBonus -= 30;
        console.log(`    ❌ 外省院校（不符合本省偏好）: -30分`);
      }
    }

    // 2. 城市偏好匹配
    const cityPref = this.findPreference(preferences, '目标城市');
    const targetCityPref = this.findPreference(preferences, 'CORE_20');
    const preferredCities: string[] = [];

    if (Array.isArray(cityPref?.value)) preferredCities.push(...cityPref.value);
    if (Array.isArray(targetCityPref?.value)) {
      // 过滤掉非城市的值
      const cities = targetCityPref.value.filter((v: string) => this.isCityName(v));
      preferredCities.push(...cities);
    }

    if (preferredCities.length > 0) {
      const matchedCity = preferredCities.some(c =>
        collegeCity.includes(c) || c.includes(collegeCity) ||
        collegeProvince.includes(c) || c.includes(collegeProvince)
      );

      if (matchedCity) {
        matchBonus += 20;
        console.log(`    ✅ 匹配目标城市: +20分`);
      }
    }

    // 3. 城市等级（次要因素）
    const tier1Cities = ['北京', '上海', '广州', '深圳'];
    const tier2Cities = ['杭州', '南京', '成都', '武汉', '西安', '天津', '重庆', '苏州'];

    let tierBonus = 0;
    if (tier1Cities.includes(collegeCity)) {
      tierBonus = 10;
      console.log(`    ⭐ 一线城市: +10分`);
    } else if (tier2Cities.includes(collegeCity)) {
      tierBonus = 5;
      console.log(`    ⭐ 新一线城市: +5分`);
    }

    const finalScore = Math.max(0, Math.min(100, score + matchBonus + tierBonus));
    console.log(`  📊 [城市评分] 最终得分: ${finalScore.toFixed(1)} (基础${score} + 匹配${matchBonus} + 等级${tierBonus})`);

    return finalScore;
  }

  /**
   * 判断用户是否有本地偏好（从对话中推断）
   */
  private hasLocalPreference(preferences: AgentPreference[]): boolean {
    // 检查对话提取的结果
    for (const pref of preferences) {
      if (typeof pref.value === 'string') {
        const val = pref.value.toLowerCase();
        if (val.includes('本省') || val.includes('不出省') || val.includes('省内')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 判断是否是城市名称
   */
  private isCityName(name: string): boolean {
    const cities = [
      '北京', '上海', '天津', '重庆',
      '杭州', '南京', '苏州', '成都', '武汉', '西安', '广州', '深圳',
      '青岛', '济南', '郑州', '合肥', '福州', '厦门', '南昌', '长沙',
      '沈阳', '大连', '哈尔滨', '长春', '石家庄', '太原', '呼和浩特',
      '南宁', '昆明', '贵阳', '兰州', '西宁', '拉萨', '乌鲁木齐',
      '无锡', '常州', '扬州', '镇江', '徐州', '连云港', '淮安', '盐城',
      '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '台州'
    ];

    return cities.some(city => name.includes(city));
  }

  /**
   * 计算就业得分
   */
  private calculateEmploymentScore(major: Major | null, preferences: AgentPreference[]): number {
    if (!major) {
      // 没有major对象时，返回中等分数
      return 60;
    }

    let score = 0;
    let totalWeight = 0;

    // 获取就业-深造权重
    const employmentWeightPref = this.findPreference(preferences, 'CORE_02');
    const employmentWeight = employmentWeightPref?.value?.employment || 50;
    const normalizedWeight = employmentWeight / 100; // 转换为0-1

    // 1. 就业率评分 (权重: 40)
    if (major.employmentRate) {
      let rateScore = 0;
      if (major.employmentRate >= 95) rateScore = 100;
      else if (major.employmentRate >= 90) rateScore = 90;
      else if (major.employmentRate >= 85) rateScore = 80;
      else if (major.employmentRate >= 80) rateScore = 70;
      else if (major.employmentRate >= 75) rateScore = 60;
      else rateScore = 50;

      score += rateScore * 0.4;
      totalWeight += 0.4;
    }

    // 2. 薪资水平评分 (权重: 35)
    const salaryExpectPref = this.findPreference(preferences, '薪资期望');
    const salaryExpect = salaryExpectPref?.value || 8000;

    if (major.avgSalary) {
      let salaryScore = 0;
      const salaryRatio = major.avgSalary / salaryExpect;

      if (salaryRatio >= 1.5) salaryScore = 100;
      else if (salaryRatio >= 1.2) salaryScore = 90;
      else if (salaryRatio >= 1.0) salaryScore = 80;
      else if (salaryRatio >= 0.8) salaryScore = 65;
      else if (salaryRatio >= 0.6) salaryScore = 50;
      else salaryScore = 30;

      score += salaryScore * 0.35;
      totalWeight += 0.35;
    }

    // 3. 行业前景评分 (权重: 25)
    const targetIndustries = this.findPreference(preferences, '目标行业')?.value || [];

    if (major.careerFields && major.careerFields.length > 0) {
      let industryMatchScore = 0;

      if (targetIndustries.length > 0) {
        const matchedCount = major.careerFields.filter(field =>
          targetIndustries.some((industry: string) =>
            field.includes(industry) || industry.includes(field)
          )
        ).length;

        if (matchedCount > 0) {
          industryMatchScore = Math.min(60 + matchedCount * 20, 100);
        } else {
          industryMatchScore = 40;
        }
      } else {
        industryMatchScore = 70; // 无偏好，给中等分
      }

      score += industryMatchScore * 0.25;
      totalWeight += 0.25;
    }

    // 根据用户对就业的重视程度调整分数
    const finalScore = totalWeight > 0 ? (score / totalWeight) : 60;
    return Math.min(finalScore * (0.5 + normalizedWeight * 0.5), 100);
  }

  /**
   * 计算成本得分
   */
  private calculateCostScore(college: any, preferences: AgentPreference[]): number {
    let score = 0;
    let totalWeight = 0;

    // 1. 学费预算匹配 (权重: 60)
    const budgetPref = this.findPreference(preferences, '学费预算');
    const yearlyBudget = budgetPref?.value || 20000; // 默认2万/年

    // 估算学费（简化，实际应该从数据库获取）
    let estimatedTuition = 5000; // 普通公办
    if (college.type === '中外合作') estimatedTuition = 50000;
    else if (college.type === '民办') estimatedTuition = 20000;
    else if (college.is985 || college.is211) estimatedTuition = 6000;

    let budgetScore = 0;
    if (estimatedTuition <= yearlyBudget) {
      budgetScore = 100;
    } else if (estimatedTuition <= yearlyBudget * 1.2) {
      budgetScore = 80;
    } else if (estimatedTuition <= yearlyBudget * 1.5) {
      budgetScore = 60;
    } else {
      budgetScore = 30;
    }

    score += budgetScore * 0.6;
    totalWeight += 0.6;

    // 2. 生活成本 (权重: 40)
    const tier1Cities = ['北京', '上海', '广州', '深圳'];
    const tier2Cities = ['杭州', '南京', '成都', '武汉', '西安', '天津', '重庆'];

    let costScore = 70;
    if (tier1Cities.includes(college.city)) {
      costScore = 50; // 一线城市生活成本高
    } else if (tier2Cities.includes(college.city)) {
      costScore = 70;
    } else {
      costScore = 90; // 三四线城市生活成本低
    }

    score += costScore * 0.4;
    totalWeight += 0.4;

    return totalWeight > 0 ? Math.min(score / totalWeight, 100) : 70;
  }

  /**
   * 计算专业得分（支持没有Major对象的情况）
   * 返回 0-100 的匹配度分数
   */
  private calculateMajorScore(
    major: Major | null,
    majorName?: string,
    majorGroupName?: string,
    preferences?: AgentPreference[]
  ): number {
    let score = 50; // 基础分（中性）
    let matchBonus = 0; // 匹配加分

    // 获取用户的专业偏好（从对话提取或CORE_13等）
    const targetMajorKeywords = this.extractTargetMajorKeywords(preferences || []);

    const currentMajorName = major?.name || majorName || '';
    const currentCategory = major?.category || majorGroupName || '';
    const searchText = (currentMajorName + ' ' + currentCategory).toLowerCase();

    if (targetMajorKeywords.length > 0) {
      console.log(`  📌 [专业评分] 目标专业: ${targetMajorKeywords.join(', ')}, 当前专业: ${currentMajorName}`);

      // 计算匹配度
      let hasMatch = false;
      for (const keyword of targetMajorKeywords) {
        const kw = keyword.toLowerCase();

        // 精确匹配（完全相同）
        if (currentMajorName.toLowerCase() === kw) {
          matchBonus = 50; // 满分
          hasMatch = true;
          console.log(`    ✅ 精确匹配: +50分`);
          break;
        }

        // 高度匹配（包含关键词）
        if (searchText.includes(kw)) {
          matchBonus = Math.max(matchBonus, 40);
          hasMatch = true;
          console.log(`    ✅ 包含匹配: +40分`);
        }

        // 相关匹配（如：计算机 ↔ 软件工程、数据科学）
        const relatedMajors: Record<string, string[]> = {
          '计算机': ['软件', '信息', '数据', '人工智能', '网络', '数字'],
          '电子信息': ['电子', '通信', '信息工程', '电信', '自动化'],
          '机械': ['机电', '机器人', '自动化', '智能制造'],
          '经济': ['金融', '财务', '会计', '商务']
        };

        for (const [key, related] of Object.entries(relatedMajors)) {
          if (kw.includes(key.toLowerCase())) {
            if (related.some(r => searchText.includes(r))) {
              matchBonus = Math.max(matchBonus, 30);
              hasMatch = true;
              console.log(`    🔗 相关匹配: +30分`);
            }
          }
        }
      }

      if (!hasMatch) {
        // 完全不匹配，大幅降分
        matchBonus = -40;
        console.log(`    ❌ 不匹配: -40分`);
      }
    } else {
      // 没有明确偏好，不加也不减分
      console.log(`  ℹ️  [专业评分] 无明确专业偏好，使用基础分`);
    }

    // 如果有Major对象，可以加入其他因素（就业率、薪资等）
    let qualityBonus = 0;
    if (major) {
      if (major.employmentRate && major.employmentRate >= 90) {
        qualityBonus += 5;
      }
      if (major.avgSalary && major.avgSalary >= 10000) {
        qualityBonus += 5;
      }
    }

    const finalScore = Math.max(0, Math.min(100, score + matchBonus + qualityBonus));
    console.log(`  📊 [专业评分] 最终得分: ${finalScore.toFixed(1)} (基础${score} + 匹配${matchBonus} + 质量${qualityBonus})`);

    return finalScore;
  }

  /**
   * 根据专业名称计算性格匹配度（当没有Major对象时使用）
   */
  private calculatePersonalityFitByName(
    majorNameOrCategory: string,
    preferences: AgentPreference[]
  ): number {
    let score = 70; // 基础分

    // 获取MBTI
    const mbtiPref = this.findPreference(preferences, 'CORE_04');
    const mbti = mbtiPref?.value;

    if (!mbti || mbti === '未知') return 70;

    // 根据MBTI和专业名称/类别匹配
    const majorText = majorNameOrCategory.toLowerCase();

    // INTJ/INTP - 分析型，适合理工科
    if (mbti.includes('INT')) {
      if (majorText.includes('计算机') || majorText.includes('数学') ||
          majorText.includes('物理') || majorText.includes('工程') ||
          majorText.includes('软件') || majorText.includes('数据') ||
          majorText.includes('人工智能') || majorText.includes('自动化')) {
        score = 95;
      } else if (majorText.includes('经济') || majorText.includes('管理') ||
                 majorText.includes('金融')) {
        score = 75;
      }
    }
    // ENTJ/ENTP - 领导型，适合管理、商科
    else if (mbti.includes('ENT')) {
      if (majorText.includes('管理') || majorText.includes('经济') ||
          majorText.includes('金融') || majorText.includes('商务') ||
          majorText.includes('工商')) {
        score = 95;
      } else if (majorText.includes('法学') || majorText.includes('政治') ||
                 majorText.includes('行政')) {
        score = 85;
      }
    }
    // INFJ/INFP - 理想型，适合人文、教育
    else if (mbti.includes('INF')) {
      if (majorText.includes('教育') || majorText.includes('心理') ||
          majorText.includes('文学') || majorText.includes('艺术') ||
          majorText.includes('哲学') || majorText.includes('历史')) {
        score = 95;
      } else if (majorText.includes('社会') || majorText.includes('新闻') ||
                 majorText.includes('传播')) {
        score = 85;
      }
    }
    // ENFJ/ENFP - 社交型，适合传媒、教育
    else if (mbti.includes('ENF')) {
      if (majorText.includes('新闻') || majorText.includes('传播') ||
          majorText.includes('教育') || majorText.includes('外语') ||
          majorText.includes('英语') || majorText.includes('营销')) {
        score = 95;
      } else if (majorText.includes('旅游') || majorText.includes('酒店')) {
        score = 85;
      }
    }
    // ISTJ/ISFJ - 守护型，适合医学、会计
    else if (mbti.includes('IST') || mbti.includes('ISF')) {
      if (majorText.includes('医学') || majorText.includes('护理') ||
          majorText.includes('会计') || majorText.includes('财务') ||
          majorText.includes('审计') || majorText.includes('药学')) {
        score = 95;
      } else if (majorText.includes('法学') || majorText.includes('档案')) {
        score = 85;
      }
    }
    // ESTJ/ESFJ - 管理型，适合工商管理
    else if (mbti.includes('EST') || mbti.includes('ESF')) {
      if (majorText.includes('工商') || majorText.includes('行政') ||
          majorText.includes('公共') || majorText.includes('人力资源')) {
        score = 95;
      } else if (majorText.includes('物流') || majorText.includes('供应链')) {
        score = 85;
      }
    }
    // ISTP/ISFP - 技艺型，适合工程、设计
    else if (mbti.includes('ISP')) {
      if (majorText.includes('机械') || majorText.includes('设计') ||
          majorText.includes('建筑') || majorText.includes('艺术') ||
          majorText.includes('工业') || majorText.includes('电气')) {
        score = 95;
      } else if (majorText.includes('环境') || majorText.includes('园林')) {
        score = 85;
      }
    }
    // ESTP/ESFP - 表演型，适合体育、艺术
    else if (mbti.includes('ESP')) {
      if (majorText.includes('体育') || majorText.includes('表演') ||
          majorText.includes('旅游') || majorText.includes('营销') ||
          majorText.includes('广告') || majorText.includes('播音')) {
        score = 95;
      } else if (majorText.includes('舞蹈') || majorText.includes('音乐')) {
        score = 90;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * 计算性格匹配度
   */
  private calculatePersonalityFit(major: Major, preferences: AgentPreference[]): number {
    let score = 70; // 基础分

    // 获取MBTI
    const mbtiPref = this.findPreference(preferences, 'CORE_04');
    const mbti = mbtiPref?.value;

    if (!mbti || mbti === '未知') return 70;

    // 根据MBTI和专业特性匹配
    const majorCategory = major.category || '';
    const majorName = major.name || '';

    // INTJ/INTP - 分析型，适合理工科
    if (mbti.includes('INT')) {
      if (majorCategory.includes('计算机') || majorCategory.includes('数学') ||
          majorCategory.includes('物理') || majorCategory.includes('工程')) {
        score = 95;
      } else if (majorCategory.includes('经济') || majorCategory.includes('管理')) {
        score = 75;
      }
    }
    // ENTJ/ENTP - 领导型，适合管理、商科
    else if (mbti.includes('ENT')) {
      if (majorCategory.includes('管理') || majorCategory.includes('经济') ||
          majorCategory.includes('金融')) {
        score = 95;
      } else if (majorCategory.includes('法学') || majorCategory.includes('政治')) {
        score = 85;
      }
    }
    // INFJ/INFP - 理想型，适合人文、教育
    else if (mbti.includes('INF')) {
      if (majorCategory.includes('教育') || majorCategory.includes('心理') ||
          majorCategory.includes('文学') || majorCategory.includes('艺术')) {
        score = 95;
      } else if (majorCategory.includes('社会') || majorCategory.includes('新闻')) {
        score = 85;
      }
    }
    // ENFJ/ENFP - 社交型，适合传媒、教育
    else if (mbti.includes('ENF')) {
      if (majorCategory.includes('新闻') || majorCategory.includes('传播') ||
          majorCategory.includes('教育') || majorCategory.includes('外语')) {
        score = 95;
      }
    }
    // ISTJ/ISFJ - 守护型，适合医学、会计
    else if (mbti.includes('IST') || mbti.includes('ISF')) {
      if (majorCategory.includes('医学') || majorCategory.includes('护理') ||
          majorCategory.includes('会计') || majorCategory.includes('财务')) {
        score = 95;
      }
    }
    // ESTJ/ESFJ - 管理型，适合工商管理
    else if (mbti.includes('EST') || mbti.includes('ESF')) {
      if (majorCategory.includes('工商') || majorCategory.includes('行政') ||
          majorCategory.includes('公共')) {
        score = 95;
      }
    }
    // ISTP/ISFP - 技艺型，适合工程、设计
    else if (mbti.includes('IST') || mbti.includes('ISF')) {
      if (majorCategory.includes('机械') || majorCategory.includes('设计') ||
          majorCategory.includes('建筑') || majorCategory.includes('艺术')) {
        score = 95;
      }
    }
    // ESTP/ESFP - 表演型，适合体育、艺术
    else if (mbti.includes('EST') || mbti.includes('ESF')) {
      if (majorCategory.includes('体育') || majorCategory.includes('表演') ||
          majorCategory.includes('旅游') || majorCategory.includes('营销')) {
        score = 95;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * 计算职业目标匹配度
   */
  private calculateCareerAlignment(major: Major, preferences: AgentPreference[]): number {
    let score = 0;
    let totalWeight = 0;

    // 1. 目标岗位匹配 (权重: 50)
    const targetPositions = this.findPreference(preferences, '目标岗位')?.value || [];

    if (major.careerFields && targetPositions.length > 0) {
      const careerText = (major.career || '') + ' ' + (major.careerFields?.join(' ') || '');

      let matchCount = 0;
      for (const position of targetPositions) {
        if (careerText.includes(position)) {
          matchCount++;
        }
      }

      let positionScore = 40;
      if (matchCount >= 2) positionScore = 100;
      else if (matchCount === 1) positionScore = 80;

      score += positionScore * 0.5;
      totalWeight += 0.5;
    }

    // 2. 目标行业匹配 (权重: 30)
    const targetIndustries = this.findPreference(preferences, '目标行业')?.value || [];

    if (major.careerFields && targetIndustries.length > 0) {
      let matchCount = 0;
      for (const industry of targetIndustries) {
        if (major.careerFields.some(field => field.includes(industry) || industry.includes(field))) {
          matchCount++;
        }
      }

      let industryScore = 40;
      if (matchCount >= 2) industryScore = 100;
      else if (matchCount === 1) industryScore = 75;

      score += industryScore * 0.3;
      totalWeight += 0.3;
    }

    // 3. 技能匹配 (权重: 20)
    const userSkills = this.findPreference(preferences, '擅长技能')?.value || [];

    if (major.skills && userSkills.length > 0) {
      let matchCount = 0;
      for (const skill of userSkills) {
        if (major.skills.some(s => s.includes(skill) || skill.includes(s))) {
          matchCount++;
        }
      }

      let skillScore = 50;
      if (matchCount >= 2) skillScore = 100;
      else if (matchCount === 1) skillScore = 75;

      score += skillScore * 0.2;
      totalWeight += 0.2;
    }

    return totalWeight > 0 ? Math.min(score / totalWeight, 100) : 70;
  }

  /**
   * 查找偏好指标（辅助方法）
   */
  private findPreference(preferences: AgentPreference[], indicatorIdOrName: string): AgentPreference | undefined {
    return preferences.find(p =>
      p.indicatorId === indicatorIdOrName ||
      p.indicatorName === indicatorIdOrName ||
      p.indicatorName.includes(indicatorIdOrName)
    );
  }

  /**
   * 分析录取概率
   */
  private analyzeAdmissionProbability(admissionScores: any[], userScore: number): any {
    if (admissionScores.length === 0) {
      return {
        probability: 'unknown',
        historicalMinScore: 0,
        historicalAvgScore: 0,
        scoreDifference: 0,
        years: 0,
        trend: 'unknown'
      };
    }

    const minScore = Math.min(...admissionScores.map(s => s.minScore || 0));
    const avgScore =
      admissionScores.reduce((sum, s) => sum + (s.minScore || 0), 0) /
      admissionScores.length;

    const scoreDiff = userScore - minScore;

    let probability = 'low';
    if (scoreDiff > 30) probability = 'high';
    else if (scoreDiff > 10) probability = 'medium';

    return {
      probability,
      historicalMinScore: minScore,
      historicalAvgScore: avgScore,
      scoreDifference: scoreDiff,
      years: admissionScores.length,
      trend: 'stable'
    };
  }

  /**
   * 确定分数类别
   */
  private determineScoreCategory(
    userScore: number,
    historicalScore: number
  ): 'bold' | 'moderate' | 'stable' {
    const diff = userScore - historicalScore;
    if (diff < -10) return 'bold';
    if (diff > 20) return 'stable';
    return 'moderate';
  }

  /**
   * 生成推荐理由
   */
  private generateMatchingReasons(
    college: any,
    major: Major | null,
    scores: Record<string, number>,
    weights: Record<string, number>
  ): string[] {
    const reasons: string[] = [];

    if (scores.embeddingMatchScore > 80) {
      reasons.push('该专业与您的兴趣和职业规划高度匹配');
    }

    if (college.is985 || college.is211) {
      reasons.push(`${college.is985 ? '985' : '211'}重点大学，学校实力强`);
    }

    if (major && major.employmentRate && major.employmentRate > 90) {
      reasons.push(`就业率${major.employmentRate}%，就业前景好`);
    }

    return reasons;
  }

  /**
   * 选择最终推荐
   */
  private selectFinalRecommendations(
    candidates: EnhancedRecommendation[],
    userScore: number,
    count: number
  ): EnhancedRecommendation[] {
    // 先按总分排序
    const sorted = candidates.sort((a, b) => b.totalScore - a.totalScore);

    // 统计各类别数量
    const boldCount = sorted.filter(c => c.scoreCategory === 'bold').length;
    const moderateCount = sorted.filter(c => c.scoreCategory === 'moderate').length;
    const stableCount = sorted.filter(c => c.scoreCategory === 'stable').length;

    console.log(`[冲稳保分布] 冲=${boldCount}, 稳=${moderateCount}, 保=${stableCount}`);

    // 计算目标比例 (冲:稳:保 = 1:1:1)
    const targetBold = Math.floor(count / 3);
    const targetModerate = Math.floor(count / 3);
    const targetStable = count - targetBold - targetModerate;

    console.log(`[目标分布] 冲=${targetBold}, 稳=${targetModerate}, 保=${targetStable}`);

    // 如果某一类不足，从总分较高的其他类别补充
    let bold = sorted.filter(c => c.scoreCategory === 'bold').slice(0, targetBold);
    let moderate = sorted.filter(c => c.scoreCategory === 'moderate').slice(0, targetModerate);
    let stable = sorted.filter(c => c.scoreCategory === 'stable').slice(0, targetStable);

    // 补足不足的数量（从已排序的列表中按总分选择）
    const selected = new Set([...bold, ...moderate, ...stable].map(r => r.collegeId + r.majorGroupCode));
    const remaining = sorted.filter(r => !selected.has(r.collegeId + r.majorGroupCode));

    const currentCount = bold.length + moderate.length + stable.length;
    if (currentCount < count && remaining.length > 0) {
      const needed = count - currentCount;
      const fillerItems = remaining.slice(0, needed);
      console.log(`[补充] 从剩余候选中补充 ${fillerItems.length} 个推荐`);

      // 根据补充项的分类添加到对应数组
      for (const item of fillerItems) {
        if (item.scoreCategory === 'bold') bold.push(item);
        else if (item.scoreCategory === 'moderate') moderate.push(item);
        else stable.push(item);
      }
    }

    // 组合并重新排序（按分类顺序：冲-稳-保）
    const final = [...bold, ...moderate, ...stable].slice(0, count);

    console.log(`[最终分布] 冲=${bold.length}, 稳=${moderate.length}, 保=${stable.length}, 总计=${final.length}`);

    // 添加排名
    return final.map((item, index) => ({
      ...item,
      rank: index + 1
    })) as any;
  }

  /**
   * 提取决策权重
   */
  private extractDecisionWeights(preferences: AgentPreference[]): Record<string, number> {
    const defaultWeights = { college: 33, major: 34, city: 33 };

    const core01 = preferences.find(p => p.indicatorId === 'CORE_01');
    if (core01 && core01.value) {
      return { ...defaultWeights, ...core01.value };
    }

    return defaultWeights;
  }

  /**
   * 提取目标专业关键词
   * 从偏好和对话上下文中提取用户想要的专业方向
   */
  private extractTargetMajorKeywords(preferences: AgentPreference[]): string[] {
    const keywords: string[] = [];

    // 0. **优先从临时专业意向提取（对话分析结果）**
    const tempIntent = preferences.find(p => p.indicatorId === 'TEMP_MAJOR_INTENT');
    if (tempIntent && Array.isArray(tempIntent.value)) {
      keywords.push(...tempIntent.value);
      console.log(`🎯 [关键词提取] 使用对话分析结果: ${tempIntent.value.join(', ')}`);
    }

    // 1. 从 CORE_10 (具体专业意向) 提取
    const core10 = preferences.find(p => p.indicatorId === 'CORE_10');
    if (core10 && core10.value) {
      if (Array.isArray(core10.value)) {
        // 如果是数组，逐个检查是否是专业名称
        for (const item of core10.value) {
          if (typeof item === 'string' && this.isMajorKeyword(item)) {
            keywords.push(item);
          }
        }
      } else if (typeof core10.value === 'string' && this.isMajorKeyword(core10.value)) {
        keywords.push(core10.value);
      }
    }

    // 2. 从 CORE_09 (专业大类偏好) 提取
    const core09Prefs = preferences.filter(p => p.indicatorId === 'CORE_09');
    for (const pref of core09Prefs) {
      if (typeof pref.value === 'string' && this.isMajorKeyword(pref.value)) {
        keywords.push(pref.value);
      }
    }

    // 3. 从其他包含"专业"的偏好中提取
    const majorRelatedPrefs = preferences.filter(p =>
      p.indicatorName && p.indicatorName.includes('专业')
    );
    for (const pref of majorRelatedPrefs) {
      if (typeof pref.value === 'string' && this.isMajorKeyword(pref.value)) {
        keywords.push(pref.value);
      } else if (Array.isArray(pref.value)) {
        for (const item of pref.value) {
          if (typeof item === 'string' && this.isMajorKeyword(item)) {
            keywords.push(item);
          }
        }
      }
    }

    // 去重
    const uniqueKeywords = [...new Set(keywords)];

    if (uniqueKeywords.length === 0) {
      console.log('ℹ️  [关键词提取] 未找到专业偏好关键词，将推荐所有专业');
    }

    return uniqueKeywords;
  }

  /**
   * 判断是否是专业关键词（而不是城市、院校等）
   */
  private isMajorKeyword(keyword: string): boolean {
    // 城市列表（排除这些）
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '武汉', '西安',
                    '重庆', '天津', '青岛', '济南', '郑州', '合肥', '福州', '厦门', '南昌', '长沙',
                    '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东'];

    if (cities.some(city => keyword.includes(city))) {
      return false;
    }

    // 非专业关键词
    const nonMajorKeywords = ['高', '中', '低', '国内', '国外', '读研', '就业', '稳定'];
    if (nonMajorKeywords.includes(keyword)) {
      return false;
    }

    // 专业相关关键词（包含这些认为是专业）
    const majorKeywords = ['计算机', '软件', '电子', '信息', '通信', '自动化', '机械', '电气',
                          '土木', '建筑', '化学', '生物', '医学', '临床', '护理', '药学',
                          '经济', '金融', '会计', '管理', '法学', '新闻', '传播', '外语',
                          '数学', '物理', '化工', '材料', '环境', '食品', '农学', '园林',
                          '工程', '技术', '科学', '数据', '人工智能', '网络', '安全'];

    return majorKeywords.some(mk => keyword.includes(mk));
  }

  /**
   * 生成偏好哈希
   */
  private generatePreferencesHash(preferences: AgentPreference[]): string {
    return preferenceEmbeddingService['generatePreferencesHash'](preferences);
  }

  /**
   * 降级到传统推荐
   */
  private async fallbackToTraditionalRecommendation(
    preferences: AgentPreference[],
    userInfo: any
  ): Promise<any[]> {
    console.log('使用传统推荐算法...');
    // 使用现有的推荐引擎
    const userPrefs = this.convertPreferencesToTraditionalFormat(preferences, userInfo);
    return await this.traditionalEngine.generateRecommendations(userPrefs, 40);
  }

  /**
   * 转换偏好格式（用于传统推荐）
   */
  private convertPreferencesToTraditionalFormat(
    preferences: AgentPreference[],
    userInfo: any
  ): any {
    const weights = this.extractDecisionWeights(preferences);

    return {
      decisionWeights: {
        college: weights.college,
        major: weights.major,
        city: weights.city,
        employment: 50,
        furtherStudy: 50,
        interest: 50,
        prospect: 50
      },
      province: userInfo.province,
      examScore: userInfo.examScore,
      scoreRank: userInfo.scoreRank,
      subjectType: userInfo.subjectType,
      preferences
    };
  }

  /**
   * 查询历年分数 - 使用模糊匹配策略
   *
   * 匹配策略（按优先级）：
   * 1. 精确匹配：院校名称 + 专业组代码 + 省份 + 科类
   * 2. 模糊匹配1：院校名称（模糊）+ 专业名称（模糊）+ 省份 + 科类
   * 3. 模糊匹配2：院校名称（模糊）+ 专业组名称（模糊）+ 省份 + 科类
   * 4. 兜底匹配：院校名称（模糊）+ 省份 + 科类
   */
  private async findHistoricalScores(
    collegeName: string,
    majorName?: string,
    majorGroupName?: string,
    majorGroupCode?: string,
    sourceProvince?: string,
    subjectType?: string
  ): Promise<AdmissionScore[]> {
    const admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

    console.log(`\n🔍 [历年分数查询] 开始查询:`);
    console.log(`  - 院校: ${collegeName}`);
    console.log(`  - 专业: ${majorName || '未知'}`);
    console.log(`  - 专业组: ${majorGroupName || '未知'} (${majorGroupCode || '无代码'})`);
    console.log(`  - 生源地: ${sourceProvince}`);
    console.log(`  - 科类: ${subjectType}`);

    let scores: AdmissionScore[] = [];

    // 策略1: 精确匹配（院校名称 + 专业组代码）
    if (majorGroupCode && sourceProvince && subjectType) {
      scores = await admissionScoreRepo
        .createQueryBuilder('score')
        .where('score.college_name = :collegeName', { collegeName })
        .andWhere('score.major_group = :majorGroup', { majorGroup: majorGroupCode })
        .andWhere('score.source_province = :sourceProvince', { sourceProvince })
        .andWhere('score.subject_type = :subjectType', { subjectType })
        .orderBy('score.year', 'DESC')
        .limit(3)
        .getMany();

      if (scores.length > 0) {
        console.log(`  ✅ 策略1成功: 找到 ${scores.length} 条记录（精确匹配专业组代码）`);
        return scores;
      }
    }

    // 策略2: 模糊匹配专业名称
    if (majorName && sourceProvince && subjectType) {
      // 清理专业名称（去除括号内容）
      const cleanMajorName = majorName.replace(/[（(].*?[)）]/g, '').trim();

      scores = await admissionScoreRepo
        .createQueryBuilder('score')
        .where('score.college_name LIKE :collegeName', { collegeName: `%${collegeName}%` })
        .andWhere('score.major_name LIKE :majorName', { majorName: `%${cleanMajorName}%` })
        .andWhere('score.source_province = :sourceProvince', { sourceProvince })
        .andWhere('score.subject_type = :subjectType', { subjectType })
        .orderBy('score.year', 'DESC')
        .limit(3)
        .getMany();

      if (scores.length > 0) {
        console.log(`  ✅ 策略2成功: 找到 ${scores.length} 条记录（模糊匹配专业名称）`);
        return scores;
      }
    }

    // 策略3: 模糊匹配专业组名称
    if (majorGroupName && sourceProvince && subjectType) {
      const cleanMajorGroupName = majorGroupName.replace(/[（(].*?[)）]/g, '').trim();

      scores = await admissionScoreRepo
        .createQueryBuilder('score')
        .where('score.college_name LIKE :collegeName', { collegeName: `%${collegeName}%` })
        .andWhere('score.major_group LIKE :majorGroup', { majorGroup: `%${cleanMajorGroupName}%` })
        .andWhere('score.source_province = :sourceProvince', { sourceProvince })
        .andWhere('score.subject_type = :subjectType', { subjectType })
        .orderBy('score.year', 'DESC')
        .limit(3)
        .getMany();

      if (scores.length > 0) {
        console.log(`  ✅ 策略3成功: 找到 ${scores.length} 条记录（模糊匹配专业组名称）`);
        return scores;
      }
    }

    // 策略4: 兜底匹配（只匹配院校 + 省份 + 科类）
    if (sourceProvince && subjectType) {
      scores = await admissionScoreRepo
        .createQueryBuilder('score')
        .where('score.college_name LIKE :collegeName', { collegeName: `%${collegeName}%` })
        .andWhere('score.source_province = :sourceProvince', { sourceProvince })
        .andWhere('score.subject_type = :subjectType', { subjectType })
        .orderBy('score.year', 'DESC')
        .limit(3)
        .getMany();

      if (scores.length > 0) {
        console.log(`  ⚠️ 策略4成功: 找到 ${scores.length} 条记录（仅匹配院校，未匹配专业）`);
        return scores;
      }
    }

    console.log(`  ❌ 所有策略均失败: 未找到历年分数数据`);
    return [];
  }
}

export default new EmbeddingEnhancedRecommendationService();
