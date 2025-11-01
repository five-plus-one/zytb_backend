# 核心语言大模型信息数据化流程说明

## 一、AI服务架构概览

本项目采用**多模型策略**，支持以下AI服务：

| AI服务 | 模型名称 | 说明 |
|--------|---------|------|
| **豆包(ByteDance)** | Doubao-1.5-pro-256k | 主模型 - 已验证支持工具调用 |
| **豆包备选** | doubao-1-5-pro-32k-250115 | 备用模型 |
| **智谱AI** | glm-4.5 | 已验证支持工具调用和流式输出 |
| **通用兼容** | deepseek-chat | 默认模型(配置项) |

**配置文件**: [src/config/index.ts](src/config/index.ts)

```typescript
llm: {
  apiKey: process.env.LLM_API_KEY || '',
  baseURL: process.env.LLM_BASE_URL || 'https://api.ai.five-plus-one.com/v1',
  model: process.env.LLM_MODEL || 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4000,
  maxIterations: 5
}
```

---

## 二、完整的数据处理流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         用户输入 → AI处理 → 结构化数据                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. 用户输入层
   ├── 用户通过对话提供信息(分数、位次、专业偏好等)
   └── 系统自动提取关键信息

2. LLM调用层
   ├── 构建System Prompt(含系统指令和用户档案)
   ├── 发送给AI处理(支持工具调用)
   └── 模型回退机制(失败时尝试备用模型)

3. 工具调用层
   ├── AI识别需要工具调用
   ├── 执行具体的Business Logic
   └── 返回结构化数据

4. 数据转换层
   ├── 将AI输出转换为标准格式
   ├── 验证数据有效性
   └── 存储到数据库

5. 返回结果层
   └── 格式化展示给用户
```

---

## 三、关键文件和模块

### A. 核心LLM通信层

**文件**: [src/utils/llm-client.ts](src/utils/llm-client.ts)

**功能**:
- OpenAI兼容API客户端
- 支持普通对话和流式对话
- 请求队列管理(并发控制: 3个/并发, 200ms间隔, 20个/分钟)
- 自动重试机制(3次重试)

**关键输入/输出**:
```typescript
// 输入
interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 输出
interface LLMCompletionResponse {
  id: string;
  choices: Array<{
    message: LLMMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

### B. LLM服务层

**文件**: [src/services/agent/llm.service.ts](src/services/agent/llm.service.ts)

**核心功能**:
1. **chat()** - 普通对话
2. **chatStream()** - 流式对话
3. **extractStructuredData()** - JSON结构化提取

**结构化数据提取机制**:
```typescript
async extractStructuredData<T = any>(
  messages: LLMMessage[],
  schema?: string
): Promise<T | null> {
  // 强制LLM返回JSON格式
  const systemPrompt = schema
    ? `You must respond with valid JSON that matches this schema: ${schema}`
    : 'You must respond with valid JSON only, no additional text.';

  // 使用低温度(0.3)降低随机性
  const response = await this.chat(enhancedMessages, {
    temperature: 0.3
  });

  // 尝试解析JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch[0] || response);
}
```

---

### C. AI Agent核心服务

**文件**: [src/ai/agent.service.ts](src/ai/agent.service.ts)

**核心功能**:
- 处理用户查询
- 调用LLM推理
- 执行工具调用
- 维护对话历史
- **模型回退策略**

**关键处理流程**:

```typescript
// 1. 模型尝试列表(按优先级)
const modelsToTry = [
  'Doubao-1.5-pro-256k',         // 主模型
  'doubao-1-5-pro-32k-250115',   // 备选1
  'glm-4.5',                      // 备选2
  config.llm.model                // 备选3
];

// 2. 调用LLM(支持工具调用)
const response = await this.client.chat.completions.create({
  model: model,
  messages: messages,
  tools: tools,                   // 传递工具定义
  tool_choice: 'auto',            // 自动选择
  temperature: 0.7,
  max_tokens: 2000
});

// 3. 检查工具调用
if (assistantMessage.tool_calls?.length > 0) {
  // 执行所有工具
  for (const toolCall of assistantMessage.tool_calls) {
    const toolName = toolCall.function.name;
    const toolParams = JSON.parse(toolCall.function.arguments);

    // 执行工具
    const result = await this.toolRegistry.execute(
      toolName,
      toolParams,
      { userId, sessionId, timestamp }
    );

    // 将结果添加到消息历史
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result)
    });
  }

  // 继续迭代,让LLM处理结果
  continue;
}

// 4. 返回最终结果
return {
  success: true,
  message: assistantMessage.content,
  conversationHistory: messages,
  metadata: { totalTokens, executionTime, iterationsCount }
};
```

**返回结构**:
```typescript
interface AgentResponse {
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
```

---

### D. 提示词工程服务

**文件**: [src/services/agent/prompt.service.ts](src/services/agent/prompt.service.ts)

**功能**: 动态构建系统提示词，包含：

1. **用户档案信息**
   ```typescript
   interface ConversationContext {
     sessionId: string;
     userId: string;
     province: string;
     examScore: number;
     subjectType: string;
     stage: string;  // init/core_preferences/secondary_preferences/generating
     collectedCoreCount: number;  // 已收集的核心指标数
     collectedPreferences: AgentPreference[];
   }
   ```

2. **LLM输出约束** - 强制JSON格式响应
   ```typescript
   {
     "message": "给学生的回复文本",
     "extractedPreferences": [
       {
         "indicatorId": "CORE_01",
         "indicatorName": "院校-专业-城市权重分配",
         "value": {"college": 40, "major": 40, "city": 20},
         "confidence": 0.8,
         "extractionMethod": "inference",
         "context": "提取说明"
       }
     ],
     "internalThoughts": "内部分析"
   }
   ```

3. **对话策略** - 教导AI如何自然地提取偏好信息

**关键方法**:
```typescript
// 解析LLM响应
parseLLMResponse(response: string): {
  message: string;
  extractedPreferences: any[];
  internalThoughts?: string;
} | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch (error) {
    // 解析失败时返回原始文本
    return {
      message: response,
      extractedPreferences: []
    };
  }
}
```

---

### E. 工具系统

**文件目录**: [src/ai/tools/](src/ai/tools/)

**工具列表**:
1. **smart_recommendation** - 智能推荐(冲稳保)
2. **filter_majors** - 专业筛选
3. **query_college_stats** - 院校统计
4. **score_to_rank** - 分数转位次
5. **add_college_to_volunteers_smart** - 添加志愿
6. **query_group_info** - 专业组信息
7. **majorInfo** - 专业详情
8. **scoreRanking** - 分数排名
9. **equivalentScore** - 等位分查询
10. **volunteerManagement** - 志愿管理
11. **volunteerBatch** - 批次管理
12. **enrollmentPlan** - 招生计划
13. **collegeMatch** - 院校匹配
14. **userProfile** - 用户档案

**工具基类**: [src/ai/tools/base.ts](src/ai/tools/base.ts)

```typescript
// 所有工具继承此基类
abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, ToolParameter>;

  abstract execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult>;

  protected validateParams(params: Record<string, any>): boolean {
    // 参数验证和类型检查
  }
}

// 工具执行结果标准格式
interface ToolExecutionResult {
  success: boolean;
  data?: any;           // 业务数据
  error?: string;       // 错误信息
  metadata?: {
    executionTime?: number;
    dataSource?: string;
    [key: string]: any;
  };
}
```

---

## 四、核心数据处理流程详解

### 案例: 用户请求"推荐计算机专业"

```
Step 1: 用户输入
├── 用户: "我想学计算机方向"
└── 系统提取: majors = ["计算机科学与技术", "软件工程"]

Step 2: AI处理
├── System Prompt 包含:
│   ├── 用户档案(省份、分数、位次)
│   ├── 已收集的偏好信息
│   └── 工具定义列表
├── LLM识别需要调用 smart_recommendation 工具
└── 构建工具参数:
    {
      "preferences": {
        "majors": ["计算机科学与技术"],
        "majorCategories": ["计算机类"]
      }
    }

Step 3: 工具执行 (smart_recommendation)
├── 数据库查询:
│   ├── EnrollmentPlan: 2025年招生计划
│   ├── AdmissionScore: 2024年及之前3年录取数据
│   └── ScoreRanking: 位次数据
├── 为每个专业组计算:
│   ├── 录取概率(数学模型)
│   ├── 冲稳保分类
│   ├── 推荐理由
│   └── 调剂风险评估
└── 按冲稳保分类和排序(12+20+8个)

Step 4: 返回结构化数据
{
  "rush": [
    {
      "collegeCode": "10284",
      "collegeName": "南京大学",
      "groupCode": "07",
      "majors": [...],
      "probability": 28,           // 录取概率
      "riskLevel": "冲",           // 冲稳保分类
      "scoreGap": -23,             // 分数差(-23分)
      "rankGap": 500,              // 位次差
      "confidence": 85,            // 置信度
      "recommendReasons": [
        "您的分数比近3年平均最低分低22.3分",
        "985工程院校",
        "录取概率偏低(28%),可以冲刺"
      ],
      "historicalScores": [
        {"year": 2024, "minScore": 661, "minRank": 2500},
        {"year": 2023, "minScore": 658, "minRank": 2600},
        {"year": 2022, "minScore": 655, "minRank": 2700}
      ]
    },
    ...
  ],
  "stable": [...20个],
  "safe": [...8个],
  "summary": {
    "totalCount": 40,
    "avgProbability": {
      "rush": 27,
      "stable": 58,
      "safe": 88
    }
  }
}

Step 5: AI格式化输出
├── 提取工具返回结果
├── 用自然语言呈现
├── 强调推荐理由
└── 询问用户反馈
```

---

## 五、数据转换和处理的关键环节

### 1. 用户偏好信息收集和存储

**文件**: [src/models/AgentPreference.ts](src/models/AgentPreference.ts)

```typescript
// 用户偏好指标存储结构
@Entity('agent_preferences')
export class AgentPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id' })
  sessionId!: string;  // 关联会话

  @Column({ name: 'user_id' })
  userId!: string;     // 关联用户

  @Column({ name: 'indicator_id' })
  indicatorId!: string;  // 如 CORE_01

  @Column({ type: 'json' })
  value!: any;  // 指标值(支持多种类型)

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence!: number;  // 置信度 0-1

  @Column({ name: 'extraction_method' })
  extractionMethod!: string;  // direct_question/inference/user_statement

  @Column({ name: 'extraction_context', type: 'text' })
  extractionContext?: string;  // 提取背景信息

  @Column({ type: 'int', default: 1 })
  version!: number;  // 版本控制(指标可更新)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

**100个偏好指标**包括:
- 30个核心指标(院校、专业、城市权重等)
- 70个次要指标(生活成本、学术氛围等)

---

### 2. 录取概率实时计算

**文件**: [src/services/admissionProbability.service.ts](src/services/admissionProbability.service.ts)

**核心算法** (12步骤):

```typescript
Step 1: 计算分数维度
├── 近3年平均最低分
├── 分数波动性(标准差)
└── 分数趋势

Step 2: 计算位次维度
├── 平均最低位次
└── 位次波动性

Step 3: 计划数变化
└── 扩招/缩招比例

Step 4: 基础概率(分段函数)
├── scoreGap >= 25  → 99%
├── scoreGap >= 20  → 98%
├── scoreGap >= 15  → 95%
├── scoreGap >= 10  → 88%
├── scoreGap >= 5   → 78%
├── scoreGap >= 0   → 65%
├── scoreGap >= -5  → 48%
├── scoreGap >= -10 → 32%
├── scoreGap >= -15 → 18%
├── scoreGap >= -20 → 8%
└── scoreGap < -20  → 3%

Step 5-8: 多维度调整
├── 位次差调整
├── 波动性调整
├── 计划数变化调整
└── 专业热度调整

Step 9: 综合计算
└── finalProbability = (基础 + 调整) × 波动系数

Step 10: 置信度计算
└── 数据量、波动性、一致性、计划变化

Step 11: 预过滤
├── 分数差 < -20 → 过滤(冲刺意义不大)
├── 分数差 > 15 → 过滤(过于稳妥)
└── 概率 > 99% → 过滤(浪费志愿位)

Step 12: 冲稳保分类
├── 冲: < 35% (录取概率较低)
├── 稳: 35-90% (核心推荐区间)
└── 保: 90-99% (保底覆盖)
```

**输出结构**:
```typescript
interface ProbabilityResult {
  probability: number;              // 0-100
  riskLevel: '冲' | '稳' | '保';
  adjustmentRisk: '高' | '中' | '低';
  scoreGap: number;
  rankGap: number | null;
  confidence: number;  // 0-100
  filtered?: boolean;
  filterReason?: string;
}
```

---

### 3. 智能推荐流程

**文件**: [src/services/smartRecommendation.service.ts](src/services/smartRecommendation.service.ts)

```typescript
async getSmartRecommendations(
  userProfile: {
    score: number;
    rank: number;
    province: string;
    category: string;
    year: number;
  },
  preferences: UserPreferences = {}
): Promise<SmartRecommendationResult> {

  // 第一步: 数据库查询(带历史数据)
  const groupsWithHistory = await this.queryGroupsWithHistory(
    userProfile,
    preferences
  );
  console.log(`查询到 ${groupsWithHistory.length} 个符合条件的专业组`);

  // 第二步: 为每个专业组计算录取概率
  const groupsWithProbability = groupsWithHistory.map(group => {
    const probResult = this.probabilityService.calculateForGroup(
      userProfile.score,
      userProfile.rank,
      group.historicalData,
      {
        scoreVolatility: group.scoreVolatility,
        popularityIndex: group.popularityIndex
      }
    );

    // 生成推荐理由
    const recommendReasons = this.probabilityService.generateRecommendReason(
      probResult,
      group.groupName || '',
      group.collegeName,
      { is985: group.is985, is211: group.is211 }
    );

    return {
      ...group,
      probability: probResult.probability,
      riskLevel: probResult.riskLevel,
      adjustmentRisk: probResult.adjustmentRisk,
      confidence: probResult.confidence,
      scoreGap: probResult.scoreGap,
      rankGap: probResult.rankGap,
      recommendReasons,
      filtered: probResult.filtered,
      filterReason: probResult.filterReason
    };
  });

  // 第三步: 按冲稳保分类
  const rush = validGroups.filter(g => g.riskLevel === '冲');
  const stable = validGroups.filter(g => g.riskLevel === '稳');
  const safe = validGroups.filter(g => g.riskLevel === '保');

  // 第四步: 每个类别内部排序(考虑院校层级、专业契合度等)
  const rankedRush = this.rankGroups(rush, 'rush', preferences).slice(0, 12);
  const rankedStable = this.rankGroups(stable, 'stable', preferences).slice(0, 20);
  const rankedSafe = this.rankGroups(safe, 'safe', preferences).slice(0, 8);

  // 第五步: 统计信息
  const summary = this.calculateSummary(rankedRush, rankedStable, rankedSafe);

  return {
    rush: rankedRush,
    stable: rankedStable,
    safe: rankedSafe,
    summary,
    userProfile,
    appliedPreferences: preferences
  };
}
```

---

### 4. 用户上下文管理

**文件**: [src/ai/userProfile.manager.ts](src/ai/userProfile.manager.ts)

```typescript
// 内存缓存用户档案,会话级别
interface UserProfile {
  userId: string;
  year?: number;
  province?: string;
  subjectType?: string;
  score?: number;
  rank?: number;
  preferredProvinces?: string[];
  preferredMajorCategories?: string[];
  updatedAt: Date;
}

// 自动清理过期profile(>1小时)
// 避免AI每次都要传递这些参数
```

---

## 六、AI输入、输出和数据转换全景

```
┌──────────────────────────────────────────────────────────────────────┐
│                      AI输入/输出数据流转                            │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌──────────────┐        ┌──────────────┐
│  用户输入   │────────>│  LLM处理     │───────>│  工具调用    │
│  (自然语言) │         │  (推理)      │        │  (执行)      │
└─────────────┘         └──────────────┘        └──────────────┘
      │                       │                        │
      │ "我想学计算机"        │ System Prompt:         │ 调用工具:
      │ "分数638"            │ - 用户档案              │ - smart_recommendation
      │ "想去北京"           │ - 工具定义              │ - 参数验证
      │                      │ - 对话历史              │ - 数据库查询
      │                      │                        │ - 计算概率
      │                      │ 模型回退:               │ - 生成理由
      │                      │ Doubao → GLM-4.5       │
      │                      │        → Deepseek     │
      │                      │                        │
      └──────────────────────┴────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  结构化输出     │
                    │  (JSON格式)     │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
      ┌─────▼────┐    ┌──────▼──────┐   ┌────▼─────┐
      │ 推荐结果  │    │ 用户偏好    │   │  会话    │
      │ (40个)    │    │ (100指标)   │   │  历史    │
      │           │    │             │   │          │
      │ 冲(12个)  │    │ 核心(30个)  │   │ Message  │
      │ 稳(20个)  │    │ 次要(70个)  │   │ History  │
      │ 保(8个)   │    │             │   │          │
      └─────┬────┘    └──────┬──────┘   └────┬─────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │  数据库存储     │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
      ┌─────▼────────┐  ┌────▼─────┐  ┌──────▼──────┐
      │ EnrollmentPlan│  │AgentMsg  │  │AgentPreference│
      │ AdmissionScore│  │          │  │  (100指标)    │
      │ ScoreRanking  │  │(对话历史)│  │               │
      └──────────────┘  └──────────┘  └───────────────┘
```

---

## 七、使用的AI关键特性

### 1. 工具调用(Function Calling)
- LLM可以识别何时需要调用工具
- 自动解析工具参数
- 支持多工具并行调用
- 循环迭代处理工具结果

### 2. 结构化数据提取
- 强制JSON格式输出
- JSON Schema验证
- 回退机制(解析失败时返回原文本)

### 3. 流式输出
- 实时推送文本流
- 适合长响应场景
- 提升用户体验

### 4. 多轮对话管理
- 维护完整对话历史
- 上下文记忆能力
- 自动截断长历史(保留最近10条)

### 5. 提示词工程
- 动态构建System Prompt
- 包含用户档案、已收集信息
- 指导AI的对话策略

---

## 八、主要文件位置总结

| 功能 | 文件路径 |
|-----|---------|
| **LLM客户端** | [src/utils/llm-client.ts](src/utils/llm-client.ts) |
| **LLM服务** | [src/services/agent/llm.service.ts](src/services/agent/llm.service.ts) |
| **AI Agent核心** | [src/ai/agent.service.ts](src/ai/agent.service.ts) |
| **工具基类** | [src/ai/tools/base.ts](src/ai/tools/base.ts) |
| **智能推荐工具** | [src/ai/tools/smartRecommendation.tool.ts](src/ai/tools/smartRecommendation.tool.ts) |
| **提示词工程** | [src/services/agent/prompt.service.ts](src/services/agent/prompt.service.ts) |
| **录取概率服务** | [src/services/admissionProbability.service.ts](src/services/admissionProbability.service.ts) |
| **推荐服务** | [src/services/smartRecommendation.service.ts](src/services/smartRecommendation.service.ts) |
| **用户档案管理** | [src/ai/userProfile.manager.ts](src/ai/userProfile.manager.ts) |
| **对话管理** | [src/ai/conversation.manager.ts](src/ai/conversation.manager.ts) |
| **上下文管理** | [src/ai/utils/conversationContext.manager.ts](src/ai/utils/conversationContext.manager.ts) |
| **偏好指标模型** | [src/models/AgentPreference.ts](src/models/AgentPreference.ts) |
| **推荐接口定义** | [src/interfaces/recommendation.interface.ts](src/interfaces/recommendation.interface.ts) |
| **系统指令** | [src/ai/prompts/SYSTEM_INSTRUCTIONS.md](src/ai/prompts/SYSTEM_INSTRUCTIONS.md) |

---

## 九、数据流向总结

```
用户提供信息(自然语言)
    ↓
AI理解+提取关键信息
    ↓
存储到AgentPreference表(100个指标)
    ↓
调用工具进行业务处理
    ↓
工具执行:
  - 查询EnrollmentPlan(招生计划)
  - 查询AdmissionScore(录取数据)
  - 查询ScoreRanking(位次数据)
    ↓
实时计算:
  - 录取概率(数学模型)
  - 冲稳保分类
  - 推荐理由
    ↓
返回结构化数据(40个专业组推荐)
    ↓
AI格式化呈现给用户
    ↓
存储会话历史到AgentMessage表
```

---

## 十、关键设计亮点

1. **多模型回退机制** - 确保服务可用性
2. **实时计算概率** - 而非预存,获得最精准结果
3. **100个指标体系** - 全面捕捉用户偏好
4. **工具系统** - 将复杂业务逻辑解耦
5. **严格的JSON输出** - 确保数据结构化
6. **会话级上下文** - 避免重复输入
7. **自动过滤机制** - 过滤不合理推荐
8. **完整的对话历史** - 支持多轮对话
9. **置信度计算** - 量化推荐可靠性
10. **推荐理由生成** - 提升用户理解度

---

## 附录：完整处理示例

### 场景：用户说"我考了638分，想学计算机，倾向于北京上海"

**第1轮对话**:
```json
// 用户输入
{
  "role": "user",
  "content": "我考了638分，想学计算机，倾向于北京上海"
}

// AI响应(JSON格式)
{
  "message": "您好！638分是个不错的成绩。我注意到您对计算机方向感兴趣，并且倾向于北京、上海这两个城市。计算机相关专业目前就业前景非常好。\n\n为了给您更精准的推荐，我想了解：\n1. 您更看重学校的综合排名，还是专业实力？\n2. 对于985/211院校有特别偏好吗？",

  "extractedPreferences": [
    {
      "indicatorId": "CORE_05",
      "indicatorName": "首选专业大类",
      "value": ["计算机类"],
      "confidence": 0.95,
      "extractionMethod": "direct_statement",
      "context": "用户明确表示想学计算机"
    },
    {
      "indicatorId": "CORE_06",
      "indicatorName": "具体专业偏好",
      "value": ["计算机科学与技术", "软件工程"],
      "confidence": 0.85,
      "extractionMethod": "inference",
      "context": "从计算机大类推断"
    },
    {
      "indicatorId": "CORE_03",
      "indicatorName": "目标城市偏好",
      "value": ["北京市", "上海市"],
      "confidence": 0.9,
      "extractionMethod": "direct_statement",
      "context": "用户明确倾向北京上海"
    }
  ],

  "internalThoughts": "用户提供了分数和明确偏好，但院校层级偏好未知。需要继续收集CORE_01(权重分配)和CORE_02(院校层级)等核心指标。"
}
```

**第2轮对话**:
```json
// 用户输入
{
  "role": "user",
  "content": "我比较看重专业，希望是985或211"
}

// AI响应
{
  "message": "明白了！您是专业优先型的同学，并且希望进入985或211院校。这个策略很务实。\n\n让我为您查询北京、上海的985/211院校中计算机相关专业的推荐方案...",

  "extractedPreferences": [
    {
      "indicatorId": "CORE_01",
      "indicatorName": "院校-专业-城市权重",
      "value": {"college": 30, "major": 50, "city": 20},
      "confidence": 0.8,
      "extractionMethod": "inference",
      "context": "用户表示比较看重专业"
    },
    {
      "indicatorId": "CORE_02",
      "indicatorName": "院校层级偏好",
      "value": ["985工程", "211工程"],
      "confidence": 0.95,
      "extractionMethod": "direct_statement",
      "context": "用户明确希望985或211"
    }
  ],

  "toolCalls": [
    {
      "toolName": "smart_recommendation",
      "params": {
        "preferences": {
          "majorCategories": ["计算机类"],
          "provinces": ["北京市", "上海市"],
          "schoolLevels": ["985工程", "211工程"]
        }
      }
    }
  ]
}

// 工具返回结果
{
  "success": true,
  "data": {
    "rush": [
      {
        "collegeCode": "10003",
        "collegeName": "清华大学",
        "groupCode": "01",
        "groupName": "计算机类",
        "majors": ["计算机科学与技术", "软件工程"],
        "probability": 15,
        "riskLevel": "冲",
        "scoreGap": -32,
        "confidence": 88,
        "recommendReasons": [
          "顶尖985院校，计算机专业全国第一",
          "您的分数比近3年平均最低分低32分",
          "录取概率较低(15%)，可冲刺"
        ]
      },
      // ... 11个冲刺选项
    ],
    "stable": [
      {
        "collegeCode": "10004",
        "collegeName": "北京交通大学",
        "groupCode": "03",
        "groupName": "计算机类",
        "majors": ["计算机科学与技术", "人工智能"],
        "probability": 68,
        "riskLevel": "稳",
        "scoreGap": 5,
        "confidence": 92,
        "recommendReasons": [
          "211工程院校，计算机专业实力强",
          "您的分数比近3年平均最低分高5分",
          "录取概率较高(68%)，推荐填报"
        ]
      },
      // ... 19个稳妥选项
    ],
    "safe": [
      // ... 8个保底选项
    ]
  }
}

// AI最终响应
{
  "message": "根据您的情况，我为您生成了40个推荐方案(12冲+20稳+8保)：\n\n【冲刺院校】\n1. 清华大学 - 计算机类 (录取概率15%)\n   推荐理由: 顶尖985，计算机全国第一...\n\n【稳妥院校】\n1. 北京交通大学 - 计算机类 (录取概率68%)\n   推荐理由: 211工程，专业实力强...\n\n...\n\n您觉得这些推荐如何？需要调整吗？"
}
```

---

**最终存储到数据库**:

1. **agent_preferences表** - 存储5个偏好指标
2. **agent_messages表** - 存储完整对话历史
3. **用户档案(内存缓存)** - 避免重复提问

---

这就是整个**信息收集 → AI处理 → 数据化 → 业务执行 → 格式化输出**的完整流程！
