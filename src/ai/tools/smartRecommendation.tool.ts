import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { SmartRecommendationService } from '../../services/smartRecommendation.service';
import { ConversationContextManager } from '../utils/conversationContext.manager';
import { UserPreferences } from '../../interfaces/recommendation.interface';

/**
 * 智能推荐工具
 *
 * 🎯 核心功能：一键获取冲稳保三个区间的专业组推荐
 *
 * ✅ 工具已完成：
 * - 录取概率计算（基于数学模型，实时计算）
 * - 冲稳保自动分类
 * - 智能排序（综合院校层级、专业契合度、地理位置等）
 * - 调剂风险评估
 * - 推荐理由生成
 *
 * ❌ AI不需要做：
 * - 自己计算概率
 * - 判断冲稳保
 * - 用 query_college_stats 查询院校分数
 * - 重复调用多次
 *
 * 💡 使用方法：
 * 1. 调用此工具（一次即可）
 * 2. 格式化呈现结果
 * 3. 回答用户追问
 */
export class SmartRecommendationTool extends Tool {
  name = 'smart_recommendation';

  description = `
智能推荐专业组工具：根据用户分数、位次和偏好，一键获取冲稳保三个区间的专业组推荐。

🎯 核心特点：
- 一次调用返回40个精选专业组（冲12 + 稳20 + 保8）
- 每个专业组包含：录取概率、冲稳保分类、调剂风险、推荐理由
- 基于数学模型实时计算，个性化精准

✅ 适用场景：
- "我想学计算机方向"
- "帮我推荐院校"
- "有哪些稳的学校？"
- "江苏省内有哪些985？"

❌ 不适用场景：
- 查询单个院校详情（使用 query_college_stats）
- 查询具体专业信息（使用 query_major_info）

⚠️ 重要提示：
- 此工具会自动从上下文中读取用户分数、位次、省份等信息
- 如果用户未提供分数/位次，会返回错误提示
- 推荐结果已按质量排序，无需AI再次排序
`;

  parameters: Record<string, ToolParameter> = {
    preferences: {
      type: 'object',
      description: '用户偏好配置（可选）',
      required: false,
      properties: {
        majors: {
          type: 'array',
          description: '专业偏好列表，如 ["计算机科学与技术", "软件工程"]',
          items: { type: 'string', description: '专业名称' }
        },
        majorCategories: {
          type: 'array',
          description: '专业大类列表，如 ["计算机类", "电子信息类"]',
          items: { type: 'string', description: '专业大类名称' }
        },
        locations: {
          type: 'array',
          description: '地区偏好列表，如 ["江苏", "上海", "北京"]',
          items: { type: 'string', description: '省份名称' }
        },
        collegeTypes: {
          type: 'array',
          description: '院校类型，如 ["985", "211"]',
          items: { type: 'string', description: '院校类型标签' }
        },
        maxTuition: {
          type: 'number',
          description: '最高学费（元/年），如 50000'
        },
        acceptCooperation: {
          type: 'boolean',
          description: '是否接受中外合作办学，默认 true'
        },
        rushCount: {
          type: 'number',
          description: '冲区间数量，默认 12'
        },
        stableCount: {
          type: 'number',
          description: '稳区间数量，默认 20'
        },
        safeCount: {
          type: 'number',
          description: '保区间数量，默认 8'
        }
      }
    }
  };

  private recommendationService = new SmartRecommendationService();
  private contextManager = ConversationContextManager.getInstance();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const sessionId = context?.sessionId || 'default';

      // ===== 第一步：获取用户档案 =====
      const userProfile = this.contextManager.getUserProfile(sessionId);

      if (!userProfile) {
        return {
          success: false,
          error: '缺少用户基本信息。请先告诉我您的分数、位次、省份等信息。'
        };
      }

      // 校验必需字段
      if (!userProfile.score || !userProfile.rank || !userProfile.province || !userProfile.category) {
        return {
          success: false,
          error: `用户信息不完整：
- 分数：${userProfile.score || '未知'}
- 位次：${userProfile.rank || '未知'}
- 省份：${userProfile.province || '未知'}
- 科类：${userProfile.category || '未知'}

请提供完整信息后重试。`
        };
      }

      // ===== 第二步：合并偏好（参数 + 上下文）=====
      const preferences: UserPreferences = {
        ...userProfile.preferences,
        ...params.preferences
      };

      // 如果用户在参数中提供了偏好，更新到上下文
      if (params.preferences) {
        this.contextManager.updateUserProfile(sessionId, {
          preferences: {
            ...userProfile.preferences,
            ...params.preferences
          }
        });
      }

      console.log(`[SmartRecommendationTool] 用户档案:`, {
        score: userProfile.score,
        rank: userProfile.rank,
        province: userProfile.province,
        category: userProfile.category,
        year: userProfile.year
      });
      console.log(`[SmartRecommendationTool] 应用偏好:`, preferences);

      // ===== 第三步：调用推荐服务 =====
      const result = await this.recommendationService.getSmartRecommendations(
        {
          score: userProfile.score,
          rank: userProfile.rank,
          province: userProfile.province,
          category: userProfile.category,
          year: userProfile.year || new Date().getFullYear()
        },
        preferences
      );

      // ===== 第四步：返回结果 =====
      return {
        success: true,
        data: {
          // 推荐结果（完整的 StructuredGroupRecommendation 格式）
          rush: result.rush.map(g => this.formatGroup(g, userProfile)),
          stable: result.stable.map(g => this.formatGroup(g, userProfile)),
          safe: result.safe.map(g => this.formatGroup(g, userProfile)),

          // 统计信息
          summary: result.summary,

          // 用户信息（供AI参考）
          userProfile: result.userProfile,

          // 应用的偏好（供AI参考）
          appliedPreferences: result.appliedPreferences
        },
        metadata: {
          dataSource: 'enrollment_plans + admission_scores (实时计算)',
          calculationMethod: '基于数学模型实时计算录取概率',
          factorsConsidered: [
            '历年分数差',
            '位次排名',
            '分数波动性',
            '招生计划变化',
            '专业热度',
            '院校层级',
            '地理位置'
          ],
          description: `为用户推荐了${result.summary.totalCount}个专业组（冲${result.summary.rushCount} + 稳${result.summary.stableCount} + 保${result.summary.safeCount}）`,
          outputFormat: 'StructuredGroupRecommendation - 可直接转换为前端推荐卡片'
        }
      };

    } catch (error: any) {
      console.error('[SmartRecommendationTool] 错误:', error);
      return {
        success: false,
        error: `推荐失败: ${error.message}`
      };
    }
  }

  /**
   * 格式化专业组为完整的 StructuredGroupRecommendation 格式
   */
  private formatGroup(group: any, userProfile: any) {
    // 计算历年平均值
    const historicalScores = group.historicalScores || [];
    const avgMinScore = historicalScores.length > 0
      ? historicalScores.reduce((sum: number, hs: any) => sum + hs.minScore, 0) / historicalScores.length
      : 0;
    const avgMinRank = historicalScores.length > 0 && historicalScores[0].minRank
      ? historicalScores.reduce((sum: number, hs: any) => sum + (hs.minRank || 0), 0) / historicalScores.length
      : 0;

    // 计算分数波动性（标准差）
    const scoreVolatility = group.scoreVolatility || this.calculateVolatility(historicalScores);

    // 分析分数趋势
    const scoreTrend = this.analyzeScoreTrend(historicalScores);

    // 格式化专业列表
    const majors = (group.majors || []).map((m: any) => ({
      majorId: m.majorCode || m.majorName,
      majorName: m.majorName,
      majorCode: m.majorCode,
      planCount: m.planCount,
      tuition: m.tuition,
      duration: m.studyYears ? `${m.studyYears}年` : undefined,
      degree: undefined, // EnrollmentPlan 中没有学位字段
      studyLocation: undefined,
      remarks: m.remarks
    }));

    // 计算总招生计划数
    const totalPlanCount = majors.reduce((sum: number, m: any) => sum + (m.planCount || 0), 0);

    // 生成警告信息
    const warnings = this.generateWarnings(group, scoreVolatility);

    // 生成亮点标签
    const highlights = this.generateHighlights(group);

    // 计算排序分数（用于内部排序）
    const rankScore = this.calculateRankScore(group);

    return {
      // 基本信息
      groupId: `${group.collegeCode}_${group.groupCode}`,
      collegeName: group.collegeName,
      collegeCode: group.collegeCode,
      collegeProvince: group.collegeProvince,
      groupName: group.groupName || '普通类专业组',
      groupCode: group.groupCode || '',

      // 院校标签
      is985: group.is985 || false,
      is211: group.is211 || false,
      isDoubleFirstClass: group.isDoubleFirstClass || false,
      collegeType: undefined, // EnrollmentPlan 中没有此字段
      collegeLevel: undefined,

      // 冲稳保分类
      riskLevel: group.riskLevel,
      probability: Math.round(group.probability * 100) / 100, // 保留2位小数
      confidence: Math.round(group.confidence * 100) / 100,
      adjustmentRisk: group.adjustmentRisk,

      // 分数分析
      scoreGap: Math.round(group.scoreGap * 100) / 100,
      rankGap: group.rankGap ? Math.round(group.rankGap) : null,
      userScore: userProfile.score,
      userRank: userProfile.rank,
      avgMinScore: Math.round(avgMinScore * 100) / 100,
      avgMinRank: Math.round(avgMinRank),

      // 历年数据
      historicalData: historicalScores.map((hs: any) => ({
        year: hs.year,
        minScore: hs.minScore,
        avgScore: hs.avgScore,
        maxScore: hs.maxScore,
        minRank: hs.minRank,
        maxRank: hs.maxRank,
        planCount: hs.planCount,
        actualAdmitted: hs.actualAdmitted
      })),
      scoreVolatility: Math.round(scoreVolatility * 100) / 100,
      scoreTrend,

      // 专业信息
      majors,
      totalMajors: majors.length,
      totalPlanCount,

      // 推荐理由
      recommendReasons: group.recommendReasons || [],
      warnings,
      highlights,

      // 排序权重
      rankScore: Math.round(rankScore * 100) / 100
    };
  }

  /**
   * 计算分数波动性
   */
  private calculateVolatility(historicalScores: any[]): number {
    if (historicalScores.length < 2) return 0;

    const scores = historicalScores.map(hs => hs.minScore);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  /**
   * 分析分数趋势
   */
  private analyzeScoreTrend(historicalScores: any[]): 'up' | 'down' | 'stable' {
    if (historicalScores.length < 2) return 'stable';

    // 按年份排序（从旧到新）
    const sorted = [...historicalScores].sort((a, b) => a.year - b.year);
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg = firstHalf.reduce((sum, hs) => sum + hs.minScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, hs) => sum + hs.minScore, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(group: any, scoreVolatility: number): string[] {
    const warnings: string[] = [];

    // 分数波动大
    if (scoreVolatility > 10) {
      warnings.push(`近年录取分数波动较大（±${Math.round(scoreVolatility)}分），存在不确定性`);
    }

    // 专业数量少
    if (group.majors && group.majors.length <= 2) {
      warnings.push(`该专业组仅${group.majors.length}个专业，调剂余地较小`);
    }

    // 调剂风险高
    if (group.adjustmentRisk === '高') {
      warnings.push('该专业组调剂风险较高，建议谨慎填报');
    }

    // 录取概率低但在冲区间
    if (group.riskLevel === '冲' && group.probability < 20) {
      warnings.push('录取概率较低，建议作为冲一冲志愿，不要抱太大期望');
    }

    return warnings;
  }

  /**
   * 生成亮点标签
   */
  private generateHighlights(group: any): string[] {
    const highlights: string[] = [];

    if (group.is985) highlights.push('985工程');
    if (group.is211) highlights.push('211工程');
    if (group.isDoubleFirstClass) highlights.push('双一流');

    // 根据省份添加地域标签
    const tier1Cities = ['北京', '上海', '广东', '深圳'];
    if (tier1Cities.includes(group.collegeProvince)) {
      highlights.push('一线城市');
    }

    // 专业数量多
    if (group.majors && group.majors.length >= 10) {
      highlights.push('专业选择多');
    }

    // 招生计划数多
    const totalPlan = (group.majors || []).reduce((sum: number, m: any) => sum + (m.planCount || 0), 0);
    if (totalPlan >= 50) {
      highlights.push('招生规模大');
    }

    return highlights;
  }

  /**
   * 计算排序分数
   */
  private calculateRankScore(group: any): number {
    let score = 0;

    // 录取概率权重（40%）
    score += group.probability * 0.4;

    // 院校层级权重（30%）
    if (group.is985) score += 30;
    else if (group.is211) score += 20;
    else if (group.isDoubleFirstClass) score += 10;

    // 置信度权重（20%）
    score += group.confidence * 0.2;

    // 专业数量权重（10%）
    const majorCount = group.majors ? group.majors.length : 0;
    score += Math.min(majorCount / 10, 1) * 10;

    return score;
  }
}
