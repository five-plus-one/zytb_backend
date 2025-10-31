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
          // 推荐结果
          rush: result.rush.map(g => this.formatGroup(g)),
          stable: result.stable.map(g => this.formatGroup(g)),
          safe: result.safe.map(g => this.formatGroup(g)),

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
          description: `为用户推荐了${result.summary.totalCount}个专业组（冲${result.summary.rushCount} + 稳${result.summary.stableCount} + 保${result.summary.safeCount}）`
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
   * 格式化专业组（简化输出，避免数据过大）
   */
  private formatGroup(group: any) {
    return {
      // 基本信息
      collegeCode: group.collegeCode,
      collegeName: group.collegeName,
      collegeProvince: group.collegeProvince,
      collegeCity: group.collegeCity,
      is985: group.is985,
      is211: group.is211,
      isDoubleFirstClass: group.isDoubleFirstClass,

      groupCode: group.groupCode,
      groupName: group.groupName,
      subjectRequirements: group.subjectRequirements,

      // 专业列表（只返回前5个，避免数据过大）
      majors: group.majors.slice(0, 5).map((m: any) => ({
        majorName: m.majorName,
        planCount: m.planCount,
        tuition: m.tuition
      })),
      totalMajors: group.totalMajors,
      totalPlanCount: group.totalPlanCount,
      hasMoreMajors: group.majors.length > 5,

      // 录取分析
      probability: group.probability,
      riskLevel: group.riskLevel,
      adjustmentRisk: group.adjustmentRisk,
      confidence: group.confidence,

      // 分数差距
      scoreGap: group.scoreGap,
      rankGap: group.rankGap,

      // 历史数据（返回完整历年数据 - 用于展示历史趋势）
      historicalScores: group.historicalScores.map((hs: any) => ({
        year: hs.year,
        minScore: hs.minScore,
        avgScore: hs.avgScore,
        maxScore: hs.maxScore,
        minRank: hs.minRank,
        maxRank: hs.maxRank,
        planCount: hs.planCount
      })),

      // 推荐理由
      recommendReasons: group.recommendReasons
    };
  }
}
