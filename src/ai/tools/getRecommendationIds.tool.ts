import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { SmartRecommendationService } from '../../services/smartRecommendation.service';
import { ConversationContextManager } from '../utils/conversationContext.manager';
import { UserPreferences } from '../../interfaces/recommendation.interface';

/**
 * 轻量级智能推荐工具（仅返回ID列表）
 *
 * 🎯 核心功能：
 * - 调用智能推荐服务获取推荐
 * - 只返回专业组ID列表（不返回详细数据）
 * - 后端会自动获取卡片数据并推送给前端
 *
 * ✅ 优势：
 * - 大幅降低Token消耗（从20k降至500 tokens）
 * - 更快的响应速度
 * - 数据获取与AI推理分离
 *
 * 💡 使用方法：
 * 1. AI调用此工具获取推荐ID
 * 2. 系统自动获取卡片数据
 * 3. AI向用户说明推荐概况
 * 4. 卡片数据自动推送给前端
 */
export class GetRecommendationIdsTool extends Tool {
  name = 'get_recommendation_ids';

  description = `
智能推荐工具（轻量版）：根据用户分数、位次和偏好，获取推荐的专业组ID列表。

🎯 核心特点：
- 一次调用返回完整的推荐ID列表（冲12 + 稳20 + 保8）
- 只返回ID和摘要信息，不返回详细数据
- 系统会自动获取并推送卡片数据给前端
- AI只需向用户说明推荐概况即可

✅ 适用场景：
- "我想学计算机专业"
- "帮我推荐院校"
- "有哪些稳的学校？"
- "江苏省内有哪些985？"

⚠️ 重要提示：
- 此工具会自动从上下文中读取用户分数、位次、省份等信息
- 如果用户未提供分数/位次，会返回错误提示
- 卡片详细数据会在AI回复完成后自动推送
- AI无需处理详细数据，只需说明推荐概况

📝 AI应该如何使用此工具的返回结果：
1. 查看 summary 了解推荐总数和分类
2. 向用户说明推荐的总体情况（如：找到了40个推荐，包括哪些层次的院校）
3. 可以提及一些代表性院校（从返回的简要信息中）
4. 告诉用户详细卡片正在加载中
5. 不要尝试描述每个推荐的详细信息（数据未返回）
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

      // ===== 第二步：合并偏好 =====
      const preferences: UserPreferences = {
        ...userProfile.preferences,
        ...params.preferences
      };

      // 更新上下文中的偏好
      if (params.preferences) {
        this.contextManager.updateUserProfile(sessionId, {
          preferences: {
            ...userProfile.preferences,
            ...params.preferences
          }
        });
      }

      console.log(`[GetRecommendationIdsTool] 用户档案:`, {
        score: userProfile.score,
        rank: userProfile.rank,
        province: userProfile.province,
        category: userProfile.category,
        year: userProfile.year
      });
      console.log(`[GetRecommendationIdsTool] 应用偏好:`, preferences);

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

      // ===== 第四步：提取ID列表和简要信息 =====
      const recommendationIds = {
        rush: result.rush.map(g => `${g.collegeCode}_${g.groupCode}`),
        stable: result.stable.map(g => `${g.collegeCode}_${g.groupCode}`),
        safe: result.safe.map(g => `${g.collegeCode}_${g.groupCode}`)
      };

      // 提取每个分类的院校名称列表（供AI参考）
      const collegeNames = {
        rush: result.rush.map(g => ({
          name: g.collegeName,
          is985: g.is985,
          is211: g.is211,
          province: g.collegeProvince
        })),
        stable: result.stable.map(g => ({
          name: g.collegeName,
          is985: g.is985,
          is211: g.is211,
          province: g.collegeProvince
        })),
        safe: result.safe.map(g => ({
          name: g.collegeName,
          is985: g.is985,
          is211: g.is211,
          province: g.collegeProvince
        }))
      };

      // ===== 第五步：返回结果 =====
      return {
        success: true,
        data: {
          // 推荐ID列表（核心数据）
          recommendationIds,

          // 院校名称列表（供AI向用户说明）
          collegeNames,

          // 统计摘要
          summary: {
            totalCount: result.summary.totalCount,
            rushCount: result.summary.rushCount,
            stableCount: result.summary.stableCount,
            safeCount: result.summary.safeCount,
            distribution: result.summary.distribution
          },

          // 用户信息
          userProfile: {
            score: userProfile.score,
            rank: userProfile.rank,
            province: userProfile.province,
            category: userProfile.category,
            year: userProfile.year || new Date().getFullYear()
          },

          // 应用的偏好
          appliedPreferences: preferences
        },
        metadata: {
          cardDataPending: true, // 标记卡片数据待获取
          dataSource: 'enrollment_plans + admission_scores',
          calculationMethod: '基于数学模型实时计算录取概率',
          description: `已生成${result.summary.totalCount}个推荐ID（冲${result.summary.rushCount} + 稳${result.summary.stableCount} + 保${result.summary.safeCount}），卡片数据将自动推送给前端`,
          hint: 'AI应向用户说明推荐概况，卡片详细数据会自动加载'
        }
      };

    } catch (error: any) {
      console.error('[GetRecommendationIdsTool] 错误:', error);
      return {
        success: false,
        error: `推荐失败: ${error.message}`
      };
    }
  }
}
