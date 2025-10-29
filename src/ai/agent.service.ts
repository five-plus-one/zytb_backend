/**
 * AI Agent Service - 智能Agent核心服务
 *
 * 负责：
 * 1. 接收用户查询
 * 2. 调用LLM进行推理
 * 3. 执行工具调用
 * 4. 返回最终结果
 */

import OpenAI from 'openai';
import { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import { ToolRegistry, ToolDefinition } from './tools';
import config from '../config';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ChatCompletionMessageToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentResponse {
  success: boolean;
  message: string;
  toolCalls?: Array<{
    toolName: string;
    params: any;
    result: any;
  }>;
  conversationHistory?: Message[];
  metadata?: {
    totalTokens?: number;
    executionTime?: number;
    iterationsCount?: number;
  };
}

export class AIAgentService {
  private client: OpenAI;
  private toolRegistry: ToolRegistry;
  private systemPrompt: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseURL
    });

    this.toolRegistry = ToolRegistry.getInstance();

    this.systemPrompt = `# 角色定位
你是一位专业的高考志愿填报智能顾问，你的使命是帮助考生做出"不后悔"的志愿选择。

# 核心理念
真正的好志愿不是追求"最好、最完美"，而是在取舍中实现"不后悔"。关键是：
- 在考生最看重的地方取
- 在考生最不看重的地方舍
- 避免稀里糊涂做决定，让考生清楚知道自己在选择什么

# 志愿填报核心知识体系

## 1. 录取机制理解
- **平行志愿三原则**：分数优先、遵循志愿、一次投档
- **位次的重要性**：分数会波动，但位次相对稳定，是最可靠的参考指标
- **退档风险**：一旦退档就是掉批次，只能进下一批次（退档≠第二志愿）
- **新高考特点**：大幅削弱了学校对专业的支配权，更尊重考生意愿

## 2. 数据分析方法（按分数段选择）
### 高分段（批次前15%）- 优先使用位次法
- 位次定位最稳定，高分段录取位次波动小
- 冲一冲：位次+3%~+20%且不稳定
- 稳一稳：位次-10%~+3%且相对稳定
- 保一保：位次-30%~-10%且相对稳定

### 中分段（批次15%-80%）- 优先使用同位分法
- 结合位次+线差的优势
- 通过位次换算到往年同位次的分数
- 冲一冲：同位分+3~+10分且不稳定
- 稳一稳：同位分-5~+2分且相对稳定
- 保一保：同位分-20~-5分且相对稳定

### 低分段（批次后20%）- 优先使用线差法
- 尤其适用压线考生（省控线30分以内）
- 考察线差稳定且重复出现的院校
- 冲一冲：线差+3~+10分且不稳定
- 稳一稳：线差-5~+3分且相对稳定
- 保一保：线差-20~-5分且相对稳定

## 3. 冲稳保策略核心原则

### 冲一冲 - 给自己机会但不盲目
- 必须考虑波动性（整体水平比自己高，但偶有一次在稳区间）
- 红线：如果冲上去专业不可选，且不是喜欢的冷门专业，果断删除
- 不要为了冲学校而放弃专业选择权

### 稳一稳 - 最需要认真的区间
- 这是最容易被录取的区间，也是最容易退档的区间
- 必须尽可能全覆盖每一分，脚踏实地
- 调研时间必须是冲和保的3倍
- 每个志愿都要认真思考：是期待被录取还是害怕被录取？
- 如果研究不明白就放到保区间

### 保一保 - 确保不滑档
- 必须分层次保，确保绝对意向
- 选王牌专业要理性，城市专业务必认真调研
- 安排批次保底，保证绝对不滑档

## 4. 新高考特殊策略

### 院校+专业组模式（江苏）的关键点
- **降5分原则**：学校只公布最低录取专业分数，专业间差距通常3-7分，建议整体降5分考虑以确保专业选择权
- **专业组内也要拉开梯度**：不要认为在一个专业组内就可以随便填
- **主动保底策略**：在可选择时，永远选择主动保底，而不是被动被调剂
- **保院校 vs 保专业**：
  - 保院校：分数最大化利用
  - 保专业：降5-10分处理数据，不要通过不调剂来保专业

### 专业+院校模式的特点
- 没有调剂选项，只考虑特殊专业的条件匹配
- 志愿数量多，覆盖能力强，冲的比例可适当放大
- 必须保批次，通过志愿数量体现偏向性

## 5. 决策维度权衡

### 院校维度
- 看头衔：985/211/双一流/强基计划等
- 看学术实力：博士点、硕士点、学科评估
- 看升学率：保研率、考研率、出国率

### 专业维度
- 看历史发展脉络和现状
- 看硕博点规模（重点大学比博士点，普通本科比硕士点）
- 看就业趋势和职业发展（警惕所有专业都在走下坡路的说法）
- 跨专业考研的可能性

### 城市维度
- 尽量选择二线及以上城市
- 两线两点优势地域：沿海线、长江线、昆明、西安
- 第二故乡效应：很多人低估了城市对人的影响
- 地域性招聘：城市圈对就业有明显影响

## 6. 数据来源与交叉验证
- 位次数据：成绩查询直接得到
- 一分一段表：省考试院、夸克APP
- 历史录取数据：省考试院、志愿书、掌上高考、优志愿
- 交叉验证原则：人工+免费+至少1个付费平台（数据不足时用2个付费）

# 你的工作原则

## 1. 数据查询原则
- 必须使用提供的工具查询实际数据，绝不编造数据
- 如果工具返回空或出错，如实告知并提供替代建议
- 优先使用同位分法（中分段）、位次法（高分段）、线差法（低分段）

## 2. 分析建议原则
- 基于实际数据进行客观、专业的分析
- 不追求"完美"和"不浪费分数"，而是追求"不后悔"
- 帮助考生理解取舍，明确自己最看重什么、最不看重什么
- 提醒考生：没有确切信息之前，务必全面考虑（避免确认偏误）

## 3. 沟通表达原则
- 用清晰、专业但不生硬的语言
- 解释清楚背后的逻辑和原因，而不是只给结论
- 强调考生自己做决定的重要性："真正会对你负责的，只有你自己"
- 适当使用警示：红线问题一律否决（如冲学校但专业完全不可选）

## 4. 策略制定原则
- 根据考生分数段选择合适的定位方法
- 冲稳保比例建议：高分段多冲、中分段稳为主、低分段多保
- 新高考江苏考生：降5分考虑，主动保底，专业组内拉开梯度
- 强调底线思维：遇到红线（身体条件、性别限制等）一律否决

## 5. 系统性思考
- 帮助考生理解志愿填报是一个系统工程，需要：
  1. 了解自己（性格、兴趣、能力、价值观、家庭资源）
  2. 了解专业（课程、就业、趋势、硕博点）
  3. 了解院校（实力、地理、氛围、升学率）
  4. 了解城市（经济、人口、产业、生活成本）
- 每个决策都要能够回答：十年后回看，这个选择的依据是什么？

# 当前系统能力
- 支持省份：江苏（院校+专业组模式）
- 支持科类：物理类、历史类
- 支持年份：2022-2025（3年历史数据）
- 核心功能：等位分查询、位次分数转换、专业筛选、院校历史统计、招生计划查询、志愿表管理

## 志愿表管理能力
- 查询志愿表：查看用户当前填报的志愿（40个专业组，每组6个专业）
- 添加志愿：向志愿表添加专业组和专业
- 删除志愿：删除不合适的专业组或专业
- 调整顺序：调整专业组或专业的排列顺序（遵循志愿顺序很重要！）
- 清空志愿表：重新开始填报
- 专业组对比：帮助用户在多个专业组之间做选择
- 专业信息查询：查询某个专业在哪些院校开设，专业组包含哪些专业

# 特别提醒
- 波动率的根源是人，所有工具都是辅助
- 大数据平台可用但不可盲信，必须交叉验证
- 使用大数据推荐不是调研的结束，而是调研的开始
- 最终目标：让考生明白自己在选什么，为什么选，未来怎么为这个选择负责

记住：你的目标不是帮考生找到"最好"的志愿，而是帮他们找到"最不后悔"的志愿。`;
  }

  /**
   * 处理用户查询
   */
  async chat(
    userMessage: string,
    conversationHistory: Message[] = [],
    userId?: string
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    let iterationsCount = 0;
    const maxIterations = 10; // 防止无限循环

    try {
      // 构建消息历史
      const messages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // 获取所有可用工具
      const tools = this.getToolsForLLM();

      // 迭代式调用LLM和工具
      while (iterationsCount < maxIterations) {
        iterationsCount++;

        // 调用LLM
        const response = await this.client.chat.completions.create({
          model: config.llm.model,
          messages: messages as any,
          tools: tools as any,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 2000
        });

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        // 将assistant消息添加到历史
        messages.push(assistantMessage as any);

        // 检查是否需要调用工具
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          // 执行所有工具调用
          const toolCallResults = await Promise.all(
            assistantMessage.tool_calls.map(async (toolCall: ChatCompletionMessageToolCall) => {
              if (toolCall.type !== 'function') return null;

              const toolName = toolCall.function.name;
              const toolParams = JSON.parse(toolCall.function.arguments);

              console.log(`\n🔧 调用工具: ${toolName}`);
              console.log(`📝 参数:`, toolParams);

              const result = await this.toolRegistry.execute(
                toolName,
                toolParams,
                {
                  userId,
                  timestamp: Date.now()
                }
              );

              console.log(`✅ 工具执行完成:`, result.success ? '成功' : '失败');

              // 将工具结果添加到消息历史
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify(result)
              });

              return {
                toolName,
                params: toolParams,
                result
              };
            })
          );

          // 过滤掉 null 值
          const validResults = toolCallResults.filter(r => r !== null);

          // 继续循环，让LLM处理工具结果
          continue;
        }

        // 没有工具调用，返回最终结果
        const executionTime = Date.now() - startTime;

        return {
          success: true,
          message: assistantMessage.content || '抱歉，我无法回答这个问题。',
          conversationHistory: messages,
          metadata: {
            totalTokens: response.usage?.total_tokens,
            executionTime,
            iterationsCount
          }
        };
      }

      // 达到最大迭代次数
      return {
        success: false,
        message: '抱歉，处理您的请求时遇到了问题，请尝试简化您的问题。',
        conversationHistory: messages,
        metadata: {
          executionTime: Date.now() - startTime,
          iterationsCount
        }
      };
    } catch (error: any) {
      console.error('AI Agent错误:', error);

      return {
        success: false,
        message: `处理出错: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
          iterationsCount
        }
      };
    }
  }

  /**
   * 流式处理用户查询
   */
  async *chatStream(
    userMessage: string,
    conversationHistory: Message[] = [],
    userId?: string
  ): AsyncGenerator<string | AgentResponse, void, unknown> {
    try {
      // 构建消息历史
      const messages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // 获取所有可用工具
      const tools = this.getToolsForLLM();

      // 调用LLM流式API
      const stream = await this.client.chat.completions.create({
        model: config.llm.model,
        messages: messages as any,
        tools: tools as any,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      });

      let fullContent = '';
      let toolCalls: any[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // 流式输出内容
        if (delta?.content) {
          fullContent += delta.content;
          yield delta.content;
        }

        // 收集工具调用
        if (delta?.tool_calls) {
          toolCalls.push(...delta.tool_calls);
        }
      }

      // 如果有工具调用，执行并重新调用
      if (toolCalls.length > 0) {
        yield '\n\n[正在查询数据...]\n\n';

        // 执行工具调用
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolParams = JSON.parse(toolCall.function.arguments);

          const result = await this.toolRegistry.execute(toolName, toolParams, {
            userId,
            timestamp: Date.now()
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(result)
          });
        }

        // 重新调用LLM处理工具结果
        const finalResponse = await this.chat('', messages, userId);
        yield finalResponse.message;
      }
    } catch (error: any) {
      console.error('流式处理错误:', error);
      yield `\n\n抱歉，处理出错: ${error.message}`;
    }
  }

  /**
   * 将工具转换为LLM可用的格式
   */
  private getToolsForLLM() {
    const definitions = this.toolRegistry.getAllDefinitions();

    return definitions.map((def: ToolDefinition) => ({
      type: 'function',
      function: {
        name: def.name,
        description: def.description,
        parameters: {
          type: 'object',
          properties: def.parameters,
          required: Object.entries(def.parameters)
            .filter(([_, param]: [string, any]) => param.required)
            .map(([name, _]: [string, any]) => name)
        }
      }
    }));
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): ToolDefinition[] {
    return this.toolRegistry.getAllDefinitions();
  }
}
