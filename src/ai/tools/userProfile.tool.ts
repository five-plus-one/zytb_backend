import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { UserProfileManager } from '../userProfile.manager';
import { ConversationContextManager } from '../utils/conversationContext.manager';

/**
 * 设置用户基本信息工具
 */
export class SetUserProfileTool extends Tool {
  name = 'set_user_profile';
  description = '设置用户基本信息：保存用户的年份、省份、科类、分数、位次等信息，之后其他工具可以自动使用这些信息，无需重复传递。适用场景："我是2025年江苏物理类考生，分数600分，位次5000""我的分数是620分"';

  parameters: Record<string, ToolParameter> = {
    year: {
      type: 'number',
      description: '年份',
      required: false
    },
    province: {
      type: 'string',
      description: '省份',
      required: false
    },
    subjectType: {
      type: 'string',
      description: '科类：物理类、历史类',
      required: false
    },
    score: {
      type: 'number',
      description: '高考分数',
      required: false
    },
    rank: {
      type: 'number',
      description: '省内位次',
      required: false
    }
  };

  private profileManager = UserProfileManager.getInstance();
  private contextManager = ConversationContextManager.getInstance();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const userId = this.getUserId(context);
      const sessionId = context?.sessionId || 'default';

      // 更新用户配置 (UserProfileManager - 使用 userId 作为 key)
      const profile = this.profileManager.updateProfile(userId, {
        year: params.year,
        province: params.province,
        subjectType: params.subjectType,
        score: params.score,
        rank: params.rank
      });

      // 同时更新 ConversationContextManager (使用 sessionId 作为 key)
      // 这样 smart_recommendation 工具就能读取到数据
      this.contextManager.updateUserProfile(sessionId, {
        score: params.score,
        rank: params.rank,
        province: params.province,
        category: params.subjectType,
        year: params.year,
        preferences: {}
      });

      console.log(`✅ 用户信息已同步到两个管理器:`);
      console.log(`   - UserProfileManager [userId=${userId}]`);
      console.log(`   - ConversationContextManager [sessionId=${sessionId}]`);

      return {
        success: true,
        data: {
          profile: {
            year: profile.year,
            province: profile.province,
            subjectType: profile.subjectType,
            score: profile.score,
            rank: profile.rank
          },
          message: '用户信息已保存，后续查询将自动使用这些信息'
        },
        metadata: {
          dataSource: 'user_profile_cache',
          description: '已保存用户基本信息'
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
 * 获取用户基本信息工具
 */
export class GetUserProfileTool extends Tool {
  name = 'get_user_profile';
  description = '获取用户基本信息：查看用户之前保存的年份、省份、科类、分数、位次等信息。适用场景："我的信息是什么？""我刚才说的分数是多少？"';

  parameters: Record<string, ToolParameter> = {};

  private profileManager = UserProfileManager.getInstance();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const userId = this.getUserId(context);

      const profile = this.profileManager.getProfile(userId);

      if (!profile) {
        return {
          success: false,
          error: '您还没有保存基本信息，请先告诉我您的年份、省份、科类、分数、位次',
          data: {
            hasProfile: false
          }
        };
      }

      return {
        success: true,
        data: {
          profile: {
            year: profile.year,
            province: profile.province,
            subjectType: profile.subjectType,
            score: profile.score,
            rank: profile.rank
          },
          hasProfile: true
        },
        metadata: {
          dataSource: 'user_profile_cache',
          description: '用户基本信息'
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
