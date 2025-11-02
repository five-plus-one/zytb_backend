/**
 * 推荐卡片格式化工具
 *
 * 用途：将后端的 StructuredGroupRecommendation 数据转换为前端需要的 recommendation-card 格式
 */

import { StructuredGroupRecommendation } from '../../types/structuredRecommendation';

export class RecommendationCardFormatter {
  /**
   * 将单个专业组推荐转换为 recommendation-card 格式
   */
  static formatSingleCard(recommendation: StructuredGroupRecommendation): string {
    const cardData = {
      // 基本信息
      groupId: recommendation.groupId,
      collegeName: recommendation.collegeName,
      collegeCode: recommendation.collegeCode || '',
      collegeProvince: recommendation.collegeProvince || '',
      groupName: recommendation.groupName,
      groupCode: recommendation.groupCode,

      // 院校标签
      is985: recommendation.is985,
      is211: recommendation.is211,
      isDoubleFirstClass: recommendation.isDoubleFirstClass,
      collegeType: recommendation.collegeType || '',
      collegeLevel: recommendation.collegeLevel || '',

      // 冲稳保分类
      riskLevel: recommendation.riskLevel,
      probability: recommendation.probability,
      confidence: recommendation.confidence,
      adjustmentRisk: recommendation.adjustmentRisk,

      // 分数分析
      scoreGap: recommendation.scoreGap,
      rankGap: recommendation.rankGap,
      userScore: recommendation.userScore,
      userRank: recommendation.userRank,
      avgMinScore: recommendation.avgMinScore,
      avgMinRank: recommendation.avgMinRank,

      // 历年数据
      historicalData: recommendation.historicalData,
      scoreVolatility: recommendation.scoreVolatility,
      scoreTrend: recommendation.scoreTrend,

      // 专业信息
      majors: recommendation.majors,
      totalMajors: recommendation.totalMajors,
      totalPlanCount: recommendation.totalPlanCount,

      // 推荐理由
      recommendReasons: recommendation.recommendReasons,
      warnings: recommendation.warnings || [],
      highlights: recommendation.highlights || [],

      // 排序权重
      rankScore: recommendation.rankScore
    };

    // 格式化为 markdown 代码块
    return '```recommendation-card\n' + JSON.stringify(cardData, null, 2) + '\n```';
  }

  /**
   * 将多个推荐批量转换为卡片格式，并添加说明文字
   */
  static formatMultipleCards(
    recommendations: StructuredGroupRecommendation[],
    category: '冲' | '稳' | '保',
    intro?: string
  ): string {
    const categoryMap = {
      '冲': '冲一冲',
      '稳': '稳一稳',
      '保': '保一保'
    };

    let result = intro || `为您推荐以下${categoryMap[category]}院校：\n\n`;

    recommendations.forEach((rec, index) => {
      result += `**${index + 1}. ${rec.collegeName} - ${rec.groupName}**\n\n`;
      result += this.formatSingleCard(rec);
      result += '\n\n';
    });

    return result;
  }

  /**
   * 格式化完整的冲稳保推荐结果
   */
  static formatFullRecommendation(data: {
    rush: StructuredGroupRecommendation[];
    stable: StructuredGroupRecommendation[];
    safe: StructuredGroupRecommendation[];
    summary?: any;
  }): string {
    let result = '# 🎯 智能推荐结果\n\n';

    // 添加摘要
    if (data.summary) {
      result += '## 📊 推荐摘要\n\n';
      result += `- 共推荐 **${data.summary.totalCount}** 个专业组\n`;
      result += `- 冲一冲：**${data.summary.rushCount}** 个\n`;
      result += `- 稳一稳：**${data.summary.stableCount}** 个\n`;
      result += `- 保一保：**${data.summary.safeCount}** 个\n\n`;

      if (data.summary.distribution) {
        result += `院校层次分布：`;
        if (data.summary.distribution.total985 > 0) {
          result += `985高校 ${data.summary.distribution.total985} 所，`;
        }
        if (data.summary.distribution.total211 > 0) {
          result += `211高校 ${data.summary.distribution.total211} 所，`;
        }
        result += `其他本科 ${data.summary.distribution.totalOthers} 所\n\n`;
      }
    }

    // 冲一冲区间
    if (data.rush && data.rush.length > 0) {
      result += '## 🚀 冲一冲（录取概率 < 35%）\n\n';
      result += '这些院校有一定冲击机会，如果被录取会很高兴。建议挑选其中最心仪的院校填报。\n\n';

      // 只展示前3个详细卡片
      const displayCount = Math.min(3, data.rush.length);
      for (let i = 0; i < displayCount; i++) {
        const rec = data.rush[i];
        result += `### ${i + 1}. ${rec.collegeName} - ${rec.groupName}\n\n`;
        result += this.formatSingleCard(rec);
        result += '\n\n';
      }

      // 其余的以简化列表形式展示
      if (data.rush.length > displayCount) {
        result += '<details>\n<summary>查看更多冲一冲推荐（点击展开）</summary>\n\n';
        for (let i = displayCount; i < data.rush.length; i++) {
          const rec = data.rush[i];
          result += `### ${i + 1}. ${rec.collegeName} - ${rec.groupName}\n\n`;
          result += this.formatSingleCard(rec);
          result += '\n\n';
        }
        result += '</details>\n\n';
      }
    }

    // 稳一稳区间
    if (data.stable && data.stable.length > 0) {
      result += '## 🎯 稳一稳（录取概率 35-90%）\n\n';
      result += '这是最可能被录取的区间，请重点关注。每个志愿都要认真研究，确保如果被录取不会后悔。\n\n';

      // 只展示前5个详细卡片
      const displayCount = Math.min(5, data.stable.length);
      for (let i = 0; i < displayCount; i++) {
        const rec = data.stable[i];
        result += `### ${i + 1}. ${rec.collegeName} - ${rec.groupName}\n\n`;
        result += this.formatSingleCard(rec);
        result += '\n\n';
      }

      // 其余的以简化列表形式展示
      if (data.stable.length > displayCount) {
        result += '<details>\n<summary>查看更多稳一稳推荐（点击展开）</summary>\n\n';
        for (let i = displayCount; i < data.stable.length; i++) {
          const rec = data.stable[i];
          result += `### ${i + 1}. ${rec.collegeName} - ${rec.groupName}\n\n`;
          result += this.formatSingleCard(rec);
          result += '\n\n';
        }
        result += '</details>\n\n';
      }
    }

    // 保一保区间
    if (data.safe && data.safe.length > 0) {
      result += '## 🛡️ 保一保（录取概率 90-99%）\n\n';
      result += '这是保底防线，确保不会滑档。建议选择王牌专业或心仪城市的院校。\n\n';

      // 全部展示保一保推荐
      data.safe.forEach((rec, index) => {
        result += `### ${index + 1}. ${rec.collegeName} - ${rec.groupName}\n\n`;
        result += this.formatSingleCard(rec);
        result += '\n\n';
      });
    }

    // 添加友情提示
    result += '---\n\n';
    result += '💡 **友情提示**\n\n';
    result += '- 点击任意卡片可查看更多详情\n';
    result += '- 您可以一键将喜欢的专业组加入志愿表\n';
    result += '- 如有疑问，可以继续询问我关于这些院校的问题\n';
    result += '- 记住：真正会对你负责的，只有你自己。请认真研究每个志愿！\n\n';

    return result;
  }

  /**
   * 生成预定义问题模板
   */
  static generateFollowUpQuestions(recommendation: StructuredGroupRecommendation): string[] {
    return [
      `告诉我更多关于${recommendation.collegeName}的信息`,
      `${recommendation.groupName}的专业就业前景如何？`,
      `${recommendation.collegeName}的校园环境和生活条件怎么样？`,
      `这个专业组有哪些热门专业？`,
      `为什么这个专业组录取概率是${recommendation.probability}%？`,
      `${recommendation.collegeName}在全国的排名如何？`
    ];
  }

  /**
   * 检测内容中是否包含推荐卡片
   */
  static hasRecommendationCard(content: string): boolean {
    return content.includes('```recommendation-card');
  }
}
