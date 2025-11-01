import {
  StructuredGroupRecommendation,
  StructuredRecommendationResult,
  YearlyAdmissionData,
  MajorInfo,
  RecommendationSummary,
  ChartData
} from '../types/structuredRecommendation';
import { GroupRecommendation, SmartRecommendationResult } from '../interfaces/recommendation.interface';

/**
 * 结构化数据转换服务
 *
 * 将内部推荐结果转换为前端友好的结构化格式
 */
export class StructuredDataTransformer {

  /**
   * 转换完整推荐结果
   */
  transformRecommendationResult(
    result: SmartRecommendationResult,
    filteredCount: number = 0
  ): StructuredRecommendationResult {
    return {
      // 用户信息
      userProfile: {
        score: result.userProfile.score,
        rank: result.userProfile.rank,
        province: result.userProfile.province,
        category: result.userProfile.category,
        year: result.userProfile.year || new Date().getFullYear()
      },

      // 筛选偏好
      preferences: {
        majorNames: result.appliedPreferences?.majors,
        collegeProvinces: result.appliedPreferences?.locations,
        collegeTypes: result.appliedPreferences?.collegeTypes,
        is985: result.appliedPreferences?.collegeTypes?.includes('985'),
        is211: result.appliedPreferences?.collegeTypes?.includes('211')
      },

      // 推荐结果
      recommendations: {
        rush: result.rush.map(g => this.transformGroup(g, result.userProfile)),
        stable: result.stable.map(g => this.transformGroup(g, result.userProfile)),
        safe: result.safe.map(g => this.transformGroup(g, result.userProfile))
      },

      // 统计摘要
      summary: this.enhanceSummary(result.summary, result),

      // 元数据
      metadata: {
        timestamp: Date.now(),
        version: '2.0.0',
        algorithm: 'AdmissionProbabilityService v2.0 (冲<35%, 稳35-90%, 保90-99%)',
        dataSource: 'enrollment_plans + admission_scores (实时计算)',
        filteredCount
      }
    };
  }

  /**
   * 转换单个专业组
   */
  private transformGroup(
    group: GroupRecommendation,
    userProfile: { score: number; rank: number }
  ): StructuredGroupRecommendation {
    // 计算平均最低分和位次
    const avgMinScore = group.historicalScores && group.historicalScores.length > 0
      ? group.historicalScores.reduce((sum, h) => sum + h.minScore, 0) / group.historicalScores.length
      : 0;

    const avgMinRank = group.historicalScores && group.historicalScores.length > 0
      ? group.historicalScores.reduce((sum, h) => sum + h.minRank, 0) / group.historicalScores.length
      : 0;

    // 分析分数趋势
    const scoreTrend = this.analyzeScoreTrend(group.historicalScores || []);

    // 生成警告信息
    const warnings = this.generateWarnings(group);

    // 生成亮点标签
    const highlights = this.generateHighlights(group);

    return {
      // 基本信息
      groupId: `${group.collegeCode || ''}_${group.groupCode}`,
      collegeName: group.collegeName,
      collegeCode: group.collegeCode,
      collegeProvince: group.collegeProvince,
      groupName: group.groupName || '未知专业组',
      groupCode: group.groupCode,

      // 院校标签
      is985: group.is985 || false,
      is211: group.is211 || false,
      isDoubleFirstClass: group.isDoubleFirstClass || false,
      collegeType: undefined,  // TODO: 从数据库获取
      collegeLevel: undefined, // TODO: 从数据库获取

      // 冲稳保分类
      riskLevel: group.riskLevel,
      probability: group.probability,
      confidence: group.confidence,
      adjustmentRisk: group.adjustmentRisk,

      // 分数分析
      scoreGap: group.scoreGap,
      rankGap: group.rankGap,
      userScore: userProfile.score,
      userRank: userProfile.rank,
      avgMinScore: Math.round(avgMinScore),
      avgMinRank: Math.round(avgMinRank),

      // 历年数据
      historicalData: this.transformHistoricalData(group.historicalScores || []),
      scoreVolatility: undefined, // TODO: 从历史数据计算
      scoreTrend,

      // 专业信息
      majors: this.transformMajors(group.majors || []),
      totalMajors: group.totalMajors || (group.majors?.length || 0),
      totalPlanCount: group.totalPlanCount || 0,

      // 推荐理由
      recommendReasons: group.recommendReasons || [],
      warnings,
      highlights,

      // 排序权重
      rankScore: group.rankScore || 0
    };
  }

  /**
   * 转换历年数据
   */
  private transformHistoricalData(historicalScores: any[]): YearlyAdmissionData[] {
    return historicalScores.map(h => ({
      year: h.year,
      minScore: h.minScore,
      avgScore: h.avgScore,
      maxScore: h.maxScore,
      minRank: h.minRank,
      maxRank: h.maxRank,
      planCount: h.planCount,
      actualAdmitted: h.actualAdmitted
    })).sort((a, b) => b.year - a.year); // 按年份降序
  }

  /**
   * 转换专业信息
   */
  private transformMajors(majors: any[]): MajorInfo[] {
    return majors.map(m => ({
      majorId: m.majorId || m.id || '',
      majorName: m.majorName || m.name || '未知专业',
      majorCode: m.majorCode || m.code,
      planCount: m.planCount || 0,
      tuition: m.tuition,
      duration: m.duration || m.studyYears,
      degree: m.degree,
      studyLocation: m.studyLocation || m.campusLocation,
      remarks: m.remarks || m.note
    }));
  }

  /**
   * 分析分数趋势
   */
  private analyzeScoreTrend(historicalScores: any[]): 'up' | 'down' | 'stable' {
    if (historicalScores.length < 2) return 'stable';

    const sortedScores = [...historicalScores].sort((a, b) => a.year - b.year);
    const recentScores = sortedScores.slice(-3); // 最近3年

    if (recentScores.length < 2) return 'stable';

    let upCount = 0;
    let downCount = 0;

    for (let i = 1; i < recentScores.length; i++) {
      const diff = recentScores[i].minScore - recentScores[i - 1].minScore;
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
  private generateWarnings(group: GroupRecommendation): string[] {
    const warnings: string[] = [];

    // 低置信度警告
    if (group.confidence < 60) {
      warnings.push('⚠️ 历史数据波动较大或样本不足，预测置信度较低');
    }

    // 高调剂风险
    if (group.adjustmentRisk === '高') {
      warnings.push('⚠️ 调剂风险较高，建议谨慎选择专业顺序');
    }

    // 分数波动警告 (注释掉，因为 GroupRecommendation 中没有这个字段)
    // if (group.scoreVolatility && group.scoreVolatility > 10) {
    //   warnings.push('⚠️ 录取分数波动较大，存在不确定性');
    // }

    // 冲刺警告
    if (group.riskLevel === '冲' && group.probability < 15) {
      warnings.push('⚠️ 录取概率较低，作为冲刺目标需做好心理预期');
    }

    return warnings;
  }

  /**
   * 生成亮点标签
   */
  private generateHighlights(group: GroupRecommendation): string[] {
    const highlights: string[] = [];

    // 院校层级
    if (group.is985) {
      highlights.push('🏆 985工程');
    } else if (group.is211) {
      highlights.push('🏅 211工程');
    }

    if (group.isDoubleFirstClass) {
      highlights.push('⭐ 双一流');
    }

    // 招生规模
    if (group.totalPlanCount && group.totalPlanCount >= 50) {
      highlights.push('📊 招生规模大');
    }

    // 概率优势
    if (group.riskLevel === '稳' && group.probability >= 70) {
      highlights.push('✅ 录取把握大');
    }

    if (group.riskLevel === '保' && group.probability >= 95) {
      highlights.push('🛡️ 保底可靠');
    }

    // 分数优势
    if (group.scoreGap > 5 && group.scoreGap <= 10) {
      highlights.push('💪 分数优势明显');
    }

    return highlights;
  }

  /**
   * 增强统计摘要
   */
  private enhanceSummary(
    summary: any,
    result: SmartRecommendationResult
  ): RecommendationSummary {
    // 计算分数范围
    const allGroups = [...result.rush, ...result.stable, ...result.safe];
    const scores = allGroups
      .map(g => g.historicalScores || [])
      .flat()
      .map(h => h.minScore)
      .filter(s => s > 0);

    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    // 计算概率分布
    const probabilityDistribution = {
      veryLow: allGroups.filter(g => g.probability < 15).length,
      low: allGroups.filter(g => g.probability >= 15 && g.probability < 35).length,
      medium: allGroups.filter(g => g.probability >= 35 && g.probability < 65).length,
      high: allGroups.filter(g => g.probability >= 65 && g.probability < 90).length,
      veryHigh: allGroups.filter(g => g.probability >= 90).length
    };

    return {
      totalCount: summary.totalCount,
      rushCount: summary.rushCount,
      stableCount: summary.stableCount,
      safeCount: summary.safeCount,
      avgProbability: summary.avgProbability,
      distribution: summary.distribution,
      scoreRange: {
        min: minScore,
        max: maxScore,
        userScore: result.userProfile.score
      },
      probabilityDistribution
    };
  }

  /**
   * 生成图表数据
   */
  generateChartData(result: StructuredRecommendationResult): ChartData {
    return {
      // 概率分布饼图
      probabilityPieChart: {
        labels: ['冲一冲', '稳一稳', '保一保'],
        data: [
          result.summary.rushCount,
          result.summary.stableCount,
          result.summary.safeCount
        ],
        colors: ['#FF6384', '#36A2EB', '#4BC0C0']
      },

      // 院校层次分布
      collegeLevelChart: {
        labels: ['985院校', '211院校', '其他院校'],
        data: [
          result.summary.distribution.total985,
          result.summary.distribution.total211,
          result.summary.distribution.totalOthers
        ],
        colors: ['#FFD700', '#C0C0C0', '#87CEEB']
      },

      // 分数趋势图（取前5个稳一稳专业组）
      scoreTrendChart: this.generateScoreTrendChart(result.recommendations.stable.slice(0, 5))
    };
  }

  /**
   * 生成分数趋势图数据
   */
  private generateScoreTrendChart(groups: StructuredGroupRecommendation[]): ChartData['scoreTrendChart'] {
    if (groups.length === 0) {
      return { labels: [], datasets: [] };
    }

    // 获取所有年份（取交集）
    const allYears = groups[0].historicalData.map(h => h.year).sort();

    // 为每个专业组创建数据集
    const datasets = groups.map((group, index) => {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
      return {
        label: `${group.collegeName}-${group.groupName}`,
        data: allYears.map(year => {
          const yearData = group.historicalData.find(h => h.year === year);
          return yearData?.minScore || 0;
        }),
        color: colors[index % colors.length]
      };
    });

    return {
      labels: allYears,
      datasets
    };
  }

  /**
   * 生成导出数据（Excel格式）
   */
  generateExportData(result: StructuredRecommendationResult): any[] {
    const allGroups = [
      ...result.recommendations.rush.map(g => ({ ...g, category: '冲' })),
      ...result.recommendations.stable.map(g => ({ ...g, category: '稳' })),
      ...result.recommendations.safe.map(g => ({ ...g, category: '保' }))
    ];

    return allGroups.map((group, index) => ({
      '序号': index + 1,
      '冲稳保': group.category,
      '院校名称': group.collegeName,
      '专业组名称': group.groupName,
      '专业组代码': group.groupCode,
      '是否985': group.is985 ? '是' : '否',
      '是否211': group.is211 ? '是' : '否',
      '录取概率': `${group.probability}%`,
      '置信度': `${group.confidence}%`,
      '调剂风险': group.adjustmentRisk,
      '分数差': group.scoreGap,
      '位次差': group.rankGap || '无',
      '近3年平均最低分': group.avgMinScore,
      '近3年平均最低位次': group.avgMinRank,
      '专业数量': group.totalMajors,
      '招生计划数': group.totalPlanCount,
      '分数趋势': group.scoreTrend === 'up' ? '上升' : group.scoreTrend === 'down' ? '下降' : '平稳',
      '推荐理由': group.recommendReasons.join('；')
    }));
  }
}
