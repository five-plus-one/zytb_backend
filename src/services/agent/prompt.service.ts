import { LLMMessage } from '../../utils/llm-client';
import { AgentPreference } from '../../models/AgentPreference';
import {
  getCoreIndicators,
  getIndicatorById,
  IndicatorDefinition
} from '../../config/indicators';

/**
 * 提示词工程服务
 * 负责构建系统提示词、用户上下文和指标提取
 */

export interface ConversationContext {
  sessionId: string;
  userId: string;
  province: string;
  examScore: number;
  subjectType: string;
  stage: string;
  collectedCoreCount: number;
  collectedSecondaryCount: number;
  collectedPreferences: AgentPreference[];
}

export class PromptService {
  /**
   * 构建系统提示词
   */
  buildSystemPrompt(context: ConversationContext): string {
    const coreIndicators = getCoreIndicators();
    const remainingCore = coreIndicators.filter(ind =>
      !context.collectedPreferences.find(p => p.indicatorId === ind.id)
    );

    const progress = `${context.collectedCoreCount}/30`;
    const nextIndicators = remainingCore.slice(0, 3).map(ind => ind.name).join('、');

    return `# 角色定位
你是一位专业、亲切的高考志愿填报AI顾问,名叫"小志"。你的任务是通过自然对话,深入了解学生的真实想法和偏好,帮助他们找到最适合的大学和专业。

# 核心任务
1. **收集30个核心偏好指标** - 目前进度: ${progress}
2. **通过自然对话提取信息** - 既要提问,也要从学生的话语中揣测
3. **避免问卷式提问** - 让对话自然流畅,不要让学生感觉在填表
4. **及时记录和更新偏好** - 每次对话都可能包含多个指标信息

# 学生基本信息
- 省份: ${context.province}
- 高考分数: ${context.examScore}分
- 科目类型: ${context.subjectType}

# 当前阶段
${this.getStageDescription(context.stage)}

# 接下来需要了解的指标
${nextIndicators}

# 对话策略
1. **开放式引导** - 用开放式问题引导学生分享想法
   - ✅ "你对未来有什么规划?"
   - ✅ "假如有两个选择,一个是名校一般专业,一个是双非强专业,你会怎么选?"
   - ❌ "你的院校权重是多少?" (太直接)

2. **主动揣测** - 从学生的措辞、语气中推断隐含信息
   - 学生说"不想离家太远" → 推断 distance_from_home: '省内'或'邻省'
   - 学生说"想学计算机,以后进大厂" → 推断 target_majors + target_industry + career_goal

3. **逐步深入** - 不要一次问太多,每次对话覆盖2-3个指标即可
   - 先聊大方向(地域、专业、职业)
   - 再聊决策逻辑(院校vs专业vs城市的权重)
   - 最后聊细节(生活、成本、风险偏好)

4. **自然过渡** - 根据学生的回答灵活调整话题
   - 如果学生提到薪资 → 可以顺势问就业规划
   - 如果学生提到读研 → 可以问保研率、学术氛围
   - 如果学生提到城市 → 可以问生活成本、离家距离

5. **保持友好专业** - 像朋友聊天一样,但要体现专业性
   - 用"你"而不是"您"
   - 适当使用emoji(但不要过多)
   - 给予鼓励和肯定

# 响应格式要求
你的响应必须是合法的JSON格式,包含以下字段:

\`\`\`json
{
  "message": "给学生的回复文本(自然对话语言)",
  "extractedPreferences": [
    {
      "indicatorId": "CORE_01",
      "indicatorName": "院校-专业-城市权重分配",
      "value": {"college": 40, "major": 40, "city": 20},
      "confidence": 0.8,
      "extractionMethod": "inference",
      "context": "学生说'专业和学校都很重要,但城市无所谓',据此推断权重"
    }
  ],
  "internalThoughts": "内部分析(不显示给用户): 学生表现出对专业的明确倾向..."
}
\`\`\`

# 重要提示
- **每次响应都要尝试提取1-3个指标**,即使学生没有明确说,也要根据上下文推断
- **置信度 confidence**: 0-1之间,直接提问且明确回答为0.9-1.0,推断为0.5-0.8
- **提取方式 extractionMethod**:
  - "direct_question": 直接提问得到的答案
  - "inference": 从语气、措辞中推断
  - "user_statement": 用户主动陈述
- **提取上下文 context**: 简要说明为什么这样提取,方便后续审核

# 已收集的偏好信息
${this.formatCollectedPreferences(context.collectedPreferences)}

现在,请与学生进行自然、友好的对话,同时高效地收集他们的偏好信息!`;
  }

  /**
   * 构建用户消息上下文
   */
  buildUserMessage(
    userInput: string,
    context: ConversationContext
  ): string {
    // 用户的原始输入
    return userInput;
  }

  /**
   * 构建对话历史
   */
  buildConversationHistory(
    messages: Array<{ role: string; content: string }>,
    maxHistory: number = 10
  ): LLMMessage[] {
    // 只保留最近的N条消息,避免context过长
    const recentMessages = messages.slice(-maxHistory);

    return recentMessages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));
  }

  /**
   * 构建指标提取提示词
   */
  buildExtractionPrompt(
    conversation: string,
    targetIndicators: string[]
  ): string {
    const indicators = targetIndicators
      .map(id => getIndicatorById(id))
      .filter(Boolean) as IndicatorDefinition[];

    const indicatorDescriptions = indicators.map(ind =>
      `- ${ind.id} (${ind.name}): ${ind.description}\n  可能的值: ${this.describeValueType(ind)}`
    ).join('\n');

    return `请从以下对话中提取用户的偏好指标:

对话内容:
${conversation}

需要提取的指标:
${indicatorDescriptions}

请以JSON格式返回提取结果:
\`\`\`json
{
  "extracted": [
    {
      "indicatorId": "CORE_XX",
      "value": ...,
      "confidence": 0.8,
      "reason": "提取理由"
    }
  ]
}
\`\`\``;
  }

  /**
   * 解析LLM的结构化响应
   */
  parseLLMResponse(response: string): {
    message: string;
    extractedPreferences: any[];
    internalThoughts?: string;
  } | null {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果整个响应就是JSON
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse LLM response:', response);

      // 如果解析失败,尝试至少提取message
      return {
        message: response,
        extractedPreferences: []
      };
    }
  }

  /**
   * 构建推荐生成提示词
   */
  buildRecommendationPrompt(
    preferences: AgentPreference[],
    recommendations: any[]
  ): string {
    return `基于用户的偏好,我已经生成了${recommendations.length}个志愿推荐。

请用自然、友好的语言向用户介绍这些推荐结果:
1. 总体概述(推荐了多少个,分为冲稳保)
2. 重点推荐2-3所最匹配的院校
3. 询问用户的想法和反馈

要求:
- 语言要亲切、自然
- 突出推荐理由
- 提示风险点(如果有)
- 鼓励用户提出问题

推荐结果:
${JSON.stringify(recommendations.slice(0, 10), null, 2)}`;
  }

  // ========== 辅助方法 ==========

  private getStageDescription(stage: string): string {
    const stages: Record<string, string> = {
      'init': '🌟 初始阶段 - 刚开始对话,建立信任',
      'core_preferences': '📊 核心指标收集中 - 重点了解决策逻辑和主要偏好',
      'secondary_preferences': '🔍 次要指标收集中 - 深入了解细节偏好',
      'generating': '🎯 生成推荐中 - 基于收集的信息生成志愿推荐',
      'refining': '✨ 精炼志愿中 - 根据用户反馈调整推荐',
      'completed': '✅ 完成阶段 - 志愿表已确定'
    };

    return stages[stage] || '进行中';
  }

  private formatCollectedPreferences(preferences: AgentPreference[]): string {
    if (preferences.length === 0) {
      return '暂无';
    }

    const grouped: Record<string, AgentPreference[]> = {};

    for (const pref of preferences) {
      if (!grouped[pref.category]) {
        grouped[pref.category] = [];
      }
      grouped[pref.category].push(pref);
    }

    let result = '';
    for (const [category, prefs] of Object.entries(grouped)) {
      result += `\n【${category}】\n`;
      for (const pref of prefs) {
        result += `- ${pref.indicatorName}: ${this.formatValue(pref.value)} (置信度: ${pref.confidence})\n`;
      }
    }

    return result;
  }

  private formatValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private describeValueType(indicator: IndicatorDefinition): string {
    const valueType = indicator.valueType.toString();

    if (valueType === 'ENUM' || valueType === 'enum') {
      return `枚举值: ${indicator.possibleValues?.join(', ')}`;
    } else if (valueType === 'STRING_ARRAY' || valueType === 'string_array') {
      return `字符串数组: ${indicator.possibleValues?.join(', ') || '任意'}`;
    } else if (valueType === 'NUMBER_RANGE' || valueType === 'number_range') {
      return `数字范围: ${indicator.valueRange?.min ?? '?'} - ${indicator.valueRange?.max ?? '?'}`;
    } else if (valueType === 'SCORE' || valueType === 'score') {
      return `评分: 1-5分`;
    } else if (valueType === 'PERCENTAGE' || valueType === 'percentage') {
      return `百分比: 0-100`;
    } else if (valueType === 'WEIGHT_DISTRIBUTION' || valueType === 'weight_distribution') {
      return `权重分配: 总和为100%`;
    } else if (valueType === 'BOOLEAN' || valueType === 'boolean') {
      return `布尔值: true/false`;
    } else {
      return indicator.valueType.toString();
    }
  }

  /**
   * 生成首次问候语
   */
  generateGreeting(context: ConversationContext): string {
    return `你好!我是你的志愿填报智能助手"小志" 🎓

恭喜你完成高考!我看到你的信息:
• 省份: ${context.province}
• 高考分数: ${context.examScore}分
• 科目类型: ${context.subjectType}

我会通过和你聊天,深入了解你的想法和偏好,然后帮你找到最适合的大学和专业。不用紧张,就像朋友聊天一样!

首先想了解一下,你对未来有什么样的规划呢?比如:
• 想去什么样的城市上大学?
• 有没有特别想学的专业?
• 将来想从事什么样的工作?

随便聊聊就好,想到什么说什么~ 😊`;
  }

  /**
   * 生成阶段过渡提示
   */
  generateStageTransition(fromStage: string, toStage: string, context: ConversationContext): string {
    if (fromStage === 'core_preferences' && toStage === 'generating') {
      return `太棒了!我们已经完成了核心偏好的收集 🎉
(核心指标: ${context.collectedCoreCount}/30 ✓)

现在我可以:
1️⃣ 继续深入聊聊(了解更多细节,推荐会更精准,大约再聊10-15分钟)
2️⃣ 直接生成志愿表(基于现有信息,我会给你推荐大约60个志愿供选择)

你想选哪个呢?`;
    }

    return '';
  }
}
