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
- **数据年份说明**：
  * 招生计划数据：2025年（使用filter_majors时year参数应设为2025）
  * 录取分数数据：2024年及之前3年
  * 位次数据：2025年
- 核心功能：等位分查询、位次分数转换、专业筛选、院校历史统计、招生计划查询、志愿表管理

## 智能推荐工具使用规范（重要！）

### smart_recommendation 工具说明
核心能力：一次调用返回完整的冲稳保推荐，包含：
- 40个精选专业组（冲12 + 稳20 + 保8）
- 每个专业组的录取概率和冲稳保分类
- 完整历年录取数据（近3-5年的最低分、平均分、最高分、位次、招生计划）
- 调剂风险评估和推荐理由

### 冲稳保分类标准（重要！必读！）
系统使用以下标准对推荐进行分类：

**冲一冲（录取概率 < 35%）**
- 含义：有概率但不大，如果能被录取会很高兴
- 适用：想冲刺更好院校的考生
- 风险：有较大可能落榜，需要有稳和保兜底

**稳一稳（录取概率 35-90%）**
- 含义：正常情况下应该落在这个区间，如果连稳区间都落不了说明志愿填报失败
- 适用：考生应该重点关注这个区间，这是最可能被录取的范围
- 占比：推荐中占比最大（约50%），是志愿填报的核心

**保一保（录取概率 90-99%）**
- 含义：保底覆盖，几乎确保录取
- 适用：防止滑档的最后防线
- 注意：不会推荐录取概率 > 99% 的院校（过于保守，浪费志愿位）

### 自动过滤规则
系统会自动过滤掉不合理的推荐：
- 分数低于历史平均20分以上：冲刺意义不大
- 分数高于历史平均15分以上：过于稳妥，浪费志愿位
- 录取概率极低（< 5%）且分数差距大（-15分）：风险极高
- 录取概率接近100%：过于保守，浪费志愿位

❌ 错误用法：
用户: "给我推荐计算机专业"
AI: 调用 smart_recommendation
    → 得到完整推荐列表（已包含历年数据）
    → 再次调用 query_college_stats 查询历史数据（冗余！错误！）

✅ 正确用法：
用户: "给我推荐计算机专业"
AI: 调用 smart_recommendation（一次即可）
    → 直接展示推荐结果和历年数据
    → 无需额外调用 query_college_stats

### query_college_stats 工具说明
用途：深度分析单个院校的历史趋势
使用场景：
- 用户明确要求查看某个院校的详细历史
- 需要查看更长时间跨度（如近10年数据）
- 需要单独分析某个院校的录取趋势

❌ 不要用于：
- 批量查询多个院校的历史数据（应该用 smart_recommendation）
- 在 smart_recommendation 之后重复查询（数据已包含在推荐结果中）

### 工具选择决策树
1. 用户要求推荐院校/专业 → 使用 smart_recommendation（一次性返回所有数据）
2. 用户要深入了解某个特定院校 → 使用 query_college_stats
3. 用户要查看某个院校的专业组结构 → 使用 query_enrollment_by_college
4. 用户要筛选特定条件的专业 → 使用 filter_majors

## 志愿表管理能力
- 查询志愿表：查看用户当前填报的志愿（40个专业组，每组6个专业）
- 添加志愿：向志愿表添加专业组和专业
- 删除志愿：删除不合适的专业组或专业
- 调整顺序：调整专业组或专业的排列顺序（遵循志愿顺序很重要！）
- 清空志愿表：重新开始填报
- 专业组对比：帮助用户在多个专业组之间做选择
- 专业信息查询：查询某个专业在哪些院校开设，专业组包含哪些专业

## 重要提示：省内院校筛选
- 当用户明确要求"省内"、"本省"院校时，必须在filter_majors工具中传递collegeProvince参数
- 例如：用户说"江苏省内的计算机专业"，则应传递 collegeProvince: "江苏"
- collegeProvince参数表示院校所在省份，不是生源地省份
- 分数范围建议：
  * 冲一冲（含985/211名校）：scoreRange设为50-80分，确保能查询到名校
  * 稳一稳：scoreRange设为30-40分
  * 保一保：scoreRange设为20-30分
  * 如果用户未明确要求，默认使用50分范围以获得更多结果
- **特别注意**：985/211名校的录取分数通常较高，如果用户要查询985/211院校，scoreRange必须设置得更大（至少50分以上）

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
    userId?: string,
    sessionId?: string
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    let iterationsCount = 0;
    const maxIterations = 10; // 防止无限循环

    // 模型回退列表 (经过测试验证，支持工具调用)
    const modelsToTry = [
      'Doubao-1.5-pro-256k',      // 豆包 (主模型，已验证)
      'doubao-1-5-pro-32k-250115', // 豆包备选 (已验证)
      'glm-4.5',                  // 智谱 AI (已验证)
      config.llm.model            // 配置的模型作为最后备选
    ];

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

        let response = null;
        let lastError = null;

        // 尝试不同的模型
        for (const model of modelsToTry) {
          try {
            if (iterationsCount === 1) {
              // 只在第一轮迭代时打印模型信息
              console.log(`🤖 尝试使用模型: ${model}`);
            }

            // 调用LLM
            response = await this.client.chat.completions.create({
              model: model,
              messages: messages as any,
              tools: tools as any,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 2000
            });

            if (iterationsCount === 1) {
              console.log(`✅ 模型 ${model} 调用成功`);
            }
            break; // 成功则跳出循环
          } catch (error: any) {
            console.error(`❌ 模型 ${model} 调用失败:`, error.message);
            lastError = error;

            // 如果是最后一个模型，则抛出错误
            if (model === modelsToTry[modelsToTry.length - 1]) {
              throw error;
            }
            // 否则继续尝试下一个模型
            continue;
          }
        }

        if (!response) {
          throw lastError || new Error('所有模型都无法调用');
        }

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
                  sessionId,
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
    userId?: string,
    sessionId?: string
  ): AsyncGenerator<string | AgentResponse, void, unknown> {
    const maxIterations = 10;
    let iterationCount = 0;

    // 模型回退列表 (经过测试验证，支持工具调用+流式输出)
    const modelsToTry = [
      'Doubao-1.5-pro-256k',      // 豆包 (主模型，已验证)
      'doubao-1-5-pro-32k-250115', // 豆包备选 (已验证)
      'glm-4.5',                  // 智谱 AI (已验证)
      config.llm.model            // 配置的模型作为最后备选
    ];

    try {
      // 构建消息历史
      const messages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // 获取所有可用工具
      const tools = this.getToolsForLLM();

      // 工具调用循环
      while (iterationCount < maxIterations) {
        iterationCount++;

        let stream = null;
        let lastError = null;

        // 尝试不同的模型
        for (const model of modelsToTry) {
          try {
            if (iterationCount === 1) {
              // 只在第一轮迭代时打印模型信息
              console.log(`🤖 尝试使用模型: ${model}`);
            }

            // 调用LLM流式API
            stream = await this.client.chat.completions.create({
              model: model,
              messages: messages as any,
              tools: tools as any,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 2000,
              stream: true
            });

            if (iterationCount === 1) {
              console.log(`✅ 模型 ${model} 调用成功`);
            }
            break; // 成功则跳出循环
          } catch (error: any) {
            console.error(`❌ 模型 ${model} 调用失败:`, error.message);
            lastError = error;

            // 如果是最后一个模型，则抛出错误
            if (model === modelsToTry[modelsToTry.length - 1]) {
              throw error;
            }
            // 否则继续尝试下一个模型
            yield `⚠️ 模型 ${model} 暂时不可用，正在尝试备用模型...\n`;
            continue;
          }
        }

        if (!stream) {
          throw lastError || new Error('所有模型都无法调用');
        }

        let fullContent = '';
        let toolCallsMap: { [index: number]: any } = {}; // 使用map来正确累积tool_calls
        let finishReason = '';

        // 处理流式响应
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          finishReason = chunk.choices[0]?.finish_reason || finishReason;

          // 流式输出内容
          if (delta?.content) {
            fullContent += delta.content;
            yield delta.content;
          }

          // 累积工具调用 (流式API中tool_calls是增量的)
          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index;

              if (!toolCallsMap[index]) {
                toolCallsMap[index] = {
                  id: toolCallDelta.id || '',
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || ''
                  }
                };
              } else {
                // 累积function name和arguments
                if (toolCallDelta.function?.name) {
                  toolCallsMap[index].function.name += toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  toolCallsMap[index].function.arguments += toolCallDelta.function.arguments;
                }
                if (toolCallDelta.id) {
                  toolCallsMap[index].id = toolCallDelta.id;
                }
              }
            }
          }
        }

        // 转换为数组
        const toolCalls = Object.values(toolCallsMap);

        // 如果没有工具调用,结束循环
        if (toolCalls.length === 0 || finishReason === 'stop') {
          // 返回最终响应
          yield {
            success: true,
            message: fullContent,
            conversationHistory: [
              ...messages,
              { role: 'assistant', content: fullContent }
            ],
            metadata: {
              iterationsCount: iterationCount
            }
          } as AgentResponse;
          return;
        }

        // 有工具调用,执行工具
        yield '\n\n🔍 正在查询数据...\n\n';

        // 将assistant消息添加到历史(包含tool_calls)
        messages.push({
          role: 'assistant',
          content: fullContent || null,
          tool_calls: toolCalls as any
        } as any);

        // 执行所有工具调用
        for (const toolCall of toolCalls) {
          try {
            const toolName = toolCall.function.name;
            const toolParams = JSON.parse(toolCall.function.arguments);

            console.log(`\n🔧 调用工具: ${toolName}`);
            console.log(`📝 参数:`, toolParams);

            const result = await this.toolRegistry.execute(toolName, toolParams, {
              userId,
              sessionId,
              timestamp: Date.now()
            });

            console.log(`✅ 工具执行完成:`, result.success ? '成功' : '失败');

            // 将工具结果添加到消息历史
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result)
            } as any);

            // 通知前端工具执行完成
            yield `✓ ${toolName} 执行完成\n`;
          } catch (error: any) {
            console.error(`❌ 工具执行失败: ${toolCall.function.name}`, error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ success: false, error: error.message })
            } as any);
          }
        }

        yield '\n📊 正在分析结果...\n\n';

        // 继续下一轮循环,让LLM基于工具结果生成回复
      }

      // 达到最大迭代次数
      yield '\n\n⚠️ 已达到最大处理轮次,对话结束。\n';

      yield {
        success: false,
        message: '处理超时',
        conversationHistory: messages,
        metadata: {
          iterationsCount: iterationCount
        }
      } as AgentResponse;

    } catch (error: any) {
      console.error('流式处理错误:', error);
      yield `\n\n抱歉，处理出错: ${error.message}`;

      yield {
        success: false,
        message: `处理出错: ${error.message}`,
        conversationHistory: [],
        metadata: {}
      } as AgentResponse;
    }
  }

  /**
   * 将工具转换为LLM可用的格式
   */
  private getToolsForLLM() {
    const definitions = this.toolRegistry.getAllDefinitions();

    const tools = definitions.map((def: ToolDefinition) => {
      // 清理参数定义：移除内部的 required 字段，构建符合 OpenAI 格式的 properties
      const cleanProperties: Record<string, any> = {};
      for (const [key, param] of Object.entries(def.parameters)) {
        const { required, ...cleanParam } = param as any;
        cleanProperties[key] = cleanParam;
      }

      // 构建 required 数组
      const requiredParams = Object.entries(def.parameters)
        .filter(([_, param]: [string, any]) => param.required === true)
        .map(([name, _]: [string, any]) => name);

      return {
        type: 'function',
        function: {
          name: def.name,
          description: def.description,
          parameters: {
            type: 'object',
            properties: cleanProperties,
            required: requiredParams
          }
        }
      };
    });

    // 调试日志：打印工具定义
    console.log(`\n📋 传递给LLM的工具数量: ${tools.length}`);
    console.log(`📋 工具名称列表:`, tools.map(t => t.function.name));

    return tools;
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): ToolDefinition[] {
    return this.toolRegistry.getAllDefinitions();
  }
}
