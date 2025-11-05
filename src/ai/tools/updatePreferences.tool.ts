import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { PreferenceService } from '../../services/agent/preference.service';

/**
 * 更新用户偏好指标工具
 *
 * 核心功能：AI在对话中收集到用户偏好后，调用此工具保存到数据库
 * 这是项目的灵魂功能 - 通过收集30个核心数据点构建用户画像
 */
export class UpdatePreferencesTool extends Tool {
  name = 'update_user_preferences';
  description = `更新用户偏好指标数据。当你从对话中了解到用户的偏好、意向、特征等信息时，必须调用此工具保存。

核心任务：收集30个核心数据点
- CORE_01~CORE_03: 决策维度权重（院校/专业/城市、就业/深造、兴趣/前景）
- CORE_04~CORE_08: 性格与思维模式
- CORE_09~CORE_13: 专业意向
- CORE_14~CORE_18: 院校偏好
- CORE_19~CORE_23: 地域偏好
- CORE_24~CORE_28: 经济与家庭因素
- CORE_29~CORE_30: 特殊需求

使用场景：
1. 用户明确表达："我更看重学校名气" → 更新 CORE_01（院校权重↑）
2. 用户说："我想学计算机" → 更新 CORE_09（意向专业）
3. 推理得出："用户多次提到大城市" → 更新 CORE_19（城市偏好）
4. 提问后获得："打算考研" → 更新 CORE_02（深造权重↑）

重要：每收集到1-3个指标，立即调用此工具保存！`;

  parameters: Record<string, ToolParameter> = {
    indicators: {
      type: 'array',
      description: `要更新的指标数组，每个对象包含：
- indicatorId: 指标ID（如 "CORE_01"）
- value: 指标值（根据指标类型，可以是数字、字符串、对象、数组）
- confidence: 置信度 0.0-1.0（明确表达=1.0，推理=0.6-0.8，猜测=0.3-0.5）
- extractionMethod: 提取方式（"direct_question"|"inference"|"user_statement"|"system_default"）
- extractionContext: 提取时的上下文（可选，记录用户原话）`,
      required: true
    }
  };

  private preferenceService = new PreferenceService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const userId = this.getUserId(context);
      const sessionId = context?.sessionId;

      // 必须有有效的sessionId才能保存偏好
      if (!sessionId || sessionId === 'default') {
        console.warn('⚠️ [UpdatePreferences] 无有效sessionId，跳过偏好保存');
        return {
          success: true,
          data: {
            message: '当前无活跃会话，偏好数据暂未保存。请开始新会话后再试。',
            skipped: true
          },
          metadata: {
            description: '需要活跃会话才能保存偏好数据'
          }
        };
      }

      const indicators = params.indicators as Array<{
        indicatorId: string;
        value: any;
        confidence: number;
        extractionMethod: 'direct_question' | 'inference' | 'user_statement' | 'system_default';
        extractionContext?: string;
      }>;

      if (!Array.isArray(indicators) || indicators.length === 0) {
        return {
          success: false,
          error: '请提供至少一个指标更新'
        };
      }

      // 验证和更新指标
      const updates = indicators.map(ind => ({
        indicatorId: ind.indicatorId,
        value: ind.value,
        confidence: ind.confidence || 0.8,
        extractionMethod: ind.extractionMethod || 'user_statement',
        sourceMessageId: undefined, // context中没有messageId字段
        extractionContext: ind.extractionContext
      }));

      // 批量更新
      const savedPreferences = await this.preferenceService.batchUpdatePreferences(
        sessionId,
        userId,
        updates
      );

      // 获取当前收集进度
      const coreCount = await this.preferenceService.getCorePreferencesCount(sessionId);
      const secondaryCount = await this.preferenceService.getSecondaryPreferencesCount(sessionId);

      console.log(`✅ [UpdatePreferences] 已更新 ${savedPreferences.length} 个指标`);
      console.log(`   核心指标: ${coreCount}/30 (${Math.round(coreCount / 30 * 100)}%)`);
      console.log(`   次要指标: ${secondaryCount}/70`);

      return {
        success: true,
        data: {
          updated: savedPreferences.length,
          indicators: savedPreferences.map(p => ({
            indicatorId: p.indicatorId,
            name: p.indicatorName,
            value: p.value,
            version: p.version
          })),
          progress: {
            coreIndicators: coreCount,
            totalCore: 30,
            corePercentage: Math.round(coreCount / 30 * 100),
            secondaryIndicators: secondaryCount,
            totalSecondary: 70
          },
          message: `已保存 ${savedPreferences.length} 个用户偏好指标。核心指标收集进度: ${coreCount}/30 (${Math.round(coreCount / 30 * 100)}%)`
        },
        metadata: {
          dataSource: 'agent_preferences',
          description: '用户偏好指标已更新',
          indicatorIds: savedPreferences.map(p => p.indicatorId)
        }
      };
    } catch (error: any) {
      console.error('❌ [UpdatePreferences] 更新失败:', error);
      return {
        success: false,
        error: `更新用户偏好失败: ${error.message}`
      };
    }
  }
}

/**
 * 获取用户偏好收集进度工具
 */
export class GetPreferencesProgressTool extends Tool {
  name = 'get_preferences_progress';
  description = '获取用户偏好指标的收集进度，查看已收集了哪些核心数据点，还缺少哪些。用于规划下一步应该收集哪些信息。';

  parameters: Record<string, ToolParameter> = {};

  private preferenceService = new PreferenceService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const userId = this.getUserId(context);
      const sessionId = context?.sessionId;

      // 必须有有效的sessionId
      if (!sessionId || sessionId === 'default') {
        return {
          success: true,
          data: {
            summary: {
              coreIndicators: 0,
              totalCore: 30,
              corePercentage: 0,
              secondaryIndicators: 0,
              totalSecondary: 70,
              totalCollected: 0
            },
            message: '当前无活跃会话，无法查询偏好数据'
          }
        };
      }

      // 获取所有已收集的偏好
      const preferences = await this.preferenceService.getSessionPreferences(sessionId);

      // 按分类分组
      const grouped = await this.preferenceService.getPreferencesByCategory(sessionId);

      // 统计
      const coreCount = await this.preferenceService.getCorePreferencesCount(sessionId);
      const secondaryCount = await this.preferenceService.getSecondaryPreferencesCount(sessionId);

      // 列出已收集的核心指标ID
      const collectedCoreIds = preferences
        .filter(p => p.indicatorType === 'core')
        .map(p => p.indicatorId);

      // 计算缺失的核心指标（假设CORE_01到CORE_30）
      const allCoreIds = Array.from({ length: 30 }, (_, i) => `CORE_${String(i + 1).padStart(2, '0')}`);
      const missingCoreIds = allCoreIds.filter(id => !collectedCoreIds.includes(id));

      return {
        success: true,
        data: {
          summary: {
            coreIndicators: coreCount,
            totalCore: 30,
            corePercentage: Math.round(coreCount / 30 * 100),
            secondaryIndicators: secondaryCount,
            totalSecondary: 70,
            totalCollected: coreCount + secondaryCount
          },
          collectedCoreIndicators: collectedCoreIds,
          missingCoreIndicators: missingCoreIds.slice(0, 10), // 只返回前10个缺失的
          preferencesByCategory: Object.keys(grouped).map(category => ({
            category,
            count: grouped[category].length,
            indicators: grouped[category].map(p => ({
              id: p.indicatorId,
              name: p.indicatorName,
              value: p.value,
              confidence: p.confidence
            }))
          })),
          nextSuggestedIndicators: missingCoreIds.slice(0, 3) // 建议接下来收集的3个指标
        },
        metadata: {
          dataSource: 'agent_preferences',
          description: '用户偏好收集进度'
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
