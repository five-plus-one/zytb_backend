import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { VolunteerManagementService } from '../../services/volunteerManagement.service';

/**
 * 创建志愿批次工具
 */
export class CreateVolunteerBatchTool extends Tool {
  name = 'create_volunteer_batch';
  description = '创建志愿批次：为用户创建一个新的志愿填报批次。用户首次填报志愿前必须先创建批次。江苏新高考一个批次可填40个专业组。适用场景："我要开始填志愿了""创建一个本科批次的志愿表"';

  parameters: Record<string, ToolParameter> = {
    userId: {
      type: 'string',
      description: '用户ID',
      required: true
    },
    year: {
      type: 'number',
      description: '年份',
      required: true
    },
    batchType: {
      type: 'string',
      description: '批次类型：本科批、专科批等',
      required: true
    },
    province: {
      type: 'string',
      description: '省份',
      required: true
    },
    subjectType: {
      type: 'string',
      description: '科类：物理类、历史类',
      required: true
    },
    score: {
      type: 'number',
      description: '考生分数',
      required: true
    },
    rank: {
      type: 'number',
      description: '考生位次',
      required: false
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const batch = await this.service.createBatch({
        userId: params.userId,
        year: params.year,
        batchType: params.batchType,
        province: params.province,
        subjectType: params.subjectType,
        score: params.score,
        rank: params.rank
      });

      return {
        success: true,
        data: batch,
        metadata: {
          dataSource: 'volunteer_batches',
          description: `已创建${params.year}年${params.batchType}志愿批次`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * 获取志愿表摘要工具
 */
export class GetVolunteerSummaryTool extends Tool {
  name = 'get_volunteer_summary';
  description = '获取志愿表摘要统计：查看志愿表的整体情况，包括已填专业组数量、冲稳保分布、985/211分布、省内外分布等统计信息。适用场景："我的志愿表填了多少个？""我的志愿表冲稳保比例怎么样？"';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID',
      required: true
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      // 获取批次详情(包含所有专业组)
      const batchDetail = await this.service.getBatchDetail(params.batchId);

      // 统计分析
      const groups = batchDetail.groups || [];
      const totalGroups = groups.length;

      // 按冲稳保分类统计
      const byProbability = {
        冲: groups.filter(g => g.admitProbability === '冲').length,
        稳: groups.filter(g => g.admitProbability === '稳').length,
        保: groups.filter(g => g.admitProbability === '保').length,
        未分类: groups.filter(g => !g.admitProbability || g.admitProbability === '未知').length
      };

      // 按省内外统计(需要从院校信息获取)
      const byProvince = {
        省内: 0,
        省外: 0
      };

      // 简单判断:如果院校名包含省份名,算省内
      const province = batchDetail.province;
      groups.forEach(g => {
        if (g.collegeName.includes(province.replace('省', '').replace('市', ''))) {
          byProvince.省内++;
        } else {
          byProvince.省外++;
        }
      });

      // 按专业数统计
      const totalMajors = groups.reduce((sum, g) => sum + (g.majors?.length || 0), 0);

      // 检查空缺
      const filledPositions = groups.map(g => g.groupOrder);
      const gaps: number[] = [];
      for (let i = 1; i <= 40; i++) {
        if (!filledPositions.includes(i) && i <= Math.max(...filledPositions, 0) + 1) {
          gaps.push(i);
        }
      }

      return {
        success: true,
        data: {
          batchInfo: {
            batchId: batchDetail.id,
            year: batchDetail.year,
            batchType: batchDetail.batchType,
            province: batchDetail.province,
            score: batchDetail.score,
            rank: batchDetail.rank,
            status: batchDetail.status
          },
          summary: {
            totalGroups,
            totalMajors,
            maxGroups: 40,
            remainingSlots: 40 - totalGroups,
            completionRate: ((totalGroups / 40) * 100).toFixed(1) + '%'
          },
          distribution: {
            byProbability,
            byProvince
          },
          gaps: gaps.length > 0 ? gaps.slice(0, 10) : [], // 最多显示前10个空缺
          suggestions: this.generateSuggestions(totalGroups, byProbability, gaps)
        },
        metadata: {
          dataSource: 'volunteer_batches + volunteer_groups',
          description: `志愿表包含${totalGroups}个专业组，${totalMajors}个专业`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private generateSuggestions(totalGroups: number, byProbability: any, gaps: number[]): string[] {
    const suggestions: string[] = [];

    if (totalGroups === 0) {
      suggestions.push('志愿表为空，建议开始添加专业组');
      return suggestions;
    }

    if (totalGroups < 10) {
      suggestions.push(`目前只填了${totalGroups}个专业组，建议至少填20-30个以确保录取机会`);
    }

    const rushPercent = (byProbability.冲 / totalGroups) * 100;
    const stablePercent = (byProbability.稳 / totalGroups) * 100;
    const safePercent = (byProbability.保 / totalGroups) * 100;

    if (byProbability.冲 === 0) {
      suggestions.push('缺少"冲一冲"院校，建议添加2-5个冲刺院校');
    } else if (rushPercent > 30) {
      suggestions.push('"冲一冲"院校过多，可能浪费志愿位置，建议控制在20%以内');
    }

    if (byProbability.稳 === 0 && totalGroups > 5) {
      suggestions.push('缺少"稳一稳"院校，这是最容易被录取的区间，务必重点填报');
    } else if (stablePercent < 40 && totalGroups > 10) {
      suggestions.push('"稳一稳"院校偏少，建议增加至50%左右');
    }

    if (byProbability.保 === 0 && totalGroups > 10) {
      suggestions.push('缺少保底院校，存在滑档风险，务必添加3-5个保底选择');
    }

    if (byProbability.未分类 > totalGroups * 0.3) {
      suggestions.push('较多专业组未标注冲稳保分类，建议完善以便更好地规划梯度');
    }

    if (gaps.length > 5 && totalGroups > 10) {
      suggestions.push(`志愿表中有${gaps.length}个空缺位置，建议按顺序填满以避免错误`);
    }

    return suggestions;
  }
}

/**
 * 分析志愿批次工具
 */
export class AnalyzeVolunteerBatchTool extends Tool {
  name = 'analyze_volunteer_batch';
  description = '完整分析志愿表：深度分析志愿表的合理性，包括梯度设置、风险评估、冲稳保比例、专业分布等，并给出优化建议。适用场景："帮我分析一下我的志愿表""我的志愿填得合理吗？""有什么需要改进的地方？"';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID',
      required: true
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const batchDetail = await this.service.getBatchDetail(params.batchId);
      const groups = batchDetail.groups || [];

      if (groups.length === 0) {
        return {
          success: true,
          data: {
            analysis: {
              overall: '志愿表为空',
              score: 0,
              level: '未开始',
              risks: ['志愿表为空，请开始添加专业组']
            }
          },
          metadata: {
            dataSource: 'volunteer_batches',
            description: '志愿表为空'
          }
        };
      }

      // 1. 梯度分析
      const gradientAnalysis = this.analyzeGradient(groups);

      // 2. 风险评估
      const riskAssessment = this.assessRisks(groups, batchDetail);

      // 3. 专业分布分析
      const majorDistribution = this.analyzeMajorDistribution(groups);

      // 4. 综合评分
      const overallScore = this.calculateOverallScore(gradientAnalysis, riskAssessment, majorDistribution);

      // 5. 优化建议
      const recommendations = this.generateRecommendations(gradientAnalysis, riskAssessment, majorDistribution, groups);

      return {
        success: true,
        data: {
          analysis: {
            overall: this.getOverallLevel(overallScore),
            score: overallScore,
            level: this.getScoreLevel(overallScore),
            gradientAnalysis,
            riskAssessment,
            majorDistribution,
            recommendations
          }
        },
        metadata: {
          dataSource: 'volunteer_batches + volunteer_groups + volunteer_majors',
          description: `分析了${groups.length}个专业组的志愿表`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private analyzeGradient(groups: any[]) {
    const byProbability = {
      冲: groups.filter(g => g.admitProbability === '冲'),
      稳: groups.filter(g => g.admitProbability === '稳'),
      保: groups.filter(g => g.admitProbability === '保'),
      未分类: groups.filter(g => !g.admitProbability || g.admitProbability === '未知')
    };

    const total = groups.length;
    const rushPercent = (byProbability.冲.length / total) * 100;
    const stablePercent = (byProbability.稳.length / total) * 100;
    const safePercent = (byProbability.保.length / total) * 100;

    let gradientScore = 100;
    let gradientIssues: string[] = [];

    // 理想比例: 冲10-20%, 稳50-60%, 保20-30%
    if (rushPercent > 30) {
      gradientScore -= 20;
      gradientIssues.push('冲刺院校过多');
    } else if (rushPercent < 5 && total > 10) {
      gradientScore -= 10;
      gradientIssues.push('冲刺院校过少，可以适当增加');
    }

    if (stablePercent < 40 && total > 10) {
      gradientScore -= 30;
      gradientIssues.push('稳妥院校过少，这是最重要的区间');
    } else if (stablePercent > 70) {
      gradientScore -= 10;
      gradientIssues.push('稳妥院校过多，建议增加保底');
    }

    if (safePercent < 15 && total > 15) {
      gradientScore -= 25;
      gradientIssues.push('保底院校不足，存在滑档风险');
    }

    if (byProbability.未分类.length > total * 0.3) {
      gradientScore -= 15;
      gradientIssues.push('较多专业组未标注冲稳保，建议完善');
    }

    return {
      distribution: {
        冲: byProbability.冲.length,
        稳: byProbability.稳.length,
        保: byProbability.保.length,
        未分类: byProbability.未分类.length
      },
      percentage: {
        冲: rushPercent.toFixed(1) + '%',
        稳: stablePercent.toFixed(1) + '%',
        保: safePercent.toFixed(1) + '%'
      },
      score: Math.max(0, gradientScore),
      issues: gradientIssues,
      ideal: '理想比例：冲10-20%、稳50-60%、保20-30%'
    };
  }

  private assessRisks(groups: any[], batchDetail: any) {
    const risks: string[] = [];
    let riskLevel = '低';
    let riskScore = 100;

    // 检查保底院校
    const safeCount = groups.filter(g => g.admitProbability === '保').length;
    if (safeCount < 3 && groups.length > 10) {
      risks.push('保底院校不足，存在较高滑档风险');
      riskLevel = '高';
      riskScore -= 40;
    } else if (safeCount < 5 && groups.length > 20) {
      risks.push('保底院校偏少，建议增加');
      riskLevel = '中';
      riskScore -= 20;
    }

    // 检查是否服从调剂
    const notObeyCount = groups.filter(g => g.isObeyAdjustment === false).length;
    if (notObeyCount > groups.length * 0.5) {
      risks.push('较多专业组不服从调剂，增加退档风险');
      if (riskLevel === '低') riskLevel = '中';
      riskScore -= 15;
    }

    // 检查位置连续性
    const positions = groups.map(g => g.groupOrder).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 0; i < positions.length - 1; i++) {
      if (positions[i + 1] - positions[i] > 1) {
        gaps.push(positions[i] + 1);
      }
    }
    if (gaps.length > 0) {
      risks.push(`志愿表中有${gaps.length}个空缺，可能导致填报错误`);
      riskScore -= 10;
    }

    // 检查志愿数量
    if (groups.length < 15) {
      risks.push('志愿数量较少，可能错过录取机会');
      if (riskLevel === '低') riskLevel = '中';
      riskScore -= 15;
    }

    if (risks.length === 0) {
      risks.push('暂未发现明显风险');
    }

    return {
      level: riskLevel,
      score: Math.max(0, riskScore),
      risks,
      suggestions: this.getRiskSuggestions(risks)
    };
  }

  private getRiskSuggestions(risks: string[]): string[] {
    const suggestions: string[] = [];

    risks.forEach(risk => {
      if (risk.includes('保底院校')) {
        suggestions.push('建议增加3-5个保底院校，确保有学可上');
      }
      if (risk.includes('不服从调剂')) {
        suggestions.push('建议在稳妥和保底院校选择服从调剂，降低退档风险');
      }
      if (risk.includes('空缺')) {
        suggestions.push('建议按顺序填满志愿表，避免因格式错误导致志愿无效');
      }
      if (risk.includes('数量较少')) {
        suggestions.push('建议填满20-30个专业组，充分利用志愿填报机会');
      }
    });

    return suggestions;
  }

  private analyzeMajorDistribution(groups: any[]) {
    // 统计专业名称分布
    const majorNames: Map<string, number> = new Map();
    let totalMajors = 0;

    groups.forEach(g => {
      if (g.majors && Array.isArray(g.majors)) {
        g.majors.forEach((m: any) => {
          totalMajors++;
          const name = m.majorName;
          majorNames.set(name, (majorNames.get(name) || 0) + 1);
        });
      }
    });

    // 找出高频专业
    const sortedMajors = Array.from(majorNames.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topMajors = sortedMajors.map(([name, count]) => ({
      name,
      count,
      percentage: ((count / totalMajors) * 100).toFixed(1) + '%'
    }));

    // 判断专业是否过于集中
    const topMajorPercent = sortedMajors.length > 0 ? (sortedMajors[0][1] / totalMajors) * 100 : 0;
    let concentrationLevel = '适中';
    const issues: string[] = [];

    if (topMajorPercent > 50) {
      concentrationLevel = '过于集中';
      issues.push(`"${sortedMajors[0][0]}"专业占比${topMajorPercent.toFixed(1)}%，过于集中`);
    } else if (topMajorPercent > 30) {
      concentrationLevel = '较为集中';
      issues.push(`"${sortedMajors[0][0]}"专业占比${topMajorPercent.toFixed(1)}%，建议适当分散`);
    }

    return {
      totalMajors,
      uniqueMajors: majorNames.size,
      topMajors,
      concentrationLevel,
      issues
    };
  }

  private calculateOverallScore(gradient: any, risk: any, distribution: any): number {
    // 梯度占40%, 风险占40%, 专业分布占20%
    const gradientWeight = 0.4;
    const riskWeight = 0.4;
    const distributionWeight = 0.2;

    const distributionScore = distribution.concentrationLevel === '适中' ? 100 :
                               distribution.concentrationLevel === '较为集中' ? 80 : 60;

    const overall = gradient.score * gradientWeight +
                    risk.score * riskWeight +
                    distributionScore * distributionWeight;

    return Math.round(overall);
  }

  private getScoreLevel(score: number): string {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '及格';
    return '需改进';
  }

  private getOverallLevel(score: number): string {
    if (score >= 90) return '志愿表设计合理，梯度清晰，风险较低';
    if (score >= 80) return '志愿表基本合理，有少量需要优化的地方';
    if (score >= 70) return '志愿表存在一些问题，建议根据建议进行调整';
    if (score >= 60) return '志愿表问题较多，强烈建议优化';
    return '志愿表存在较大风险，必须重新规划';
  }

  private generateRecommendations(gradient: any, risk: any, distribution: any, groups: any[]): string[] {
    const recommendations: string[] = [];

    // 基于梯度分析的建议
    gradient.issues.forEach((issue: string) => {
      if (issue.includes('冲刺院校过多')) {
        recommendations.push('减少冲刺院校数量，将更多位置分配给稳妥和保底院校');
      } else if (issue.includes('冲刺院校过少')) {
        recommendations.push('适当增加2-3个冲刺院校，给自己冲击更好学校的机会');
      } else if (issue.includes('稳妥院校过少')) {
        recommendations.push('重点增加稳妥院校，这是最容易被录取的区间，建议占比50%以上');
      } else if (issue.includes('保底院校不足')) {
        recommendations.push('务必增加保底院校，至少3-5个，确保不滑档');
      }
    });

    // 基于风险评估的建议
    risk.suggestions.forEach((s: string) => recommendations.push(s));

    // 基于专业分布的建议
    if (distribution.concentrationLevel !== '适中') {
      recommendations.push('专业选择建议多元化，避免过于集中在单一专业方向');
    }

    // 通用建议
    if (groups.length < 40) {
      recommendations.push(`目前填了${groups.length}个专业组，建议继续填充至30-40个，充分利用机会`);
    }

    return recommendations;
  }
}
