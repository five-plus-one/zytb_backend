/**
 * 录取概率计算服务
 *
 * 核心功能：根据用户分数和专业组历史数据，实时计算录取概率和冲稳保分类
 *
 * 设计原则：
 * - 冲稳保是相对于用户的，不是绝对的
 * - 不预先存储在数据库中，而是实时计算
 * - 考虑多种因素：分数差、位次差、波动性、计划数变化等
 */

/**
 * 专业组历史数据
 */
export interface GroupHistoricalData {
  year: number;
  minScore: number;      // 最低分
  avgScore?: number;     // 平均分
  maxScore?: number;     // 最高分
  minRank: number;       // 最低位次
  maxRank?: number;      // 最高位次
  planCount: number;     // 招生计划数
}

/**
 * 概率计算结果
 */
export interface ProbabilityResult {
  probability: number;              // 录取概率 0-100
  riskLevel: '冲' | '稳' | '保';    // 冲稳保分类
  adjustmentRisk: '高' | '中' | '低'; // 调剂风险
  scoreGap: number;                 // 分数差距
  rankGap: number | null;           // 位次差距
  confidence: number;               // 置信度 0-100
  filtered?: boolean;               // 是否被过滤（不合理的推荐）
  filterReason?: string;            // 过滤原因
}

/**
 * 录取概率计算服务
 */
export class AdmissionProbabilityService {

  /**
   * 为单个专业组计算录取概率
   *
   * @param userScore 用户分数
   * @param userRank 用户位次
   * @param groupHistory 该专业组近3年历史数据（按年份降序）
   * @param options 可选参数
   */
  calculateForGroup(
    userScore: number,
    userRank: number,
    groupHistory: GroupHistoricalData[],
    options?: {
      scoreVolatility?: number;  // 历史分数标准差（如果已预计算）
      popularityIndex?: number;  // 专业热度 0-100
    }
  ): ProbabilityResult {

    // 边界检查
    if (!groupHistory || groupHistory.length === 0) {
      return {
        probability: 50,
        riskLevel: '稳',
        adjustmentRisk: '中',
        scoreGap: 0,
        rankGap: null,
        confidence: 0
      };
    }

    // ===== 第一步：计算分数维度 =====

    // 1.1 计算近3年平均最低分
    const avgMinScore = groupHistory.reduce((sum, h) => sum + h.minScore, 0) / groupHistory.length;
    const scoreGap = userScore - avgMinScore;

    // 1.2 计算分数波动性（标准差）
    let scoreVolatility = options?.scoreVolatility;
    if (!scoreVolatility) {
      const variance = groupHistory.reduce((sum, h) =>
        sum + Math.pow(h.minScore - avgMinScore, 2), 0
      ) / groupHistory.length;
      scoreVolatility = Math.sqrt(variance);
    }

    // 1.3 计算最近一年分数趋势
    let scoreTrend = 0;
    if (groupHistory.length >= 2) {
      scoreTrend = groupHistory[0].minScore - groupHistory[1].minScore;
    }

    // ===== 第二步：计算位次维度 =====

    // 2.1 计算平均最低位次
    const avgMinRank = groupHistory.reduce((sum, h) => sum + h.minRank, 0) / groupHistory.length;
    const rankGap = avgMinRank - userRank; // 正数表示用户位次更靠前（更好）

    // 2.2 计算位次波动性
    const rankVolatility = Math.sqrt(
      groupHistory.reduce((sum, h) =>
        sum + Math.pow(h.minRank - avgMinRank, 2), 0
      ) / groupHistory.length
    );

    // ===== 第三步：计算招生计划变化 =====

    let planChangeRate = 0;
    if (groupHistory.length >= 2) {
      const currentPlan = groupHistory[0].planCount;
      const lastYearPlan = groupHistory[1].planCount;
      if (lastYearPlan > 0) {
        planChangeRate = (currentPlan - lastYearPlan) / lastYearPlan;
      }
    }

    // ===== 第四步：计算基础概率（基于分数差）=====

    let baseProbability = 50;

    // 使用分段函数计算基础概率
    if (scoreGap >= 25) {
      baseProbability = 99;
    } else if (scoreGap >= 20) {
      baseProbability = 98;
    } else if (scoreGap >= 15) {
      baseProbability = 95;
    } else if (scoreGap >= 10) {
      baseProbability = 88;
    } else if (scoreGap >= 5) {
      baseProbability = 78;
    } else if (scoreGap >= 0) {
      baseProbability = 65;
    } else if (scoreGap >= -5) {
      baseProbability = 48;
    } else if (scoreGap >= -10) {
      baseProbability = 32;
    } else if (scoreGap >= -15) {
      baseProbability = 18;
    } else if (scoreGap >= -20) {
      baseProbability = 8;
    } else {
      baseProbability = 3;
    }

    // ===== 第五步：位次调整 =====

    let probabilityAdjustment = 0;

    // 5.1 位次差调整
    if (rankGap > 2000) {
      probabilityAdjustment += 12;
    } else if (rankGap > 1000) {
      probabilityAdjustment += 8;
    } else if (rankGap > 500) {
      probabilityAdjustment += 5;
    } else if (rankGap > 0) {
      probabilityAdjustment += 2;
    } else if (rankGap > -500) {
      probabilityAdjustment -= 2;
    } else if (rankGap > -1000) {
      probabilityAdjustment -= 5;
    } else if (rankGap > -2000) {
      probabilityAdjustment -= 8;
    } else {
      probabilityAdjustment -= 12;
    }

    // 5.2 分数位次一致性检查（如果分数高但位次不好，降低置信度）
    const scoreRankConsistency = (scoreGap > 0 && rankGap > 0) || (scoreGap < 0 && rankGap < 0);

    // ===== 第六步：波动性调整 =====

    let volatilityFactor = 1.0;

    // 6.1 分数波动大，不确定性高
    if (scoreVolatility > 10) {
      volatilityFactor = 0.80; // 大幅降低概率
    } else if (scoreVolatility > 8) {
      volatilityFactor = 0.85;
    } else if (scoreVolatility > 5) {
      volatilityFactor = 0.92;
    } else if (scoreVolatility > 3) {
      volatilityFactor = 0.97;
    }

    // 6.2 分数趋势调整
    if (scoreTrend > 8) {
      // 去年分数大幅上涨，今年可能下降
      probabilityAdjustment += 3;
    } else if (scoreTrend < -8) {
      // 去年分数大幅下降，今年可能上涨
      probabilityAdjustment -= 3;
    }

    // ===== 第七步：计划数变化调整 =====

    if (planChangeRate > 0.5) {
      // 大幅扩招（50%以上）
      probabilityAdjustment += 8;
    } else if (planChangeRate > 0.3) {
      // 明显扩招（30-50%）
      probabilityAdjustment += 5;
    } else if (planChangeRate > 0.1) {
      // 小幅扩招（10-30%）
      probabilityAdjustment += 2;
    } else if (planChangeRate < -0.3) {
      // 大幅缩招（30%以上）
      probabilityAdjustment -= 5;
    } else if (planChangeRate < -0.1) {
      // 小幅缩招（10-30%）
      probabilityAdjustment -= 2;
    }

    // ===== 第八步：专业热度调整 =====

    if (options?.popularityIndex) {
      const popularity = options.popularityIndex;
      if (popularity > 90) {
        // 极热门专业
        probabilityAdjustment -= 5;
      } else if (popularity > 75) {
        // 热门专业
        probabilityAdjustment -= 3;
      } else if (popularity < 30) {
        // 冷门专业
        probabilityAdjustment += 3;
      }
    }

    // ===== 第九步：综合计算最终概率 =====

    let finalProbability = (baseProbability + probabilityAdjustment) * volatilityFactor;

    // 限制在 0-100 范围内
    finalProbability = Math.max(0, Math.min(100, finalProbability));

    // ===== 第十步：计算置信度（需要在过滤前计算）=====

    let confidence = 100;

    // 10.1 数据量不足降低置信度
    if (groupHistory.length < 3) {
      confidence -= 20;
    } else if (groupHistory.length < 2) {
      confidence -= 40;
    }

    // 10.2 波动性大降低置信度
    if (scoreVolatility > 10) {
      confidence -= 30;
    } else if (scoreVolatility > 5) {
      confidence -= 15;
    }

    // 10.3 分数位次不一致降低置信度
    if (!scoreRankConsistency) {
      confidence -= 10;
    }

    // 10.4 计划数变化大降低置信度
    if (Math.abs(planChangeRate) > 0.3) {
      confidence -= 10;
    }

    confidence = Math.max(0, Math.min(100, confidence));

    // ===== 第十一步：预过滤不合理的推荐 =====

    // 11.1 分数差过大或过小（浪费志愿位）
    if (scoreGap < -30) {
      return {
        probability: Math.round(finalProbability),
        riskLevel: '冲',
        adjustmentRisk: '高',
        scoreGap: Math.round(scoreGap * 10) / 10,
        rankGap: rankGap ? Math.round(rankGap) : null,
        confidence: Math.round(confidence),
        filtered: true,
        filterReason: '分数差距过大（低于历史平均分30分以上），冲刺意义不大'
      };
    }

    if (scoreGap > 25) {
      return {
        probability: Math.round(finalProbability),
        riskLevel: '保',
        adjustmentRisk: '低',
        scoreGap: Math.round(scoreGap * 10) / 10,
        rankGap: rankGap ? Math.round(rankGap) : null,
        confidence: Math.round(confidence),
        filtered: true,
        filterReason: '分数差距过大（高于历史平均分25分以上），过于稳妥，浪费志愿位'
      };
    }

    // 11.2 概率过低且分数差过大（无意义冲刺）
    if (finalProbability < 5 && scoreGap < -15) {
      return {
        probability: Math.round(finalProbability),
        riskLevel: '冲',
        adjustmentRisk: '高',
        scoreGap: Math.round(scoreGap * 10) / 10,
        rankGap: rankGap ? Math.round(rankGap) : null,
        confidence: Math.round(confidence),
        filtered: true,
        filterReason: '录取概率极低且分数差距大，冲刺风险极高'
      };
    }

    // ===== 第十二步：分类为冲稳保（用户纠正后的标准）=====

    /**
     * 用户定义的冲稳保标准：
     * - 冲: < 35% (有概率但不大，能上的话会很高兴)
     * - 稳: 35-90% (正常应该落在这个区间，落不了说明志愿填报失败)
     * - 保: 90-99% (保底覆盖)
     */

    let riskLevel: '冲' | '稳' | '保';
    let adjustmentRisk: '高' | '中' | '低';

    if (finalProbability < 35) {
      // 冲一冲：概率不高但有可能
      riskLevel = '冲';
      if (finalProbability < 15) {
        adjustmentRisk = '高';  // < 15% 风险很高
      } else if (finalProbability < 25) {
        adjustmentRisk = '中';  // 15-25% 风险中等
      } else {
        adjustmentRisk = '低';  // 25-35% 风险较低
      }
    } else if (finalProbability <= 90) {
      // 稳一稳：正常应该落在这个区间
      riskLevel = '稳';
      if (finalProbability < 50) {
        adjustmentRisk = '中';  // 35-50% 仍有一定风险
      } else if (finalProbability < 70) {
        adjustmentRisk = '低';  // 50-70% 较稳
      } else {
        adjustmentRisk = '低';  // 70-90% 很稳
      }
    } else {
      // 保一保：保底覆盖（90-99%）
      riskLevel = '保';
      adjustmentRisk = '低';
    }

    // ===== 返回结果 =====

    return {
      probability: Math.round(finalProbability),
      riskLevel,
      adjustmentRisk,
      scoreGap: Math.round(scoreGap * 10) / 10, // 保留1位小数
      rankGap: rankGap ? Math.round(rankGap) : null,
      confidence: Math.round(confidence)
    };
  }

  /**
   * 批量计算多个专业组的概率
   */
  batchCalculate(
    userScore: number,
    userRank: number,
    groups: Array<{
      groupId: string;
      history: GroupHistoricalData[];
      scoreVolatility?: number;
      popularityIndex?: number;
    }>
  ): Map<string, ProbabilityResult> {

    const results = new Map<string, ProbabilityResult>();

    for (const group of groups) {
      const result = this.calculateForGroup(
        userScore,
        userRank,
        group.history,
        {
          scoreVolatility: group.scoreVolatility,
          popularityIndex: group.popularityIndex
        }
      );

      results.set(group.groupId, result);
    }

    return results;
  }

  /**
   * 生成推荐理由
   */
  generateRecommendReason(
    result: ProbabilityResult,
    groupName: string,
    collegeName: string,
    collegeLevel: { is985?: boolean; is211?: boolean }
  ): string[] {
    const reasons: string[] = [];

    // 1. 分数差描述
    if (result.scoreGap > 10) {
      reasons.push(`您的分数比该专业组近3年平均最低分高${result.scoreGap.toFixed(1)}分`);
    } else if (result.scoreGap > 0) {
      reasons.push(`您的分数比该专业组近3年平均最低分略高${result.scoreGap.toFixed(1)}分`);
    } else if (result.scoreGap > -5) {
      reasons.push(`您的分数与该专业组近3年平均最低分接近（差距${Math.abs(result.scoreGap).toFixed(1)}分）`);
    } else {
      reasons.push(`您的分数比该专业组近3年平均最低分低${Math.abs(result.scoreGap).toFixed(1)}分`);
    }

    // 2. 位次差描述
    if (result.rankGap && result.rankGap > 500) {
      reasons.push(`您的位次比历史最低位次靠前约${result.rankGap}位`);
    } else if (result.rankGap && result.rankGap < -500) {
      reasons.push(`您的位次比历史最低位次靠后约${Math.abs(result.rankGap)}位`);
    }

    // 3. 院校层级
    if (collegeLevel.is985) {
      reasons.push('985工程院校');
    } else if (collegeLevel.is211) {
      reasons.push('211工程院校');
    }

    // 4. 录取概率描述
    if (result.probability >= 80) {
      reasons.push(`录取概率很高（${result.probability}%）`);
    } else if (result.probability >= 65) {
      reasons.push(`录取概率较高（${result.probability}%）`);
    } else if (result.probability >= 45) {
      reasons.push(`有一定录取概率（${result.probability}%）`);
    } else if (result.probability >= 25) {
      reasons.push(`录取概率偏低（${result.probability}%），可以冲刺`);
    } else {
      reasons.push(`录取难度较大（${result.probability}%），冲刺风险高`);
    }

    // 5. 置信度描述
    if (result.confidence < 60) {
      reasons.push(`注意：该预测置信度较低（${result.confidence}%），历史数据波动较大或样本不足`);
    }

    return reasons;
  }
}
