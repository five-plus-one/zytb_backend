import { StructuredGroupRecommendation } from '../types/structuredRecommendation';
import { GroupDetailService } from './groupDetail.service';

/**
 * 对比字段
 */
export interface ComparisonField {
  field: string;           // 字段名
  label: string;           // 显示名称
  values: any[];           // 各专业组的值
  type: 'number' | 'string' | 'boolean' | 'array'; // 值类型
  unit?: string;           // 单位
  highlight?: number;      // 高亮哪个索引（最优值）
}

/**
 * 对比结果
 */
export interface ComparisonResult {
  groups: StructuredGroupRecommendation[];  // 专业组列表
  comparison: ComparisonField[];            // 对比字段
  recommendations: string[];                // 对比建议
  summary: {
    best: {
      groupId: string;
      collegeName: string;
      reason: string;
    };
    mostSuitable?: {
      groupId: string;
      collegeName: string;
      reason: string;
    };
  };
}

/**
 * 专业组对比服务
 */
export class GroupComparisonService {
  private detailService = new GroupDetailService();

  /**
   * 对比多个专业组
   */
  async compareGroups(
    groupIds: string[],
    userProfile?: { score: number; rank: number }
  ): Promise<ComparisonResult> {
    if (groupIds.length < 2) {
      throw new Error('至少需要2个专业组才能进行对比');
    }

    if (groupIds.length > 5) {
      throw new Error('最多支持对比5个专业组');
    }

    // 1. 获取所有专业组详情
    const groups = await this.detailService.getGroupsDetail(groupIds, userProfile);

    if (groups.length < 2) {
      throw new Error('获取专业组详情失败，请检查专业组ID是否正确');
    }

    // 2. 生成对比字段
    const comparison = this.generateComparison(groups);

    // 3. 生成对比建议
    const recommendations = this.generateRecommendations(groups, userProfile);

    // 4. 生成总结
    const summary = this.generateSummary(groups, userProfile);

    return {
      groups,
      comparison,
      recommendations,
      summary
    };
  }

  /**
   * 生成对比字段
   */
  private generateComparison(groups: StructuredGroupRecommendation[]): ComparisonField[] {
    const fields: ComparisonField[] = [];

    // 1. 基本信息
    fields.push({
      field: 'collegeName',
      label: '院校名称',
      values: groups.map(g => g.collegeName),
      type: 'string'
    });

    fields.push({
      field: 'groupName',
      label: '专业组名称',
      values: groups.map(g => g.groupName),
      type: 'string'
    });

    fields.push({
      field: 'collegeProvince',
      label: '所在省份',
      values: groups.map(g => g.collegeProvince || '-'),
      type: 'string'
    });

    // 2. 院校层级
    fields.push({
      field: 'is985',
      label: '985工程',
      values: groups.map(g => g.is985 ? '是' : '否'),
      type: 'string',
      highlight: groups.findIndex(g => g.is985)
    });

    fields.push({
      field: 'is211',
      label: '211工程',
      values: groups.map(g => g.is211 ? '是' : '否'),
      type: 'string',
      highlight: groups.findIndex(g => g.is211)
    });

    fields.push({
      field: 'isDoubleFirstClass',
      label: '双一流',
      values: groups.map(g => g.isDoubleFirstClass ? '是' : '否'),
      type: 'string',
      highlight: groups.findIndex(g => g.isDoubleFirstClass)
    });

    // 3. 录取概率
    fields.push({
      field: 'probability',
      label: '录取概率',
      values: groups.map(g => g.probability),
      type: 'number',
      unit: '%',
      highlight: this.findHighestIndex(groups.map(g => g.probability))
    });

    fields.push({
      field: 'riskLevel',
      label: '冲稳保分类',
      values: groups.map(g => g.riskLevel),
      type: 'string'
    });

    fields.push({
      field: 'confidence',
      label: '置信度',
      values: groups.map(g => g.confidence),
      type: 'number',
      unit: '%',
      highlight: this.findHighestIndex(groups.map(g => g.confidence))
    });

    fields.push({
      field: 'adjustmentRisk',
      label: '调剂风险',
      values: groups.map(g => g.adjustmentRisk),
      type: 'string'
    });

    // 4. 分数分析
    fields.push({
      field: 'scoreGap',
      label: '分数差',
      values: groups.map(g => g.scoreGap),
      type: 'number',
      unit: '分',
      highlight: this.findHighestIndex(groups.map(g => g.scoreGap))
    });

    fields.push({
      field: 'rankGap',
      label: '位次差',
      values: groups.map(g => g.rankGap ?? '-'),
      type: 'number',
      unit: '位',
      highlight: this.findHighestIndex(groups.map(g => g.rankGap || 0))
    });

    fields.push({
      field: 'avgMinScore',
      label: '近3年平均最低分',
      values: groups.map(g => g.avgMinScore),
      type: 'number',
      unit: '分'
    });

    fields.push({
      field: 'avgMinRank',
      label: '近3年平均最低位次',
      values: groups.map(g => g.avgMinRank),
      type: 'number',
      unit: '位'
    });

    // 5. 历年数据
    fields.push({
      field: 'scoreVolatility',
      label: '分数波动性',
      values: groups.map(g => g.scoreVolatility ?? '-'),
      type: 'number',
      unit: '分',
      highlight: this.findLowestIndex(groups.map(g => g.scoreVolatility || Infinity))
    });

    fields.push({
      field: 'scoreTrend',
      label: '分数趋势',
      values: groups.map(g => this.formatTrend(g.scoreTrend)),
      type: 'string'
    });

    // 6. 专业信息
    fields.push({
      field: 'totalMajors',
      label: '专业数量',
      values: groups.map(g => g.totalMajors),
      type: 'number',
      unit: '个',
      highlight: this.findHighestIndex(groups.map(g => g.totalMajors))
    });

    fields.push({
      field: 'totalPlanCount',
      label: '招生计划数',
      values: groups.map(g => g.totalPlanCount),
      type: 'number',
      unit: '人',
      highlight: this.findHighestIndex(groups.map(g => g.totalPlanCount))
    });

    fields.push({
      field: 'majors',
      label: '包含专业',
      values: groups.map(g => g.majors.map(m => m.majorName).join('、')),
      type: 'string'
    });

    // 7. 历年最低分（展开）
    const maxYears = Math.max(...groups.map(g => g.historicalData.length));
    for (let i = 0; i < Math.min(maxYears, 3); i++) {
      const year = groups[0].historicalData[i]?.year;
      if (year) {
        fields.push({
          field: `year_${year}_minScore`,
          label: `${year}年最低分`,
          values: groups.map(g => {
            const yearData = g.historicalData.find(h => h.year === year);
            return yearData?.minScore ?? '-';
          }),
          type: 'number',
          unit: '分'
        });
      }
    }

    return fields;
  }

  /**
   * 生成对比建议
   */
  private generateRecommendations(
    groups: StructuredGroupRecommendation[],
    userProfile?: { score: number; rank: number }
  ): string[] {
    const recommendations: string[] = [];

    if (!userProfile) {
      recommendations.push('💡 建议先填写您的分数和位次，以获取更精准的对比分析');
      return recommendations;
    }

    // 1. 录取概率对比
    const probabilityGroups = groups.map((g, i) => ({ group: g, index: i }))
      .sort((a, b) => b.group.probability - a.group.probability);

    const highestProb = probabilityGroups[0];
    const lowestProb = probabilityGroups[probabilityGroups.length - 1];

    recommendations.push(
      `📊 **录取概率**: ${highestProb.group.collegeName} 概率最高（${highestProb.group.probability}%），` +
      `${lowestProb.group.collegeName} 概率最低（${lowestProb.group.probability}%）`
    );

    // 2. 院校层级对比
    const has985 = groups.filter(g => g.is985);
    const has211 = groups.filter(g => g.is211);

    if (has985.length > 0) {
      recommendations.push(`🏆 985院校: ${has985.map(g => g.collegeName).join('、')}`);
    }
    if (has211.length > 0 && has985.length < groups.length) {
      const only211 = has211.filter(g => !g.is985);
      if (only211.length > 0) {
        recommendations.push(`🏅 211院校: ${only211.map(g => g.collegeName).join('、')}`);
      }
    }

    // 3. 分数差对比
    const positiveGap = groups.filter(g => g.scoreGap > 0);
    const negativeGap = groups.filter(g => g.scoreGap < 0);

    if (positiveGap.length > 0) {
      recommendations.push(
        `✅ **分数优势**: ${positiveGap.map(g => `${g.collegeName}(+${g.scoreGap}分)`).join('、')}`
      );
    }
    if (negativeGap.length > 0) {
      recommendations.push(
        `⚠️  **分数劣势**: ${negativeGap.map(g => `${g.collegeName}(${g.scoreGap}分)`).join('、')}`
      );
    }

    // 4. 稳定性对比
    const stableGroups = groups.filter(g => g.scoreVolatility && g.scoreVolatility < 5);
    const volatileGroups = groups.filter(g => g.scoreVolatility && g.scoreVolatility > 10);

    if (stableGroups.length > 0) {
      recommendations.push(
        `📈 **分数稳定**: ${stableGroups.map(g => g.collegeName).join('、')} 历年分数波动小，预测准确性高`
      );
    }
    if (volatileGroups.length > 0) {
      recommendations.push(
        `📉 **分数波动**: ${volatileGroups.map(g => g.collegeName).join('、')} 历年分数波动较大，存在不确定性`
      );
    }

    // 5. 专业数量对比
    const richMajors = groups.filter(g => g.totalMajors >= 5);
    if (richMajors.length > 0) {
      recommendations.push(
        `🎓 **专业选择多**: ${richMajors.map(g => `${g.collegeName}(${g.totalMajors}个专业)`).join('、')}`
      );
    }

    // 6. 综合建议
    if (has985.length > 0 && positiveGap.some(g => g.is985)) {
      const target = positiveGap.find(g => g.is985);
      recommendations.push(
        `💯 **推荐**: ${target?.collegeName} 是985院校且您的分数有优势，强烈推荐`
      );
    }

    return recommendations;
  }

  /**
   * 生成总结
   */
  private generateSummary(
    groups: StructuredGroupRecommendation[],
    userProfile?: { score: number; rank: number }
  ): ComparisonResult['summary'] {
    // 找出综合最优
    const best = this.findBestGroup(groups);

    // 找出最适合用户的
    const mostSuitable = userProfile ? this.findMostSuitableGroup(groups, userProfile) : undefined;

    return {
      best: {
        groupId: best.groupId,
        collegeName: best.collegeName,
        reason: this.getBestReason(best)
      },
      mostSuitable: mostSuitable ? {
        groupId: mostSuitable.groupId,
        collegeName: mostSuitable.collegeName,
        reason: this.getSuitableReason(mostSuitable)
      } : undefined
    };
  }

  /**
   * 找出综合最优专业组
   */
  private findBestGroup(groups: StructuredGroupRecommendation[]): StructuredGroupRecommendation {
    // 综合评分：院校层级 + 专业数量 + 招生规模
    const scores = groups.map(g => {
      let score = 0;
      if (g.is985) score += 50;
      else if (g.is211) score += 30;
      if (g.isDoubleFirstClass) score += 20;
      score += Math.min(g.totalMajors * 2, 20); // 专业数量，最多20分
      score += Math.min(g.totalPlanCount / 10, 10); // 招生规模，最多10分
      return score;
    });

    const maxIndex = scores.indexOf(Math.max(...scores));
    return groups[maxIndex];
  }

  /**
   * 找出最适合用户的专业组
   */
  private findMostSuitableGroup(
    groups: StructuredGroupRecommendation[],
    userProfile: { score: number; rank: number }
  ): StructuredGroupRecommendation {
    // 适合度评分：录取概率 + 置信度 + 分数差
    const scores = groups.map(g => {
      let score = 0;

      // 录取概率在50-80%为最佳
      if (g.probability >= 50 && g.probability <= 80) {
        score += 50;
      } else {
        score += 50 - Math.abs(65 - g.probability);
      }

      // 置信度越高越好
      score += g.confidence * 0.3;

      // 分数差在0-10分为最佳
      if (g.scoreGap >= 0 && g.scoreGap <= 10) {
        score += 20;
      } else if (g.scoreGap < 0) {
        score += Math.max(0, 20 + g.scoreGap * 2);
      }

      return score;
    });

    const maxIndex = scores.indexOf(Math.max(...scores));
    return groups[maxIndex];
  }

  /**
   * 获取最优理由
   */
  private getBestReason(group: StructuredGroupRecommendation): string {
    const reasons: string[] = [];

    if (group.is985) reasons.push('985工程');
    if (group.is211 && !group.is985) reasons.push('211工程');
    if (group.isDoubleFirstClass) reasons.push('双一流');
    if (group.totalMajors >= 5) reasons.push(`专业选择多(${group.totalMajors}个)`);
    if (group.totalPlanCount >= 50) reasons.push(`招生规模大(${group.totalPlanCount}人)`);

    return reasons.join('，') || '综合实力强';
  }

  /**
   * 获取适合理由
   */
  private getSuitableReason(group: StructuredGroupRecommendation): string {
    const reasons: string[] = [];

    if (group.probability >= 50 && group.probability <= 80) {
      reasons.push(`录取概率适中(${group.probability}%)`);
    }
    if (group.confidence >= 80) {
      reasons.push(`预测可靠(置信度${group.confidence}%)`);
    }
    if (group.scoreGap >= 0 && group.scoreGap <= 10) {
      reasons.push(`分数优势明显(+${group.scoreGap}分)`);
    }

    return reasons.join('，') || '综合匹配度高';
  }

  /**
   * 找出最高值的索引
   */
  private findHighestIndex(values: number[]): number {
    const max = Math.max(...values);
    return values.indexOf(max);
  }

  /**
   * 找出最低值的索引
   */
  private findLowestIndex(values: number[]): number {
    const min = Math.min(...values);
    return values.indexOf(min);
  }

  /**
   * 格式化趋势
   */
  private formatTrend(trend?: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '↗ 上升';
      case 'down': return '↘ 下降';
      case 'stable': return '→ 平稳';
      default: return '-';
    }
  }
}
