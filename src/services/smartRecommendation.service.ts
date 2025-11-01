import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { ScoreRanking } from '../models/ScoreRanking';
import { AdmissionProbabilityService, GroupHistoricalData } from './admissionProbability.service';
import {
  GroupRecommendation,
  SmartRecommendationResult,
  UserPreferences,
  MajorInfo,
  RankingWeights
} from '../interfaces/recommendation.interface';

/**
 * 智能推荐服务
 *
 * 核心功能：
 * 1. 根据用户分数、位次和偏好，查询所有符合条件的专业组
 * 2. 为每个专业组实时计算录取概率
 * 3. 按冲稳保分类
 * 4. 每个类别内部智能排序
 * 5. 返回Top 40个专业组推荐
 */
export class SmartRecommendationService {
  private enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
  private admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);
  private scoreRankingRepo = AppDataSource.getRepository(ScoreRanking);
  private probabilityService = new AdmissionProbabilityService();

  /**
   * 核心方法：获取智能推荐
   */
  async getSmartRecommendations(
    userProfile: {
      score: number;
      rank: number;
      province: string;
      category: string;
      year: number;
    },
    preferences: UserPreferences = {}
  ): Promise<SmartRecommendationResult> {

    // 第一步：查询所有符合条件的专业组（带历史数据）
    const groupsWithHistory = await this.queryGroupsWithHistory(userProfile, preferences);

    console.log(`[SmartRecommendation] 查询到 ${groupsWithHistory.length} 个符合条件的专业组`);

    // 第二步：为每个专业组计算录取概率
    const groupsWithProbability = groupsWithHistory.map(group => {
      const probResult = this.probabilityService.calculateForGroup(
        userProfile.score,
        userProfile.rank,
        group.historicalData,
        {
          scoreVolatility: group.scoreVolatility,
          popularityIndex: group.popularityIndex
        }
      );

      // 生成推荐理由
      const recommendReasons = this.probabilityService.generateRecommendReason(
        probResult,
        group.groupName || '',
        group.collegeName,
        { is985: group.is985, is211: group.is211 }
      );

      return {
        ...group,
        probability: probResult.probability,
        riskLevel: probResult.riskLevel,
        adjustmentRisk: probResult.adjustmentRisk,
        confidence: probResult.confidence,
        scoreGap: probResult.scoreGap,
        rankGap: probResult.rankGap,
        recommendReasons,
        filtered: probResult.filtered,
        filterReason: probResult.filterReason
      };
    });

    // 过滤掉不合理的推荐
    const validGroups = groupsWithProbability.filter(g => !g.filtered);
    const filteredCount = groupsWithProbability.length - validGroups.length;

    if (filteredCount > 0) {
      console.log(`[SmartRecommendation] 已过滤 ${filteredCount} 个不合理的推荐`);
    }

    console.log(`[SmartRecommendation] 计算完成，有效专业组 ${validGroups.length} 个，开始分类`);

    // 第三步：按冲稳保分类
    const rush = validGroups.filter(g => g.riskLevel === '冲');
    const stable = validGroups.filter(g => g.riskLevel === '稳');
    const safe = validGroups.filter(g => g.riskLevel === '保');

    console.log(`[SmartRecommendation] 分类结果: 冲=${rush.length}, 稳=${stable.length}, 保=${safe.length}`);

    // 第四步：每个类别内部排序
    const rushCount = preferences.rushCount || 12;
    const stableCount = preferences.stableCount || 20;
    const safeCount = preferences.safeCount || 8;

    const rankedRush = this.rankGroups(rush, 'rush', preferences).slice(0, rushCount);
    const rankedStable = this.rankGroups(stable, 'stable', preferences).slice(0, stableCount);
    const rankedSafe = this.rankGroups(safe, 'safe', preferences).slice(0, safeCount);

    // 第五步：计算统计信息
    const summary = this.calculateSummary(rankedRush, rankedStable, rankedSafe);

    return {
      rush: rankedRush,
      stable: rankedStable,
      safe: rankedSafe,
      summary,
      userProfile,
      appliedPreferences: preferences
    };
  }

  /**
   * 查询所有符合条件的专业组（带历史数据）
   */
  private async queryGroupsWithHistory(
    userProfile: {
      score: number;
      rank: number;
      province: string;
      category: string;
      year: number;
    },
    preferences: UserPreferences
  ): Promise<Array<GroupRecommendation & { historicalData: GroupHistoricalData[]; scoreVolatility?: number; popularityIndex?: number }>> {

    // 构建查询
    let queryBuilder = this.enrollmentPlanRepo
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year: userProfile.year })
      .andWhere('ep.sourceProvince = :province', { province: userProfile.province })
      .andWhere('ep.subjectType = :category', { category: userProfile.category });

    // 应用专业偏好筛选
    if (preferences.majors && preferences.majors.length > 0) {
      const majorConditions = preferences.majors.map((_, idx) => `ep.majorName LIKE :major${idx}`).join(' OR ');
      queryBuilder.andWhere(`(${majorConditions})`);
      preferences.majors.forEach((major, idx) => {
        queryBuilder.setParameter(`major${idx}`, `%${major}%`);
      });
    }

    // 应用专业大类筛选
    if (preferences.majorCategories && preferences.majorCategories.length > 0) {
      const categoryConditions = preferences.majorCategories.map((_, idx) => `ep.majorName LIKE :category${idx}`).join(' OR ');
      queryBuilder.andWhere(`(${categoryConditions})`);
      preferences.majorCategories.forEach((category, idx) => {
        queryBuilder.setParameter(`category${idx}`, `%${category}%`);
      });
    }

    // 应用地区筛选
    if (preferences.locations && preferences.locations.length > 0) {
      queryBuilder.andWhere('ep.collegeProvince IN (:...locations)', { locations: preferences.locations });
    }

    // 排除地区
    if (preferences.excludeLocations && preferences.excludeLocations.length > 0) {
      queryBuilder.andWhere('ep.collegeProvince NOT IN (:...excludeLocations)', { excludeLocations: preferences.excludeLocations });
    }

    // 应用院校类型筛选
    if (preferences.collegeTypes && preferences.collegeTypes.length > 0) {
      const typeConditions: string[] = [];
      if (preferences.collegeTypes.includes('985')) {
        typeConditions.push('ep.collegeIs985 = true');
      }
      if (preferences.collegeTypes.includes('211')) {
        typeConditions.push('ep.collegeIs211 = true');
      }
      if (preferences.collegeTypes.includes('双一流')) {
        typeConditions.push('ep.collegeIsWorldClass = true');
      }
      if (typeConditions.length > 0) {
        queryBuilder.andWhere(`(${typeConditions.join(' OR ')})`);
      }
    }

    // 应用学费筛选
    if (preferences.maxTuition) {
      queryBuilder.andWhere('(ep.tuition IS NULL OR ep.tuition <= :maxTuition)', { maxTuition: preferences.maxTuition });
    }

    // 排除中外合作办学（如果用户不接受）
    if (preferences.acceptCooperation === false) {
      queryBuilder.andWhere("(ep.majorGroupName NOT LIKE '%中外合作%' AND ep.majorGroupName NOT LIKE '%合作办学%')");
    }

    const enrollmentPlans = await queryBuilder.getMany();

    console.log(`[SmartRecommendation] 查询到 ${enrollmentPlans.length} 条招生计划`);

    // 按专业组聚合
    const groupMap = new Map<string, {
      collegeCode: string;
      collegeName: string;
      collegeProvince?: string;
      collegeCity?: string;
      is985: boolean;
      is211: boolean;
      isDoubleFirstClass: boolean;
      groupCode: string;
      groupName?: string;
      subjectRequirements?: string;
      majors: MajorInfo[];
    }>();

    for (const plan of enrollmentPlans) {
      const groupKey = `${plan.collegeCode}_${plan.majorGroupCode || 'default'}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          collegeCode: plan.collegeCode,
          collegeName: plan.collegeName,
          collegeProvince: plan.collegeProvince,
          collegeCity: plan.collegeCity,
          is985: plan.collegeIs985,
          is211: plan.collegeIs211,
          isDoubleFirstClass: plan.collegeIsWorldClass,
          groupCode: plan.majorGroupCode || '',
          groupName: plan.majorGroupName,
          subjectRequirements: plan.subjectRequirements,
          majors: []
        });
      }

      const group = groupMap.get(groupKey)!;
      group.majors.push({
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        planCount: plan.planCount,
        tuition: plan.tuition ? Number(plan.tuition) : undefined,
        studyYears: plan.studyYears,
        remarks: plan.majorRemarks
      });
    }

    console.log(`[SmartRecommendation] 聚合后共 ${groupMap.size} 个专业组`);

    // 为每个专业组查询历史数据
    const groupsWithHistory: Array<GroupRecommendation & { historicalData: GroupHistoricalData[]; scoreVolatility?: number; popularityIndex?: number }> = [];

    for (const [_, group] of groupMap) {
      // 查询该专业组近3年的历史数据
      // 尝试多种匹配策略以提高匹配成功率
      let historicalData = await this.admissionScoreRepo
        .createQueryBuilder('as')
        .where('as.collegeCode = :collegeCode', { collegeCode: group.collegeCode })
        .andWhere('as.groupCode = :groupCode', { groupCode: group.groupCode })
        .andWhere('as.sourceProvince = :province', { province: userProfile.province })
        .andWhere('as.subjectType = :category', { category: userProfile.category })
        .andWhere('as.year <= :maxYear', { maxYear: 2024 })  // 修改：使用 <= 2024
        .orderBy('as.year', 'DESC')
        .limit(3)
        .getMany();

      // 如果精确匹配失败，尝试模糊匹配 groupName
      if (historicalData.length === 0 && group.groupName) {
        historicalData = await this.admissionScoreRepo
          .createQueryBuilder('as')
          .where('as.collegeCode = :collegeCode', { collegeCode: group.collegeCode })
          .andWhere('as.groupName LIKE :groupName', { groupName: `%${group.groupName}%` })
          .andWhere('as.sourceProvince = :province', { province: userProfile.province })
          .andWhere('as.subjectType = :category', { category: userProfile.category })
          .andWhere('as.year <= :maxYear', { maxYear: 2024 })
          .orderBy('as.year', 'DESC')
          .limit(3)
          .getMany();
      }

      // 如果还是没有数据，尝试通过院校名称匹配（获取该院校的所有历史数据）
      if (historicalData.length === 0) {
        historicalData = await this.admissionScoreRepo
          .createQueryBuilder('as')
          .where('as.collegeName = :collegeName', { collegeName: group.collegeName })
          .andWhere('as.sourceProvince = :province', { province: userProfile.province })
          .andWhere('as.subjectType = :category', { category: userProfile.category })
          .andWhere('as.year <= :maxYear', { maxYear: 2024 })
          .orderBy('as.year', 'DESC')
          .limit(3)
          .getMany();
      }

      if (historicalData.length === 0) {
        // 跳过没有历史数据的专业组（可能是新增专业组）
        console.log(`[SmartRecommendation] 跳过无历史数据的专业组: ${group.collegeName} ${group.groupName} (college_code: ${group.collegeCode}, group_code: ${group.groupCode})`);
        continue;
      }

      console.log(`[SmartRecommendation] 找到历史数据: ${group.collegeName} ${group.groupName} - ${historicalData.length} 条记录`);

      // 转换为标准格式
      const history: GroupHistoricalData[] = historicalData.map(h => ({
        year: h.year,
        minScore: h.minScore || 0,
        avgScore: h.avgScore,
        maxScore: h.maxScore,
        minRank: h.minRank || 0,
        maxRank: h.maxRank,
        planCount: h.planCount || 0
      }));

      // 计算专业总数和总计划数
      const totalMajors = group.majors.length;
      const totalPlanCount = group.majors.reduce((sum, m) => sum + m.planCount, 0);

      groupsWithHistory.push({
        ...group,
        totalMajors,
        totalPlanCount,
        historicalData: history,
        historicalScores: history,
        scoreVolatility: historicalData[0]?.scoreVolatility ? Number(historicalData[0].scoreVolatility) : undefined,
        popularityIndex: historicalData[0]?.popularityIndex,

        // 这些字段会在后续步骤中填充
        probability: 0,
        riskLevel: '稳',
        adjustmentRisk: '中',
        confidence: 0,
        scoreGap: 0,
        rankGap: null,
        recommendReasons: [],
        rankScore: 0
      });
    }

    return groupsWithHistory;
  }

  /**
   * 专业组排序（每个类别内部）
   */
  private rankGroups(
    groups: GroupRecommendation[],
    category: 'rush' | 'stable' | 'safe',
    preferences: UserPreferences,
    weights?: RankingWeights
  ): GroupRecommendation[] {

    // 默认权重
    const w = weights || {
      collegeLevelWeight: 30,
      majorMatchWeight: 25,
      locationWeight: 20,
      employmentWeight: 15,
      probabilityWeight: 10
    };

    for (const group of groups) {
      let score = 0;

      // 1. 院校层级分（权重30）
      if (group.is985) {
        score += w.collegeLevelWeight;
      } else if (group.is211) {
        score += w.collegeLevelWeight * 0.7;
      } else if (group.isDoubleFirstClass) {
        score += w.collegeLevelWeight * 0.5;
      }

      // 2. 专业契合度（权重25）
      let majorMatchScore = 0;
      if (preferences.majors && preferences.majors.length > 0) {
        // 检查是否有专业精确匹配
        const hasExactMatch = group.majors.some(m =>
          preferences.majors!.some(pm => m.majorName.includes(pm) || pm.includes(m.majorName))
        );
        if (hasExactMatch) {
          majorMatchScore = w.majorMatchWeight;
        } else {
          majorMatchScore = w.majorMatchWeight * 0.3;
        }
      } else if (preferences.majorCategories && preferences.majorCategories.length > 0) {
        const hasCategoryMatch = group.majors.some(m =>
          preferences.majorCategories!.some(pc => m.majorName.includes(pc))
        );
        if (hasCategoryMatch) {
          majorMatchScore = w.majorMatchWeight * 0.7;
        }
      } else {
        // 无偏好，给默认分
        majorMatchScore = w.majorMatchWeight * 0.5;
      }
      score += majorMatchScore;

      // 3. 地理位置分（权重20）
      if (preferences.locations && preferences.locations.length > 0) {
        if (group.collegeProvince && preferences.locations.includes(group.collegeProvince)) {
          score += w.locationWeight;
        } else {
          score += w.locationWeight * 0.3;
        }
      } else {
        // 无偏好，给默认分
        score += w.locationWeight * 0.5;
      }

      // 4. 就业数据分（权重15）
      // TODO: 这里可以集成就业数据，当前给默认分
      score += w.employmentWeight * 0.5;

      // 5. 概率适中性（权重10）
      let probabilityScore = 0;
      if (category === 'rush') {
        // 冲区间：概率20-30%最合适
        const idealProb = 25;
        const deviation = Math.abs(group.probability - idealProb);
        probabilityScore = w.probabilityWeight * Math.max(0, 1 - deviation / idealProb);
      } else if (category === 'stable') {
        // 稳区间：概率50-60%最合适
        const idealProb = 55;
        const deviation = Math.abs(group.probability - idealProb);
        probabilityScore = w.probabilityWeight * Math.max(0, 1 - deviation / 30);
      } else {
        // 保区间：概率80-90%最合适
        const idealProb = 85;
        const deviation = Math.abs(group.probability - idealProb);
        probabilityScore = w.probabilityWeight * Math.max(0, 1 - deviation / 15);
      }
      score += probabilityScore;

      // 6. 置信度加成（高置信度更可靠）
      score += (group.confidence / 100) * 5;

      group.rankScore = score;
    }

    // 按分数降序排序
    return groups.sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * 计算统计信息
   */
  private calculateSummary(
    rush: GroupRecommendation[],
    stable: GroupRecommendation[],
    safe: GroupRecommendation[]
  ) {
    const totalCount = rush.length + stable.length + safe.length;

    const avgProbability = {
      rush: rush.length > 0 ? rush.reduce((sum, g) => sum + g.probability, 0) / rush.length : 0,
      stable: stable.length > 0 ? stable.reduce((sum, g) => sum + g.probability, 0) / stable.length : 0,
      safe: safe.length > 0 ? safe.reduce((sum, g) => sum + g.probability, 0) / safe.length : 0
    };

    const all = [...rush, ...stable, ...safe];
    const distribution = {
      total985: all.filter(g => g.is985).length,
      total211: all.filter(g => g.is211).length,
      totalOthers: all.filter(g => !g.is985 && !g.is211).length
    };

    return {
      totalCount,
      rushCount: rush.length,
      stableCount: stable.length,
      safeCount: safe.length,
      avgProbability,
      distribution
    };
  }
}
