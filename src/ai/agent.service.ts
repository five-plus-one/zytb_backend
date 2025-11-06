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
import { RecommendationCardFormatter } from './utils/recommendationCardFormatter';
import { RecommendationCardService } from '../services/recommendationCard.service';
import { entityExtractionService } from '../services/entityExtraction.service';

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
    extractedData?: any;
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

# ⚠️ 对话初始化流程（必须遵守！）

## 第一步：提取并保存用户基本信息
**在对话开始时，如果用户消息中包含以下任何信息，你必须立即调用 set_user_profile 工具保存这些信息：**
- 年份（如：2025年）
- 省份（如：江苏）
- 科类（如：物理类、历史类）
- 高考分数（如：638分、600分）
- 省内位次（如：位次1200、排名5000）

**⭐ 这一步至关重要！** 后续的推荐工具会自动从已保存的信息中读取，无需重复传递。

### 示例场景
- 用户说："我是2025年江苏物理类考生，高考分数638分"
  → 你应该立即调用 set_user_profile(year=2025, province="江苏", subjectType="物理类", score=638)

- 用户说："我是江苏考生，物理类，分数620，位次3500"
  → 你应该立即调用 set_user_profile(province="江苏", subjectType="物理类", score=620, rank=3500)

- 用户说："我的分数是650分"
  → 你应该立即调用 set_user_profile(score=650)

### 识别位次的关键词
- "位次XXX"、"排名XXX"、"名次XXX"
- "我的位次是XXX"、"我排名XXX"
- 任何类似表达都应该提取为 rank 参数

### 位次缺失时的处理
如果用户只提供了分数，没有提供位次：
1. 先调用 set_user_profile 保存已有信息（分数、省份、科类）
2. 然后调用 score_to_rank 工具查询对应的位次
3. 获得位次后，再次调用 set_user_profile 补充位次信息
4. 最后才能调用推荐工具

**⚠️ 重要：没有位次信息就无法进行智能推荐！必须先获取位次！**

## 第二步：收集用户偏好（可选）
在保存基本信息后，你可以询问用户：
- 专业偏好（如：计算机、医学）
- 地区偏好（如：江苏省内、上海、北京）
- 院校类型偏好（如：985、211）

## 第三步：调用推荐工具
确保用户基本信息完整（特别是位次）后，才能调用 get_recommendation_ids 工具进行推荐。

---

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

### ⭐ get_recommendation_ids 工具（推荐使用）
**这是新版推荐工具，推荐优先使用！**

核心能力：
- 一次调用返回完整的推荐ID列表（冲12 + 稳20 + 保8）
- 只返回专业组ID和摘要信息，不返回详细数据
- 系统会自动获取卡片数据并推送给前端
- **大幅降低Token消耗**（从20k降至500 tokens）

✅ 正确使用方式：
1. 调用 get_recommendation_ids 工具
2. 系统返回：
   - recommendationIds: ID列表（冲稳保分类）
   - summary: 统计摘要（总数、分布等）
   - collegeNames: 院校名称列表（供AI参考）
3. **向用户说明推荐结果的总体情况**
   - 基于 summary 说明推荐数量和分布
   - 可以提及一些代表性院校（从 collegeNames 中）
   - 告诉用户详细卡片正在加载中
4. 卡片数据会自动加载并推送给前端

❌ 不要做：
- 不要尝试描述每个推荐的详细信息（数据未返回）
- 不要输出推荐卡片的JSON格式
- 不要等待卡片数据加载完成再回复

✅ 示例对话：
- 用户: "我想学计算机专业"
- AI: 调用 get_recommendation_ids
- 系统: 返回 recommendationIds、summary、collegeNames
- AI: "我为您找到了40个推荐，包括12个冲一冲、20个稳一稳、8个保一保。推荐主要包括南京大学、东南大学、南京航空航天大学等院校。详细的推荐卡片正在为您加载，请稍候..."
- 系统: 自动加载并推送卡片数据
- 前端: 渲染交互式卡片

### ⚠️ 重要：如何转换用户的模糊专业表述

用户通常不会说精确的专业名称，你需要智能转换。get_recommendation_ids工具的preferences参数支持两种方式：

**1. majors（具体专业名）：** 用于精确的专业名称
**2. majorCategories（专业大类）：** 用于模糊的学科方向，更容易匹配

✅ **转换规则（极其重要！）：**

**文科/理科大类 → 使用 majorCategories：**
- 用户说："我想学文科" 或 "文科专业"
  → majorCategories: ['中国语言文学类', '历史学类', '哲学类', '新闻传播学类']
- 用户说："理科专业"
  → majorCategories: ['数学类', '物理学类', '化学类', '生物科学类']

**模糊的学科方向 → majorCategories：**
- "计算机" / "计算机相关" / "编程"
  → majorCategories: ['计算机类']
- "经济" / "金融" / "商科"
  → majorCategories: ['经济学类', '金融学类', '工商管理类']
- "医学" / "当医生"
  → majorCategories: ['临床医学类', '基础医学类', '药学类']
- "工科" / "工程"
  → majorCategories: ['机械类', '电气类', '自动化类', '土木类']

**具体但小众的专业 → majors：**
- "考古" / "考古学"
  → majors: ['考古学', '文物与博物馆学']
- "文物保护"
  → majors: ['文物保护技术', '文物与博物馆学', '考古学']
- "人工智能" / "AI"
  → majors: ['人工智能', '智能科学与技术', '数据科学与大数据技术']
  或 majorCategories: ['计算机类']

**常见专业大类清单（参考）：**
计算机类、电子信息类、自动化类、机械类、电气类、材料类、土木类、临床医学类、基础医学类、药学类、护理学类、经济学类、金融学类、工商管理类、管理科学与工程类、中国语言文学类、外国语言文学类、新闻传播学类、历史学类、哲学类、法学类、社会学类、数学类、物理学类、化学类、生物科学类、教育学类、心理学类

❌ **严重错误示例（会导致空结果）：**
- 用户说："我想学文科"
  → ❌ majors: ['文科']  // 数据库里没有叫"文科"的专业！
- 用户说："计算机相关"
  → ❌ majors: ['计算机相关']  // 无结果！
  → ✅ majorCategories: ['计算机类']  // 正确！

**优先规则：当不确定时，优先使用 majorCategories**
- majorCategories 范围更广，更容易匹配到结果
- 如果结果太多，再让用户细化
- 空结果比大量结果更让用户失望

### smart_recommendation 工具（旧版，向后兼容）
这是旧版工具，仍然可用但不推荐使用。

核心能力：一次调用返回完整的冲稳保推荐，包含：
- 40个精选专业组（冲12 + 稳20 + 保8）
- 每个专业组的录取概率和冲稳保分类
- 完整历年录取数据（近3-5年的最低分、平均分、最高分、位次、招生计划）
- 调剂风险评估和推荐理由

⚠️ 缺点：
- Token消耗大（约20,000 tokens）
- 响应速度慢
- 依赖LLM输出大量数据

使用方式：
- 系统会自动将结果转换为推荐卡片格式
- AI需要将 formattedCards 的内容输出给用户

### 工具选择建议：
**推荐场景**：优先使用 get_recommendation_ids
- 用户要求推荐院校/专业
- 需要快速响应
- Token预算有限

**旧工具场景**：仅在必要时使用 smart_recommendation
- 向后兼容旧代码
- 特殊场景需要

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
    → 直接输出 formattedCards 内容
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
5. 用户要对比多个专业组 → 使用 compare_groups

## 专业组查询与对比工具

### query_group_info 工具
用途：查询单个专业组的详细信息（包含专业、招生人数、往年录取分数）

使用场景：
- "南京大学01专业组有哪些专业？"
- "这个专业组往年录取分多少？"

必需参数：
- year, sourceProvince, subjectType（从用户上下文中读取）
- groupCode（专业组代码，如"01"、"04"）
- collegeName 或 collegeCode（院校名称或代码，二选一）

### compare_groups 工具
用途：对比多个专业组的信息

使用场景：
- "对比一下南京大学和东南大学的计算机专业组"
- "帮我比较河海大学04专业组和上海交通大学01专业组"

必需参数：
- year, sourceProvince, subjectType（从用户上下文中读取）
- groups：数组，每个元素包含：
  - collegeName（院校名称）或 collegeCode（院校代码）
  - groupCode（专业组代码）

✅ 正确用法示例：
用户："比较河海大学04专业组和上海交通大学01专业组"
AI调用：
\`\`\`
compare_groups({
  year: 2025,  // 从用户上下文读取
  sourceProvince: "江苏",  // 从用户上下文读取
  subjectType: "物理类",  // 从用户上下文读取
  groups: [
    {collegeName: "河海大学", groupCode: "04"},
    {collegeName: "上海交通大学", groupCode: "01"}
  ]
})
\`\`\`

❌ 常见错误：
- 缺少 year/sourceProvince/subjectType 参数
- groups 中只有 groupCode 没有 collegeName/collegeCode
- 将院校名称和专业组代码混在一起（如"河海大学04"作为单个字符串）

⚠️ 重要提示：
- compare_groups 需要从用户上下文（ConversationContextManager）中读取年份、省份、科类信息
- 如果用户上下文缺少这些信息，应提示用户先提供基本信息
- 专业组代码通常是2位数字（如"01"、"04"），注意提取时保留前导零
- 一次最多对比5个专业组

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

              // 如果是智能推荐工具且执行成功，将结果转换为推荐卡片格式
              let contentToAdd = JSON.stringify(result);
              if (toolName === 'smart_recommendation' && result.success && result.data) {
                try {
                  console.log('🎨 检测到智能推荐结果，转换为推荐卡片格式...');
                  const formattedResult = this.formatRecommendationCards(result.data);
                  contentToAdd = JSON.stringify({
                    ...result,
                    formattedCards: formattedResult,
                    hint: '请将 formattedCards 的内容直接输出给用户，不要重复描述数据'
                  });
                } catch (formatError: any) {
                  console.error('❌ 推荐卡片格式化失败:', formatError.message);
                  // 格式化失败，使用原始JSON
                }
              }

              // 将工具结果添加到消息历史
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: contentToAdd
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
    let pendingCardData: any = null; // 在整个流程中存储待获取的卡片数据

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
          // 如果有待获取的卡片数据，先获取并推送
          if (pendingCardData) {
            try {
              console.log('📦 开始获取推荐卡片数据...');
              yield '\n\n📦 正在加载推荐详情...\n\n';

              const cardService = new RecommendationCardService();
              const cards = await cardService.getCardsByIds(
                pendingCardData.groupIds,
                pendingCardData.userProfile
              );

              console.log(`✅ 成功获取 ${cards.length} 个卡片数据`);

              // 按分类整理卡片
              const categorizedCards = {
                rush: cards.filter(c => pendingCardData.categories.rush.includes(c.groupId)),
                stable: cards.filter(c => pendingCardData.categories.stable.includes(c.groupId)),
                safe: cards.filter(c => pendingCardData.categories.safe.includes(c.groupId))
              };

              // 推送卡片数据事件
              yield JSON.stringify({
                type: 'recommendation_cards',
                data: categorizedCards,
                summary: pendingCardData.summary
              }) + '\n\n';

              console.log('✅ 卡片数据已推送给前端');
            } catch (cardError: any) {
              console.error('❌ 获取卡片数据失败:', cardError);
              yield `\n\n⚠️ 卡片数据加载失败: ${cardError.message}\n\n`;
            }
          }

          // 提取实体并标记
          let markedContent = fullContent;
          let entities: any[] = [];
          try {
            const { text, entities: extractedEntities } = await entityExtractionService.markupEntities(fullContent);
            markedContent = text;
            entities = extractedEntities;

            if (entities.length > 0) {
              console.log(`✅ 提取到 ${entities.length} 个实体: `, entities.map(e => `${e.type}:${e.text}`).join(', '));
            }
          } catch (entityError: any) {
            console.error('❌ 实体提取失败:', entityError);
            // 实体提取失败不影响主流程,继续使用原始内容
          }

          // 返回最终响应
          yield {
            success: true,
            message: markedContent, // 使用标记后的内容
            conversationHistory: [
              ...messages,
              { role: 'assistant', content: markedContent }
            ],
            metadata: {
              iterationsCount: iterationCount,
              extractedData: pendingCardData, // 推荐卡片数据
              entities: entities // 提取的实体信息
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

            // 检测新的轻量级推荐工具（只返回ID列表）
            if (toolName === 'get_recommendation_ids' && result.success && result.data?.recommendationIds) {
              console.log('🎯 检测到推荐ID列表，标记需要获取卡片数据');

              // 存储卡片数据获取信息（外层作用域）
              pendingCardData = {
                groupIds: [
                  ...result.data.recommendationIds.rush,
                  ...result.data.recommendationIds.stable,
                  ...result.data.recommendationIds.safe
                ],
                userProfile: result.data.userProfile,
                categories: {
                  rush: result.data.recommendationIds.rush,
                  stable: result.data.recommendationIds.stable,
                  safe: result.data.recommendationIds.safe
                },
                summary: result.data.summary
              };

              // 将工具结果添加到消息历史（提示AI卡片数据将单独推送）
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({
                  ...result,
                  hint: '推荐ID已生成，详细卡片数据将自动推送给前端。请向用户说明推荐结果的总体情况（基于summary和collegeNames），不要尝试描述每个推荐的详细信息。'
                })
              } as any);

              yield `✓ ${toolName} 执行完成\n`;
              continue;
            }

            // 如果是旧的智能推荐工具且执行成功，将结果转换为推荐卡片格式（向后兼容）
            let contentToAdd = JSON.stringify(result);
            if (toolName === 'smart_recommendation' && result.success && result.data) {
              try {
                console.log('🎨 检测到智能推荐结果（旧版），转换为推荐卡片格式...');
                const formattedResult = this.formatRecommendationCards(result.data);
                contentToAdd = JSON.stringify({
                  ...result,
                  formattedCards: formattedResult,
                  hint: '请将 formattedCards 的内容直接输出给用户，不要重复描述数据'
                });
              } catch (formatError: any) {
                console.error('❌ 推荐卡片格式化失败:', formatError.message);
                // 格式化失败，使用原始JSON
              }
            }

            // 将工具结果添加到消息历史
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: contentToAdd
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
   * 格式化智能推荐结果为推荐卡片格式
   */
  private formatRecommendationCards(data: any): string {
    if (!data.rush && !data.stable && !data.safe) {
      return ''; // 不是推荐结果，跳过
    }

    return RecommendationCardFormatter.formatFullRecommendation({
      rush: data.rush || [],
      stable: data.stable || [],
      safe: data.safe || [],
      summary: data.summary
    });
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
