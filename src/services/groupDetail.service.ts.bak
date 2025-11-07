import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { College } from '../models/College';
import {
  StructuredGroupRecommendation,
  YearlyAdmissionData,
  MajorInfo
} from '../types/structuredRecommendation';
import { AdmissionProbabilityService } from './admissionProbability.service';

/**
 * 专业组详情服务
 *
 * 提供专业组的详细信息查询
 */
export class GroupDetailService {
  private enrollmentPlanRepo: Repository<EnrollmentPlan>;
  private admissionScoreRepo: Repository<AdmissionScore>;
  private collegeRepo: Repository<College>;
  private probabilityService = new AdmissionProbabilityService();

  constructor() {
    this.enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
    this.admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);
    this.collegeRepo = AppDataSource.getRepository(College);
  }

  /**
   * 获取专业组详细信息
   */
  async getGroupDetail(
    groupId: string,
    userProfile?: { score: number; rank: number }
  ): Promise<StructuredGroupRecommendation> {
    // 解析 groupId (格式: collegeCode_groupCode)
    const [collegeCode, groupCode] = groupId.split('_');

    if (!collegeCode || !groupCode) {
      throw new Error('无效的专业组ID格式，应为: collegeCode_groupCode');
    }

    // 1. 查询专业组基本信息和专业列表
    const enrollmentPlans = await this.enrollmentPlanRepo
      .createQueryBuilder('ep')
      .where('ep.college_code = :collegeCode', { collegeCode })
      .andWhere('ep.major_group_code = :groupCode', { groupCode })
      .getMany();

    if (enrollmentPlans.length === 0) {
      throw new Error(`未找到专业组: ${groupId}`);
    }

    const firstPlan = enrollmentPlans[0];
    const collegeName = firstPlan.collegeName;
    const groupName = firstPlan.majorGroupName || '未知专业组';

    // 2. 查询院校详细信息
    const college = await this.collegeRepo.findOne({
      where: { code: collegeCode }
    });

    // 3. 查询历年录取数据
    const historicalScores = await this.admissionScoreRepo
      .createQueryBuilder('as')
      .where('as.college_code = :collegeCode', { collegeCode })
      .andWhere('as.group_code = :groupCode', { groupCode })
      .andWhere('as.year <= :maxYear', { maxYear: 2024 })
      .orderBy('as.year', 'DESC')
      .getMany();

    // 如果按 group_code 查不到，尝试用 group_name
    let finalHistoricalScores = historicalScores;
    if (historicalScores.length === 0 && groupName) {
      finalHistoricalScores = await this.admissionScoreRepo
        .createQueryBuilder('as')
        .where('as.college_name = :collegeName', { collegeName })
        .andWhere('as.group_name LIKE :groupName', { groupName: `%${groupName}%` })
        .andWhere('as.year <= :maxYear', { maxYear: 2024 })
        .orderBy('as.year', 'DESC')
        .getMany();
    }

    // 4. 转换专业信息
    const majors: MajorInfo[] = enrollmentPlans.map(plan => ({
      majorId: plan.majorCode || '',
      majorName: plan.majorName || '未知专业',
      majorCode: plan.majorCode,
      planCount: plan.planCount || 0,
      tuition: plan.tuition ? Number(plan.tuition) : undefined,
      duration: plan.studyYears ? `${plan.studyYears}年` : undefined,
      degree: undefined, // EnrollmentPlan 中没有此字段
      studyLocation: undefined, // EnrollmentPlan 中没有此字段
      remarks: plan.majorRemarks
    }));

    // 5. 转换历年数据
    const historicalData: YearlyAdmissionData[] = finalHistoricalScores.map(score => ({
      year: score.year,
      minScore: score.minScore || 0,
      avgScore: score.avgScore || undefined,
      maxScore: score.maxScore || undefined,
      minRank: score.minRank || 0,
      maxRank: score.maxRank || undefined,
      planCount: score.planCount || 0,
      actualAdmitted: undefined
    }));

    // 6. 计算统计信息
    const totalMajors = majors.length;
    const totalPlanCount = majors.reduce((sum, m) => sum + m.planCount, 0);

    const avgMinScore = historicalData.length > 0
      ? Math.round(historicalData.reduce((sum, h) => sum + h.minScore, 0) / historicalData.length)
      : 0;

    const avgMinRank = historicalData.length > 0
      ? Math.round(historicalData.reduce((sum, h) => sum + h.minRank, 0) / historicalData.length)
      : 0;

    // 7. 如果提供了用户信息，计算录取概率
    let probability = 0;
    let riskLevel: '冲' | '稳' | '保' = '稳';
    let confidence = 0;
    let adjustmentRisk: '高' | '中' | '低' = '中';
    let scoreGap = 0;
    let rankGap: number | null = null;
    let recommendReasons: string[] = [];
    let warnings: string[] = [];
    let highlights: string[] = [];

    if (userProfile && historicalData.length > 0) {
      const probResult = this.probabilityService.calculateForGroup(
        userProfile.score,
        userProfile.rank,
        historicalData,
        {
          scoreVolatility: this.calculateScoreVolatility(historicalData),
          popularityIndex: undefined
        }
      );

      probability = probResult.probability;
      riskLevel = probResult.riskLevel;
      confidence = probResult.confidence;
      adjustmentRisk = probResult.adjustmentRisk;
      scoreGap = probResult.scoreGap;
      rankGap = probResult.rankGap;

      // 生成推荐理由
      recommendReasons = this.probabilityService.generateRecommendReason(
        probResult,
        groupName,
        collegeName,
        {
          is985: college?.is985 || false,
          is211: college?.is211 || false
        }
      );

      // 生成警告和亮点
      warnings = this.generateWarnings(probResult, college);
      highlights = this.generateHighlights(college, totalPlanCount);
    }

    // 8. 分析趋势
    const scoreTrend = this.analyzeScoreTrend(historicalData);

    // 9. 构建返回结果
    const result: StructuredGroupRecommendation = {
      groupId,
      collegeName,
      collegeCode,
      collegeProvince: college?.province,
      groupName,
      groupCode,

      is985: college?.is985 || false,
      is211: college?.is211 || false,
      isDoubleFirstClass: college?.isWorldClass || false,
      collegeType: college?.type,
      collegeLevel: undefined, // College 模型中没有此字段

      riskLevel,
      probability,
      confidence,
      adjustmentRisk,

      scoreGap,
      rankGap,
      userScore: userProfile?.score || 0,
      userRank: userProfile?.rank || 0,
      avgMinScore,
      avgMinRank,

      historicalData,
      scoreVolatility: this.calculateScoreVolatility(historicalData),
      scoreTrend,

      majors,
      totalMajors,
      totalPlanCount,

      recommendReasons,
      warnings,
      highlights,

      rankScore: 0
    };

    return result;
  }

  /**
   * 批量获取专业组详情
   */
  async getGroupsDetail(
    groupIds: string[],
    userProfile?: { score: number; rank: number }
  ): Promise<StructuredGroupRecommendation[]> {
    const results: StructuredGroupRecommendation[] = [];

    for (const groupId of groupIds) {
      try {
        const detail = await this.getGroupDetail(groupId, userProfile);
        results.push(detail);
      } catch (error: any) {
        console.error(`获取专业组详情失败 [${groupId}]:`, error.message);
        // 跳过失败的项，继续处理
      }
    }

    return results;
  }

  /**
   * 计算分数波动性
   */
  private calculateScoreVolatility(historicalData: YearlyAdmissionData[]): number {
    if (historicalData.length < 2) return 0;

    const scores = historicalData.map(h => h.minScore);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;

    return Math.round(Math.sqrt(variance) * 10) / 10; // 保留1位小数
  }

  /**
   * 分析分数趋势
   */
  private analyzeScoreTrend(historicalData: YearlyAdmissionData[]): 'up' | 'down' | 'stable' {
    if (historicalData.length < 2) return 'stable';

    const sortedData = [...historicalData].sort((a, b) => a.year - b.year);
    const recentData = sortedData.slice(-3);

    if (recentData.length < 2) return 'stable';

    let upCount = 0;
    let downCount = 0;

    for (let i = 1; i < recentData.length; i++) {
      const diff = recentData[i].minScore - recentData[i - 1].minScore;
      if (diff > 3) upCount++;
      else if (diff < -3) downCount++;
    }

    if (upCount > downCount) return 'up';
    if (downCount > upCount) return 'down';
    return 'stable';
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(probResult: any, college: College | null): string[] {
    const warnings: string[] = [];

    if (probResult.confidence < 60) {
      warnings.push('⚠️ 历史数据波动较大或样本不足，预测置信度较低');
    }

    if (probResult.adjustmentRisk === '高') {
      warnings.push('⚠️ 调剂风险较高，建议谨慎选择专业顺序');
    }

    if (probResult.riskLevel === '冲' && probResult.probability < 15) {
      warnings.push('⚠️ 录取概率较低，作为冲刺目标需做好心理预期');
    }

    if (probResult.filtered) {
      warnings.push(`⚠️ ${probResult.filterReason}`);
    }

    return warnings;
  }

  /**
   * 生成亮点标签
   */
  private generateHighlights(college: College | null, totalPlanCount: number): string[] {
    const highlights: string[] = [];

    if (college?.is985) {
      highlights.push('🏆 985工程');
    } else if (college?.is211) {
      highlights.push('🏅 211工程');
    }

    if (college?.isDoubleFirstClass) {
      highlights.push('⭐ 双一流');
    }

    if (totalPlanCount >= 50) {
      highlights.push('📊 招生规模大');
    }

    return highlights;
  }
}
